"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension, type Editor, type JSONContent } from '@tiptap/core';
import { Plugin, type Transaction } from '@tiptap/pm/state';
import { TableKit } from '@tiptap/extension-table';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { EditorToolbar } from '@/components/workspace/editor/EditorToolbar';
import { EmptyDocumentComposer } from '@/components/workspace/editor/EmptyDocumentComposer';
import { imageFilesFromDataTransfer, insertDocumentImages } from '@/components/workspace/editor/document-images';
import { Pagination, PAGE_GAP, PAGE_HEIGHT, PAGE_PADDING, PAGE_WIDTH, pageCountFromEditor } from '@/components/workspace/editor/pagination';
import { SectionChips } from '@/components/workspace/editor/section-chips';
import { InputList } from '@/components/workspace/editor/input-list-node';
import {
  Columns,
  Contacts,
  Notice,
  Requirement,
  RiderCover,
  RiderDocumentMetaExtension,
  Tiers,
} from '@/components/workspace/editor/rider-blocks';
import { SlashCommandMenu } from '@/components/workspace/editor/SlashCommandMenu';
import '@/components/workspace/editor/document-theme.css';
import { defaultDocumentTheme } from '@/core/constants/document-themes';
import type { RiderDocumentTheme } from '@/core/types/rider.types';
import {
  findAllDocumentMatches,
  scrollMatchIntoView,
  SearchHits,
  setSearchHits,
  type SearchDirection,
  type SearchStats,
} from '@/components/workspace/editor/document-search';
import {
  applySuggestionToEditor,
  findSectionBounds,
  locateText,
  setEditorSuggestions,
  SuggestionHighlights,
} from '@/components/workspace/editor/suggestion-highlight';
import {
  DOCUMENT_COVER_ID,
  coverIndexFromId,
  documentStructureKey,
  isDocumentIntro,
  newSectionId,
  riderDocumentFromSections,
  splitDocumentToSections,
  type SectionDocumentPatch,
} from '@/core/editor/content-doc';
import { SectionItem, RiderType } from '@/core/types/rider.types';
import { DocumentSuggestion } from '@/core/types/suggestion.types';

export interface EditorBridge {
  apply: (suggestion: DocumentSuggestion) => boolean;
  focus: (suggestion: DocumentSuggestion) => void;
  find: (query: string, direction?: SearchDirection) => SearchStats;
  insertSectionTitle: (title: string) => string | null;
  scrollToSection: (sectionId: string) => void;
}

const SECTION_SCROLL_PADDING = 96;

export function scrollSectionIntoCanvas(sectionId: string) {
  const coverIndex = coverIndexFromId(sectionId);
  const heading = coverIndex >= 0
    ? document.querySelectorAll('[data-type="rider-cover"]')[coverIndex] || null
    : document.getElementById(sectionId);
  if (!heading) return;
  const scroller = heading.closest('[data-docs-scroller]') as HTMLElement | null;
  if (!scroller) {
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const box = scroller.getBoundingClientRect();
  const rect = heading.getBoundingClientRect();
  scroller.scrollTo({
    top: Math.max(0, scroller.scrollTop + rect.top - box.top - SECTION_SCROLL_PADDING),
    behavior: 'smooth',
  });
}

const RiderKeys = Extension.create({
  name: 'riderKeys',
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-8': () => this.editor.commands.toggleBulletList(),
      'Mod-Shift-7': () => this.editor.commands.toggleOrderedList(),
      'Mod-Alt-1': () => this.editor.commands.toggleHeading({ level: 1 }),
      'Mod-Alt-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-Alt-3': () => this.editor.commands.toggleHeading({ level: 3 }),
      'Mod-Alt-0': () => this.editor.commands.setParagraph(),
      'Mod-k': () => {
        const previous = this.editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('Enlace', previous || 'https://');
        if (url === null) return true;
        if (!url.trim()) return this.editor.commands.unsetLink();
        return this.editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
      },
    };
  },
});

const SectionHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('id'),
        renderHTML: (attributes) => (attributes.id ? { id: attributes.id } : {}),
      },
      pageBreakBefore: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-page-break') === 'before',
        renderHTML: (attributes) => (attributes.pageBreakBefore ? { 'data-page-break': 'before' } : {}),
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() || []),
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((transaction) => transaction.docChanged)) return null;
          let next: Transaction | null = null;
          const seen = new Set<string>();
          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'heading' || node.attrs.level !== 2) return;
            const currentId = typeof node.attrs.id === 'string' ? node.attrs.id : '';
            if (currentId && !seen.has(currentId)) {
              seen.add(currentId);
              return;
            }
            const id = newSectionId();
            seen.add(id);
            next = (next || newState.tr).setNodeMarkup(pos, undefined, {
              ...node.attrs,
              id,
              pageBreakBefore: false,
            });
          });
          return next;
        },
      }),
    ];
  },
});

interface RiderDocumentSurfaceProps {
  artistName: string;
  riderTitle: string;
  sections: SectionItem[];
  activeSectionId?: string;
  readOnly: boolean;
  suggestions: DocumentSuggestion[];
  onInsertSection?: () => void;
  onDocumentChange?: (patches: SectionDocumentPatch[]) => void;
  onActivateSection?: (id: string) => void;
  onSelectionChange?: (sectionId: string, text: string) => void;
  onRegisterBridge?: (bridge: EditorBridge) => void;
  onUploadDocumentImage?: (file: File) => Promise<string | null | undefined>;
  onImageError?: (message: string) => void;
  riderType?: RiderType;
  documentTheme?: RiderDocumentTheme;
  version?: string;
  onThemeChange?: (theme: RiderDocumentTheme) => void;
  isBlankDocument?: boolean;
  isAssistantThinking?: boolean;
  onAskAssistant?: (text: string, sectionId?: string) => void;
}

