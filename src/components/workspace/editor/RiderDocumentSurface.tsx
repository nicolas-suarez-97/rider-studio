"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension, type JSONContent } from '@tiptap/core';
import { EditorToolbar } from '@/components/workspace/editor/EditorToolbar';
import { Pagination, PAGE_GAP, PAGE_HEIGHT, PAGE_WIDTH, pageCountFromEditor } from '@/components/workspace/editor/pagination';
import {
  applySuggestionToEditor,
  findSectionBounds,
  locateText,
  setEditorSuggestions,
  SuggestionHighlights,
} from '@/components/workspace/editor/suggestion-highlight';
import {
  headingIdsFromDoc,
  riderDocumentFromSections,
  splitDocumentToSections,
  type SectionDocumentPatch,
} from '@/core/editor/content-doc';
import { SectionItem } from '@/core/types/rider.types';
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
  const sectionsRef = useRef(sections);
  const callbacksRef = useRef({ onDocumentChange, onActivateSection, onSelectionChange });
  sectionsRef.current = sections;
  callbacksRef.current = { onDocumentChange, onActivateSection, onSelectionChange };

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
        style: 'padding:96px;min-height:1056px;font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.15;color:#202124;outline:none;',
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

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f0f2f5]">
      <style>{`
        .docs-editor h1 { font-size: 26pt; font-weight: 700; line-height: 1.15; margin: 0 0 0.35em; }
        .docs-editor h2 { font-size: 16pt; font-weight: 700; line-height: 1.2; margin: 1em 0 0.3em; }
        .docs-editor h3 { font-size: 13pt; font-weight: 700; margin: 0.8em 0 0.25em; }
        .docs-editor p { margin: 0 0 0.35em; }
        .docs-editor ul { list-style: disc; padding-left: 1.5em; margin: 0.2em 0 0.5em; }
        .docs-editor ol { list-style: decimal; padding-left: 1.5em; margin: 0.2em 0 0.5em; }
        .docs-editor a { color: #1155cc; text-decoration: underline; }
      `}</style>
      {!readOnly && (
        <EditorToolbar
          editor={editor}
          onInsertSection={() => onInsertSection?.()}
          onFind={findInDocument}
        />
      )}
      <div className="flex-1 overflow-auto overscroll-contain pb-24 xl:pb-8 bg-[#f0f2f5]">
        <div
          className="relative mx-auto my-6"
          style={{
            width: PAGE_WIDTH,
            minHeight: pages * PAGE_HEIGHT + Math.max(0, pages - 1) * PAGE_GAP,
          }}
        >
          {Array.from({ length: pages }, (_, index) => (
            <div
              key={index}
              className="absolute left-0 w-full bg-white border border-[#dadce0]"
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
  );
}
