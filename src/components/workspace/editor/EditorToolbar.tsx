"use client";

import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { Icon } from '@/components/common/Icon';
import { RIDER_DOCUMENT_THEMES } from '@/core/constants/document-themes';
import type { RiderDocumentTheme } from '@/core/types/rider.types';

interface EditorToolbarProps {
  editor: Editor | null;
  theme: RiderDocumentTheme;
  onThemeChange?: (theme: RiderDocumentTheme) => void;
  onInsertSection: () => void;
  onFind: (query: string, direction?: 'first' | 'next' | 'prev') => { current: number; total: number };
  onInsertImages: (files: File[]) => void;
}

export function EditorToolbar({ editor, theme, onThemeChange, onInsertSection, onFind, onInsertImages }: EditorToolbarProps) {
  const findRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState({ current: 0, total: 0 });
  const marks = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return null;
      return {
        bold: current.isActive('bold'),
        italic: current.isActive('italic'),
        underline: current.isActive('underline'),
        bullet: current.isActive('bulletList'),
        ordered: current.isActive('orderedList'),
        heading2: current.isActive('heading', { level: 2 }),
        heading3: current.isActive('heading', { level: 3 }),
      };
    },
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        findRef.current?.focus();
        findRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const style = marks?.heading2 ? 'heading-2' : marks?.heading3 ? 'heading-3' : 'paragraph';

  const run = (command: (current: Editor) => void) => {
    if (!editor) return;
    command(editor);
  };

  const setStyle = (value: string) => {
    run((current) => {
      const chain = current.chain().focus();
      if (value === 'heading-2') chain.setHeading({ level: 2 }).run();
      else if (value === 'heading-3') chain.setHeading({ level: 3 }).run();
      else chain.setParagraph().run();
    });
  };

  const editLink = () => {
    run((current) => {
      const previous = current.getAttributes('link').href as string | undefined;
      const url = window.prompt('Enlace', previous || 'https://');
      if (url === null) return;
      if (url.trim() === '') {
        current.chain().focus().unsetLink().run();
        return;
      }
      current.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    });
  };

  return (
    <div className="docs-toolbar-scroll sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1 overflow-x-auto">
      <div className="flex items-center gap-0.5 pr-1" role="group" aria-label="Tema del documento">
        {RIDER_DOCUMENT_THEMES.map((item) => (
          <button
            key={item.id}
            type="button"
            title={`${item.label}. ${item.description}`}
            aria-label={item.label}
            aria-pressed={theme === item.id}
            disabled={!onThemeChange}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onThemeChange?.(item.id)}
            className={`h-8 w-8 shrink-0 rounded-lg inline-flex items-center justify-center cursor-pointer disabled:cursor-default ${
              theme === item.id ? 'bg-slate-100' : 'hover:bg-slate-50'
            }`}
          >
            <span
              className="h-4 w-4 rounded-full border border-slate-300"
              style={{ background: item.swatch }}
            />
          </button>
        ))}
      </div>
      <ToolbarButton label="Deshacer" disabled={!editor} onClick={() => run((current) => current.chain().focus().undo().run())}>
        ↺
      </ToolbarButton>
      <ToolbarButton label="Rehacer" disabled={!editor} onClick={() => run((current) => current.chain().focus().redo().run())}>
        ↻
      </ToolbarButton>
      <select
        aria-label="Estilo de párrafo"
        value={style}
        disabled={!editor}
        onChange={(event) => setStyle(event.target.value)}
        className="h-8 shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
      >
        <option value="paragraph">Texto</option>
        <option value="heading-2">Título</option>
        <option value="heading-3">Subtítulo</option>
      </select>
      <ToolbarButton label="Negrita" active={marks?.bold} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleBold().run())}>
        B
      </ToolbarButton>
      <ToolbarButton label="Cursiva" active={marks?.italic} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleItalic().run())}>
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton label="Subrayado" active={marks?.underline} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleUnderline().run())}>
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton label="Lista" active={marks?.bullet} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleBulletList().run())}>
        <Icon name="list" className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Lista numerada" active={marks?.ordered} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleOrderedList().run())}>
        1.
      </ToolbarButton>
      <ToolbarButton label="Enlace" disabled={!editor} onClick={editLink}>
        Enlace
      </ToolbarButton>
      <ToolbarButton
        label="Insertar imagen"
        disabled={!editor}
        onClick={() => fileRef.current?.click()}
      >
        <Icon name="image" className="w-3.5 h-3.5" />
        Imagen
      </ToolbarButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = '';
          if (files.length) onInsertImages(files);
        }}
      />
      <ToolbarButton
        label="Limpiar formato"
        disabled={!editor}
        onClick={() => run((current) => current.chain().focus().unsetAllMarks().clearNodes().run())}
      >
        Limpiar
      </ToolbarButton>
      <ToolbarButton label="Insertar sección" onClick={onInsertSection}>
        <Icon name="plus" className="w-3.5 h-3.5" />
        Sección
      </ToolbarButton>
      <form
        className="flex items-center gap-1 ml-auto"
        onSubmit={(event) => event.preventDefault()}
      >
        <input
          ref={findRef}
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            if (value.trim().length >= 2) setStats(onFind(value, 'first'));
            else setStats(onFind('', 'first'));
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (!query.trim()) return;
              setStats(onFind(query, event.shiftKey ? 'prev' : 'next'));
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setQuery('');
              setStats(onFind('', 'first'));
            }
          }}
          placeholder="Buscar"
          aria-label="Buscar en el documento"
          className="h-8 w-28 sm:w-40 shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 outline-none focus:border-violet-400 focus:bg-white"
        />
        {query.trim().length >= 2 && (
          <span className="text-[10px] font-bold tabular-nums text-slate-400 min-w-[2.4rem]" aria-live="polite">
            {stats.total > 0 ? `${stats.current}/${stats.total}` : '0'}
          </span>
        )}
        <ToolbarButton
          label="Anterior"
          disabled={!query.trim()}
          onClick={() => { if (query.trim()) setStats(onFind(query, 'prev')); }}
        >
          ↑
        </ToolbarButton>
        <ToolbarButton
          label="Siguiente"
          disabled={!query.trim()}
          onClick={() => { if (query.trim()) setStats(onFind(query, 'next')); }}
        >
          ↓
        </ToolbarButton>
      </form>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`h-8 px-2 shrink-0 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-default ${
        active ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}