export function RiderDocumentSurface({
  artistName,
  riderTitle,
  sections,
  readOnly,
  suggestions,
  onInsertSection,
  onDocumentChange,
  onActivateSection,
  onSelectionChange,
  onRegisterBridge,
  onUploadDocumentImage,
  onImageError,
  riderType = 'tecnico',
  documentTheme,
  version = 'v1.0',
  onThemeChange,
  isBlankDocument = false,
  isAssistantThinking = false,
  onAskAssistant,
}: RiderDocumentSurfaceProps) {
  const theme = documentTheme || defaultDocumentTheme();
  const coverArtist = useMemo(() => {
    for (const section of sections) {
      const cover = (section.contentDoc?.content || []).find((node) => node.type === 'riderCover');
      const artist = typeof cover?.attrs?.artist === 'string' ? cover.attrs.artist.trim() : '';
      if (artist) return artist;
    }
    return '';
  }, [sections]);
  const footerLabel = [artistName.trim() || coverArtist, version.trim()].filter(Boolean).join(' · ');
  const sectionIds = useMemo(() => sections.map((section) => section.id).join('|'), [sections]);
  const documentSignature = `${artistName}\0${riderTitle}\0${sectionIds}`;
  const initialContent = useMemo(
    () => riderDocumentFromSections(sections, { artistName, title: riderTitle }) as JSONContent,
    // Only seed the editor once; later structure changes go through setContent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [pages, setPages] = useState(1);
  const [scale, setScale] = useState(1);
  const documentHeight = pages * PAGE_HEIGHT + Math.max(0, pages - 1) * PAGE_GAP;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const slashKeysRef = useRef<(event: KeyboardEvent) => boolean>(() => false);
  const sectionsRef = useRef(sections);
  const askRef = useRef(onAskAssistant);
  const riderTypeRef = useRef(riderType);
  askRef.current = onAskAssistant;
  riderTypeRef.current = riderType;
  const callbacksRef = useRef({
    onDocumentChange,
    onActivateSection,
    onSelectionChange,
    onUploadDocumentImage,
    onImageError,
  });
  sectionsRef.current = sections;
  callbacksRef.current = {
    onDocumentChange,
    onActivateSection,
    onSelectionChange,
    onUploadDocumentImage,
    onImageError,
  };

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        strike: false,
        link: { openOnClick: false, autolink: true },
      }),
      SectionHeading.configure({ levels: [1, 2, 3] }),
      TableKit.configure({
        table: { resizable: false, renderWrapper: true },
      }),
      InputList,
      RiderCover,
      Requirement,
      Notice,
      Tiers,
      Contacts,
      Columns,
      RiderDocumentMetaExtension,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'docs-image',
        },
      }),
      Placeholder.configure({
        showOnlyCurrent: false,
        placeholder: ({ node }) => {
          if (node.type.name === 'heading' && node.attrs.level === 2) return 'Título de sección';
          if (node.type.name === 'heading' && node.attrs.level === 3) return 'Subtítulo';
          return 'Escribe / para insertar un bloque…';
        },
      }),
      RiderKeys,
      SuggestionHighlights,
      SearchHits,
      Pagination,
      SectionChips.configure({
        riderType: () => riderTypeRef.current,
        enabled: () => !readOnly && Boolean(askRef.current),
        onAsk: (prompt, sectionId) => askRef.current?.(prompt, sectionId),
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'docs-editor',
        'aria-label': 'Documento del rider',
        style: `padding:${PAGE_PADDING}px;min-height:${PAGE_HEIGHT}px;font-family:var(--rider-body,Arial,Helvetica,sans-serif);font-size:11pt;line-height:var(--rider-leading,1.15);color:var(--rider-ink,#202124);outline:none;`,
      },
      handleKeyDown(_view, event) {
        return slashKeysRef.current(event);
      },
      handlePaste(_view, event) {
        const current = editorRef.current;
        if (!current || readOnly) return false;
        const files = imageFilesFromDataTransfer(event.clipboardData);
        if (!files.length) return false;
        void insertDocumentImages(
          current,
          files,
          callbacksRef.current.onUploadDocumentImage,
          callbacksRef.current.onImageError,
        );
        return true;
      },
      handleDrop(view, event, _slice, moved) {
        const current = editorRef.current;
        if (!current || readOnly || moved) return false;
        const files = imageFilesFromDataTransfer(event.dataTransfer);
        if (!files.length) return false;
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (coords) current.chain().focus().setTextSelection(coords.pos).run();
        void insertDocumentImages(
          current,
          files,
          callbacksRef.current.onUploadDocumentImage,
          callbacksRef.current.onImageError,
        );
        return true;
      },
    },
    onUpdate: ({ editor: current, transaction }) => {
      if (!transaction.docChanged || readOnly) return;
      const ids = sectionsRef.current.map((section) => section.id);
      callbacksRef.current.onDocumentChange?.(splitDocumentToSections(current.getJSON(), ids));
      setPages(pageCountFromEditor(current.view.dom));
    },
    onSelectionUpdate: ({ editor: current }) => {
      const { from, to } = current.state.selection;
      let sectionId = sectionsRef.current.find((section) => !isDocumentIntro(section.id))?.id || '';
      let covers = 0;
      current.state.doc.descendants((node, pos) => {
        if (node.type.name === 'riderCover' && pos <= from) {
          covers += 1;
          sectionId = covers === 1 ? DOCUMENT_COVER_ID : `${DOCUMENT_COVER_ID}-${covers}`;
        }
        if (node.type.name === 'heading' && node.attrs.id && pos <= from) {
          sectionId = node.attrs.id as string;
        }
      });
      if (sectionId) callbacksRef.current.onActivateSection?.(sectionId);
      callbacksRef.current.onSelectionChange?.(sectionId, from === to ? '' : current.state.doc.textBetween(from, to, '\n'));
    },
  }, [readOnly]);

  editorRef.current = editor;

  useEffect(() => {
    if (!editor || editor.isDestroyed || readOnly) return;
    const patches = splitDocumentToSections(editor.getJSON());
    const nextIds = patches.map((patch) => patch.id).join('|');
    const currentIds = sectionsRef.current.map((section) => section.id).join('|');
    if (nextIds !== currentIds) callbacksRef.current.onDocumentChange?.(patches);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const storage = editor.storage.riderDocumentMeta;
    if (!storage) return;
    storage.artistName = artistName;
    storage.riderTitle = riderTitle;
    storage.version = version;
    storage.riderType = riderType;
    storage.uploadImage = onUploadDocumentImage || null;
  }, [editor, artistName, riderTitle, version, riderType, onUploadDocumentImage]);

  const insertImages = useCallback((files: File[]) => {
    if (!editor || readOnly || files.length === 0) return;
    void insertDocumentImages(
      editor,
      files,
      callbacksRef.current.onUploadDocumentImage,
      callbacksRef.current.onImageError,
    );
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dom.dataset.chipsDisabled = isAssistantThinking ? 'true' : 'false';
  }, [editor, isAssistantThinking]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const nextDoc = riderDocumentFromSections(sections, { artistName, title: riderTitle });
    if (documentStructureKey(editor.getJSON()) === documentStructureKey(nextDoc)) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || editor.isDestroyed) return;
      editor.commands.setContent(nextDoc as JSONContent, { emitUpdate: false });
      setPages(pageCountFromEditor(editor.view.dom));
    });

    return () => {
      cancelled = true;
    };
  }, [editor, documentSignature, artistName, riderTitle, sections]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    setEditorSuggestions(editor, suggestions);
    editor.view.dispatch(editor.state.tr.setMeta('rider-suggestions', true));
  }, [editor, suggestions]);

  const searchCursor = useRef({ query: '', index: 0 });

  const findInDocument = useCallback((query: string, direction: SearchDirection = 'first'): SearchStats => {
    const empty = { current: 0, total: 0 };
    if (!editor || editor.isDestroyed) return empty;
    const needle = query.trim();
    if (!needle) {
      searchCursor.current = { query: '', index: 0 };
      setSearchHits(editor, [], 0);
      return empty;
    }
    const matches = findAllDocumentMatches(editor.state.doc, needle);
    if (matches.length === 0) {
      searchCursor.current = { query: needle, index: 0 };
      setSearchHits(editor, [], 0);
      return empty;
    }
    let index = 0;
    if (direction !== 'first' && searchCursor.current.query === needle) {
      index = direction === 'next'
        ? (searchCursor.current.index + 1) % matches.length
        : (searchCursor.current.index - 1 + matches.length) % matches.length;
    }
    searchCursor.current = { query: needle, index };
    setSearchHits(editor, matches, index);
    requestAnimationFrame(() => scrollMatchIntoView(scrollerRef.current, editor, matches[index].from));
    return { current: index + 1, total: matches.length };
  }, [editor]);

  const insertSectionTitle = useCallback((title: string) => {
    if (!editor || editor.isDestroyed || readOnly) return null;
    const trimmed = title.trim();
    if (!trimmed) return null;
    const { $from } = editor.state.selection;
    const pos = $from.depth > 0 ? $from.after(1) : editor.state.doc.content.size;
    const id = newSectionId();
    const inserted = editor.chain().focus().insertContentAt(pos, {
      type: 'heading',
      attrs: { level: 2, id, pageBreakBefore: false },
      content: [{ type: 'text', text: trimmed }],
    }).setTextSelection(pos + 1).scrollIntoView().run();
    return inserted ? id : null;
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    onRegisterBridge?.({
      apply: (suggestion) => applySuggestionToEditor(editor, suggestion),
      focus: (suggestion) => {
        const bounds = findSectionBounds(editor.state.doc, suggestion.sectionId);
        const range = suggestion.baseText
          ? locateText(editor.state.doc, suggestion.baseText, false, bounds)
          : bounds
            ? { from: bounds.from, to: bounds.from }
            : null;
        if (range) editor.chain().focus().setTextSelection(range).scrollIntoView().run();
        else editor.commands.focus('end');
        const heading = document.getElementById(suggestion.sectionId);
        heading?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
      find: findInDocument,
      insertSectionTitle,
      scrollToSection: scrollSectionIntoCanvas,
    });
  }, [editor, findInDocument, insertSectionTitle, onRegisterBridge]);

  useEffect(() => {
    if (!editor) return;
    const syncPages = () => setPages(pageCountFromEditor(editor.view.dom));
    syncPages();
    const observer = new MutationObserver(syncPages);
    observer.observe(editor.view.dom, { attributes: true, attributeFilter: ['data-pages'] });
    return () => observer.disconnect();
  }, [editor, sectionIds]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const update = () => {
      const gutter = root.clientWidth < 768 ? 24 : 48;
      const next = Math.min(1, (root.clientWidth - gutter) / PAGE_WIDTH);
      setScale(Number.isFinite(next) && next > 0.2 ? next : 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`docs-theme docs-theme-${theme} relative flex-1 h-full min-h-0 min-w-0 flex flex-col`}>
      <style>{`
        .docs-editor { box-sizing: border-box; background: transparent; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
        .docs-page-break { pointer-events: none; user-select: none; display: block; width: 100%; margin: 0; padding: 0; border: 0; overflow: hidden; box-sizing: content-box; }
        .docs-editor h1 { font-size: 26pt; font-weight: 700; line-height: 1.15; margin: 0 0 0.35em; scroll-margin-top: 96px; }
        .docs-editor h2 { font-size: 16pt; font-weight: 700; line-height: 1.2; margin: 1em 0 0.3em; scroll-margin-top: 96px; }
        .docs-editor h3 { font-size: 13pt; font-weight: 700; margin: 0.8em 0 0.25em; scroll-margin-top: 72px; }
        .docs-editor p { margin: 0 0 0.35em; }
        .docs-editor .is-empty::before { color: #9aa0a6; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
        .docs-editor ul { list-style: disc; padding-left: 1.5em; margin: 0.2em 0 0.5em; }
        .docs-editor ol { list-style: decimal; padding-left: 1.5em; margin: 0.2em 0 0.5em; }
        .docs-editor a { color: #1155cc; text-decoration: underline; }
        .docs-editor blockquote { border-left: 3px solid #c4b5fd; padding: 0.1em 0 0.1em 12px; margin: 0.45em 0 0.7em; color: #475569; }
        .docs-editor hr { border: 0; border-top: 1px solid #dadce0; margin: 1em 0; }
        .docs-editor .tableWrapper { margin: 0.45em 0 0.9em; overflow-x: auto; }
        .docs-editor table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .docs-editor th { background: #f8f9fa; font-weight: 700; text-align: left; }
        .docs-editor th, .docs-editor td { position: relative; border: 1px solid #dadce0; padding: 6px 8px; vertical-align: top; font-size: 10pt; }
        .docs-editor .selectedCell:after { position: absolute; inset: 0; background: rgba(124, 58, 237, 0.08); content: ''; pointer-events: none; }
        .docs-editor ul[data-type="taskList"] { list-style: none; padding-left: 0; }
        .docs-editor ul[data-type="taskList"] p { margin: 0; }
        .docs-editor li[data-type="taskItem"] { display: flex; align-items: flex-start; gap: 8px; }
        .docs-editor li[data-type="taskItem"] > label { margin-top: 0.2em; }
        .docs-input-list-node, .docs-input-list { margin: 0.4em 0 0.9em; }
        .docs-input-list-card { border: 1px solid #dadce0; border-radius: 10px; overflow: hidden; background: #fff; font-family: Arial, Helvetica, sans-serif; }
        .docs-input-list-head { display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: #f8f9fa; border-bottom: 1px solid #dadce0; }
        .docs-input-list-title { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #334155; }
        .docs-input-list-count { font-size: 9px; font-weight: 800; color: #6d28d9; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 999px; padding: 1px 7px; }
        .docs-input-list-actions { margin-left: auto; display: flex; align-items: center; gap: 6px; }
        .docs-input-list-add { position: relative; display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; font-size: 10px; font-weight: 700; color: #334155; cursor: pointer; }
        .docs-input-list-add select { position: absolute; inset: 0; opacity: 0; cursor: pointer; font-size: 12px; }
        .docs-input-list-scroll { overflow-x: auto; overflow-y: auto; max-height: 640px; -webkit-overflow-scrolling: touch; }
        .docs-input-list table { width: max-content; min-width: 100%; border-collapse: separate; border-spacing: 0; table-layout: auto; font-size: 9.5pt; }
        .docs-input-list th { text-align: left; font-size: 8px; letter-spacing: 0.04em; text-transform: uppercase; color: #94a3b8; font-weight: 800; padding: 6px 6px; border-bottom: 1px solid #e2e8f0; background: #fafafa; }
        .docs-input-list td { padding: 3px 4px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .docs-input-list .col-ch { position: sticky; left: 0; z-index: 2; width: 36px; min-width: 36px; text-align: center; font-weight: 800; color: #94a3b8; background: #fafafa; box-shadow: 6px 0 8px -6px rgba(15, 23, 42, 0.25); }
        .docs-input-list th.col-ch { z-index: 3; }
        .docs-input-list td.col-ch { background: #fff; }
        .docs-input-list .col-data { min-width: 132px; }
        .docs-input-list .col-48 { min-width: 64px; text-align: center; }
        .docs-input-list .col-actions { position: static; width: 32px; min-width: 32px; max-width: 32px; text-align: center; vertical-align: middle; background: #fff; }
        .docs-input-list th.col-actions { background: #fafafa; }
        .docs-input-list-colhead { display: flex; align-items: center; gap: 2px; min-width: 0; }
        .docs-input-list-colhead input { flex: 1; min-width: 0; border: 0; background: transparent; font: inherit; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #94a3b8; padding: 0 2px; outline: none; }
        .docs-input-list-colhead input:focus { color: #5b21b6; box-shadow: inset 0 -1px 0 #c4b5fd; }
        .docs-input-list td input, .docs-combo input { width: 100%; border: 0; background: transparent; font: inherit; color: #1e293b; outline: none; padding: 4px 6px; border-radius: 6px; }
        .docs-input-list td input:focus, .docs-combo input:focus { background: #fff; box-shadow: inset 0 0 0 1px #c4b5fd; }
        .docs-input-list-empty { text-align: center; color: #94a3b8; padding: 16px 8px !important; }
        .docs-input-list-48 { font-size: 8px; font-weight: 800; color: #cbd5e1; border: 0; background: transparent; cursor: pointer; padding: 3px 4px; border-radius: 4px; }
        .docs-input-list-48.is-on { color: #92400e; background: #fef3c7; }
        .docs-input-list-delete { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; margin: 0 auto; color: #94a3b8; background: none; border: 0; cursor: pointer; padding: 0; }
        .docs-input-list-delete:hover { color: #e11d48; }
        .docs-input-list.is-selected .docs-input-list-card { box-shadow: 0 0 0 2px #c4b5fd; }
        .docs-combo { position: relative; min-width: 0; }
        .docs-editor img, .docs-editor .docs-image { max-width: 100%; height: auto; max-height: 28rem; display: block; margin: 0.4em 0 0.7em; object-fit: contain; }
        .docs-editor .docs-search-hit { background: #fde68a; border-radius: 2px; }
        .docs-editor .docs-search-hit.is-current { background: #fbbf24; box-shadow: inset 0 0 0 1px #d97706; }
        .docs-input-list.docs-search-hit .docs-input-list-card,
        .docs-input-list-node.docs-search-hit .docs-input-list-card { box-shadow: 0 0 0 2px #fbbf24; }
        .docs-input-list.docs-search-hit.is-current .docs-input-list-card,
        .docs-input-list-node.docs-search-hit.is-current .docs-input-list-card { box-shadow: 0 0 0 2px #d97706; }
        .docs-toolbar-scroll { scrollbar-width: none; }
        .docs-toolbar-scroll::-webkit-scrollbar { display: none; }
        .ProseMirror-widget:has(.docs-section-chips) { display: block; width: 100%; }
        .docs-section-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 2px 0 16px; pointer-events: auto; }
        .docs-chip { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 6px 11px; font-size: 12px; font-weight: 600; font-family: Arial, Helvetica, sans-serif; line-height: 1.2; cursor: pointer; }
        .docs-chip-icon { width: 13px; height: 13px; flex-shrink: 0; }
        .docs-chip-chat { background: #7c3aed; color: #fff; border: 1px solid #7c3aed; width: 28px; height: 28px; padding: 0; justify-content: center; }
        .docs-chip-chat .docs-chip-icon { width: 14px; height: 14px; }
        .docs-chip-chat:hover { background: #6d28d9; }
        .docs-chip-topic { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
        .docs-chip-topic:hover { background: #ede9fe; border-color: #c4b5fd; }
        .docs-editor[data-chips-disabled="true"] .docs-section-chips button { opacity: 0.45; pointer-events: none; }
      `}</style>
      {!readOnly && (
        <EditorToolbar
          editor={editor}
          theme={theme}
          onThemeChange={onThemeChange}
          onInsertSection={() => onInsertSection?.()}
          onFind={findInDocument}
          onInsertImages={insertImages}
        />
      )}
      <div
        ref={scrollerRef}
        data-docs-scroller
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pb-40 xl:pb-28"
        style={{ scrollPaddingTop: SECTION_SCROLL_PADDING }}
      >
        <div
          className="mx-auto my-4 sm:my-6"
          style={{
            width: PAGE_WIDTH * scale,
            height: documentHeight * scale,
          }}
        >
          <div
            className="relative"
            style={{
              width: PAGE_WIDTH,
              minHeight: documentHeight,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {Array.from({ length: pages }, (_, index) => (
              <div
                key={index}
                className="docs-sheet absolute left-0 w-full border shadow-sm"
                style={{
                  top: index * (PAGE_HEIGHT + PAGE_GAP),
                  height: PAGE_HEIGHT,
                  zIndex: 0,
                  background: 'var(--rider-page)',
                  borderColor: 'var(--rider-line)',
                }}
              >
                {theme === 'studio' ? (
                  <span
                    className="absolute text-[11px] text-[#9aa0a6]"
                    style={{ right: 24, bottom: 18, fontFamily: 'Arial, Helvetica, sans-serif' }}
                  >
                    {index + 1}
                  </span>
                ) : (
                  <span className="docs-sheet-footer">
                    <span>{footerLabel}</span>
                    <span>{index + 1}</span>
                  </span>
                )}
              </div>
            ))}
            {editor ? (
              <EditorContent editor={editor} className="relative z-10" />
            ) : (
              <div className="relative z-10 px-24 py-24 text-slate-400">Cargando documento…</div>
            )}
          </div>
        </div>
      </div>
      {!readOnly && (
        <SlashCommandMenu
          editor={editor}
          enabled={!readOnly}
          keysRef={slashKeysRef}
          onInsertImages={insertImages}
        />
      )}
      <AnimatePresence>
        {!readOnly && onAskAssistant && isBlankDocument && (
          <EmptyDocumentComposer
            riderType={riderType}
            showPrompts
            isThinking={isAssistantThinking}
            onAsk={onAskAssistant}
            onInsertSection={onInsertSection}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
