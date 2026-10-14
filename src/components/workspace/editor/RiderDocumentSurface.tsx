"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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
import { SlashCommandMenu } from '@/components/workspace/editor/SlashCommandMenu';
import {
  applySuggestionToEditor,
  findSectionBounds,
  locateText,
  setEditorSuggestions,
  SuggestionHighlights,
} from '@/components/workspace/editor/suggestion-highlight';
import {
  headingIdsFromDoc,
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
  find: (query: string) => void;
  insertSectionTitle: (title: string) => string | null;
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
  isBlankDocument?: boolean;
  outlineEnter?: boolean;
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
  isBlankDocument = false,
  outlineEnter = false,
  isAssistantThinking = false,
  onAskAssistant,
}: RiderDocumentSurfaceProps) {
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
  const reduceMotion = useReducedMotion();
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
        style: `padding:${PAGE_PADDING}px;min-height:${PAGE_HEIGHT}px;font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.15;color:#202124;outline:none;`,
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
      let sectionId = sectionsRef.current[0]?.id || '';
      current.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading' && node.attrs.id && pos <= from) {
          sectionId = node.attrs.id as string;
        }
      });
      if (sectionId) callbacksRef.current.onActivateSection?.(sectionId);
      callbacksRef.current.onSelectionChange?.(sectionId, from === to ? '' : current.state.doc.textBetween(from, to, '\n'));
    },
  }, [readOnly]);

  editorRef.current = editor;

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
    const currentIds = headingIdsFromDoc(editor.getJSON());
    const nextIds = headingIdsFromDoc(nextDoc);
    if (currentIds.join('|') === nextIds.join('|')) return;
    editor.commands.setContent(nextDoc as JSONContent, { emitUpdate: false });
    setPages(pageCountFromEditor(editor.view.dom));
  }, [editor, documentSignature, artistName, riderTitle, sections]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dom.dataset.outlineEnter = outlineEnter && !reduceMotion ? 'true' : 'false';
    if (!outlineEnter || reduceMotion) return;
    let frames = 0;
    let frame = 0;
    const stamp = () => {
      if (editor.isDestroyed) return;
      const headings = editor.view.dom.querySelectorAll('h2');
      headings.forEach((node, index) => {
        (node as HTMLElement).style.setProperty('--outline-delay', `${index * 55}ms`);
      });
      const chips = editor.view.dom.querySelectorAll('.docs-section-chips');
      chips.forEach((node, index) => {
        (node as HTMLElement).style.setProperty('--outline-delay', `${70 + index * 55}ms`);
      });
      frames += 1;
      if (chips.length < headings.length && frames < 10) {
        frame = requestAnimationFrame(stamp);
      }
    };
    frame = requestAnimationFrame(stamp);
    return () => cancelAnimationFrame(frame);
  }, [editor, outlineEnter, reduceMotion, sectionIds]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    setEditorSuggestions(editor, suggestions);
    editor.view.dispatch(editor.state.tr.setMeta('rider-suggestions', true));
  }, [editor, suggestions]);

  const findInDocument = useCallback((query: string) => {
    if (!editor || !query.trim()) return;
    const range = locateText(editor.state.doc, query.trim(), true);
    if (range) editor.chain().focus().setTextSelection(range).scrollIntoView().run();
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
    <div className="relative flex-1 h-full min-h-0 min-w-0 flex flex-col bg-[#f0f2f5]">
      <style>{`
        .docs-editor { box-sizing: border-box; background: transparent; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
        .docs-page-break { pointer-events: none; user-select: none; display: block; width: 100%; margin: 0; padding: 0; border: 0; overflow: hidden; box-sizing: content-box; }
        .docs-editor h1 { font-size: 26pt; font-weight: 700; line-height: 1.15; margin: 0 0 0.35em; }
        .docs-editor h2 { font-size: 16pt; font-weight: 700; line-height: 1.2; margin: 1em 0 0.3em; }
        .docs-editor h3 { font-size: 13pt; font-weight: 700; margin: 0.8em 0 0.25em; }
        .docs-editor p { margin: 0 0 0.35em; }
        .docs-editor .is-empty::before { color: #9aa0a6; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
        .docs-editor ul { list-style: disc; padding-left: 1.5em; margin: 0.2em 0 0.5em; }
        .docs-editor ol { list-style: decimal; padding-left: 1.5em; margin: 0.2em 0 0.5em; }
        .docs-editor a { color: #1155cc; text-decoration: underline; }
        .docs-editor blockquote { border-left: 3px solid #c4b5fd; padding: 0.1em 0 0.1em 12px; margin: 0.45em 0 0.7em; color: #475569; }
        .docs-editor hr { border: 0; border-top: 1px solid #dadce0; margin: 1em 0; }
        .docs-editor .tableWrapper { margin: 0.45em 0 0.9em; overflow-x: auto; }
        .docs-editor table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .docs-editor th, .docs-editor td { position: relative; border: 1px solid #dadce0; padding: 6px 8px; vertical-align: top; font-size: 10pt; }
        .docs-editor th { background: #f8f9fa; font-weight: 700; text-align: left; }
        .docs-editor .selectedCell:after { position: absolute; inset: 0; background: rgba(124, 58, 237, 0.08); content: ''; pointer-events: none; }
        .docs-editor ul[data-type="taskList"] { list-style: none; padding-left: 0; }
        .docs-editor ul[data-type="taskList"] p { margin: 0; }
        .docs-editor li[data-type="taskItem"] { display: flex; align-items: flex-start; gap: 8px; }
        .docs-editor li[data-type="taskItem"] > label { margin-top: 0.2em; }
        .docs-editor img, .docs-editor .docs-image { max-width: 100%; height: auto; max-height: 28rem; display: block; margin: 0.4em 0 0.7em; object-fit: contain; }
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
        @keyframes docs-outline-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: none; }
        }
        .docs-editor[data-outline-enter="true"] h2,
        .docs-editor[data-outline-enter="true"] .docs-section-chips {
          animation: docs-outline-in 0.48s cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: var(--outline-delay, 0ms);
        }
        @media (prefers-reduced-motion: reduce) {
          .docs-editor[data-outline-enter="true"] h2,
          .docs-editor[data-outline-enter="true"] .docs-section-chips { animation: none; }
        }
      `}</style>
      {!readOnly && (
        <EditorToolbar
          editor={editor}
          onInsertSection={() => onInsertSection?.()}
          onFind={findInDocument}
          onInsertImages={insertImages}
        />
      )}
      <div
        ref={scrollerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pb-40 xl:pb-28 bg-[#f0f2f5]"
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
              <motion.div
                key={index}
                className="absolute left-0 w-full bg-white border border-[#dadce0] shadow-sm"
                initial={outlineEnter && !reduceMotion ? { opacity: 0, y: 22 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: outlineEnter && !reduceMotion ? 0.04 + index * 0.06 : 0,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  top: index * (PAGE_HEIGHT + PAGE_GAP),
                  height: PAGE_HEIGHT,
                  zIndex: 0,
                }}
              >
                <span
                  className="absolute text-[11px] text-[#9aa0a6]"
                  style={{ right: 24, bottom: 18 }}
                >
                  {index + 1}
                </span>
              </motion.div>
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
