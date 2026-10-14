"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension, type Editor, type JSONContent } from '@tiptap/core';
import { Plugin, type Transaction } from '@tiptap/pm/state';
import { EditorToolbar } from '@/components/workspace/editor/EditorToolbar';
import { EmptyDocumentComposer } from '@/components/workspace/editor/EmptyDocumentComposer';
import { imageFilesFromDataTransfer, insertDocumentImages } from '@/components/workspace/editor/document-images';
import { Pagination, PAGE_GAP, PAGE_HEIGHT, PAGE_PADDING, PAGE_WIDTH, pageCountFromEditor } from '@/components/workspace/editor/pagination';
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
            next = (next || newState.tr).setNodeMarkup(pos, undefined, { ...node.attrs, id });
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
  isAssistantThinking?: boolean;
  onAskAssistant?: (text: string) => void;
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
  const documentHeight = pages * PAGE_HEIGHT + Math.max(0, pages - 1) * PAGE_GAP;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const sectionsRef = useRef(sections);
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
        blockquote: false,
        horizontalRule: false,
        strike: false,
        link: { openOnClick: false, autolink: true },
      }),
      SectionHeading.configure({ levels: [1, 2, 3] }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'docs-image',
        },
      }),
      Placeholder.configure({
        placeholder: 'Empieza a escribir…',
      }),
      RiderKeys,
      SuggestionHighlights,
      Pagination,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'docs-editor',
        'aria-label': 'Documento del rider',
        style: `padding:${PAGE_PADDING}px;min-height:${PAGE_HEIGHT}px;font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.15;color:#202124;outline:none;`,
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
    const nextDoc = riderDocumentFromSections(sections, { artistName, title: riderTitle });
    const currentIds = headingIdsFromDoc(editor.getJSON());
    const nextIds = headingIdsFromDoc(nextDoc);
    if (currentIds.join('|') === nextIds.join('|')) return;
    editor.commands.setContent(nextDoc as JSONContent, { emitUpdate: false });
    setPages(pageCountFromEditor(editor.view.dom));
  }, [editor, documentSignature, artistName, riderTitle, sections]);

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
    });
  }, [editor, findInDocument, onRegisterBridge]);

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
        .docs-editor ul { list-style: disc; padding-left: 1.5em; margin: 0.2em 0 0.5em; }
        .docs-editor ol { list-style: decimal; padding-left: 1.5em; margin: 0.2em 0 0.5em; }
        .docs-editor a { color: #1155cc; text-decoration: underline; }
        .docs-editor img, .docs-editor .docs-image { max-width: 100%; height: auto; max-height: 28rem; display: block; margin: 0.4em 0 0.7em; object-fit: contain; }
        .docs-toolbar-scroll { scrollbar-width: none; }
        .docs-toolbar-scroll::-webkit-scrollbar { display: none; }
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
              <div
                key={index}
                className="absolute left-0 w-full bg-white border border-[#dadce0] shadow-sm"
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
      {!readOnly && onAskAssistant && isBlankDocument && (
        <EmptyDocumentComposer
          riderType={riderType}
          showPrompts
          isThinking={isAssistantThinking}
          onAsk={onAskAssistant}
          onInsertSection={onInsertSection}
        />
      )}
    </div>
  );
}
