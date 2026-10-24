"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { Icon } from '@/components/common/Icon';
import { insertCoverAtStart } from '@/components/workspace/editor/rider-blocks';
import { RIDER_DOCUMENT_THEMES } from '@/core/constants/document-themes';
import { cloneInputListRows } from '@/core/constants/input-list';
import type { RiderDocumentTheme } from '@/core/types/rider.types';

const RIDER_INSERTS: Array<{ id: string; label: string; icon: string }> = [
  { id: 'cover', label: 'Portada', icon: 'fileText' },
  { id: 'requirement', label: 'Requisito', icon: 'badge' },
  { id: 'notice', label: 'Aviso', icon: 'shield' },
  { id: 'tiers', label: 'Tiers', icon: 'table' },
  { id: 'contacts', label: 'Contactos', icon: 'users' },
  { id: 'columns', label: 'Columnas', icon: 'columns' },
  { id: 'input-list', label: 'Input List', icon: 'list' },
  { id: 'work-areas', label: 'Áreas de trabajo', icon: 'door' },
];

function insertRiderBlock(editor: Editor, id: string) {
  const chain = editor.chain().focus();
  if (id === 'cover') {
    insertCoverAtStart(editor);
    return;
  }
  if (id === 'requirement') chain.insertRequirement().run();
  else if (id === 'notice') chain.insertNotice('note').run();
  else if (id === 'tiers') chain.insertTiers().run();
  else if (id === 'contacts') chain.insertContacts().run();
  else if (id === 'columns') chain.insertColumns().run();
  else if (id === 'input-list') chain.insertInputList(cloneInputListRows()).run();
  else if (id === 'work-areas') chain.insertWorkAreas().run();
}

const ALIGN_OPTIONS: Array<{ id: string; label: string; icon: string }> = [
  { id: 'left', label: 'Alinear a la izquierda', icon: 'alignLeft' },
  { id: 'center', label: 'Centrar', icon: 'alignCenter' },
  { id: 'right', label: 'Alinear a la derecha', icon: 'alignRight' },
  { id: 'justify', label: 'Justificar', icon: 'alignJustify' },
];

interface EditorToolbarProps {
  editor: Editor | null;
  theme: RiderDocumentTheme;
  onThemeChange?: (theme: RiderDocumentTheme) => void;
  zoom?: string;
  onZoomChange?: (zoom: string) => void;
  onInsertSection?: () => void;
  onOpenLinkDialog?: () => void;
  onFind: (query: string, direction?: 'first' | 'next' | 'prev') => { current: number; total: number };
  onInsertImages: (files: File[]) => void;
}

export function EditorToolbar({
  editor,
  theme,
  onThemeChange,
  zoom = '100',
  onZoomChange,
  onOpenLinkDialog,
  onFind,
  onInsertImages,
}: EditorToolbarProps) {
  const findRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState({ current: 0, total: 0 });

  const marks = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return null;
      const fontSizeAttr = current.getAttributes('fontSize').size as string | undefined;
      let computedSize = 11;
      if (fontSizeAttr) {
        const parsed = parseInt(fontSizeAttr, 10);
        if (!isNaN(parsed)) computedSize = parsed;
      } else if (current.isActive('heading', { level: 1 })) {
        computedSize = 26;
      } else if (current.isActive('heading', { level: 2 })) {
        computedSize = 16;
      } else if (current.isActive('heading', { level: 3 })) {
        computedSize = 13;
      }

      const textAlign = current.isActive({ textAlign: 'center' })
        ? 'center'
        : current.isActive({ textAlign: 'right' })
        ? 'right'
        : current.isActive({ textAlign: 'justify' })
        ? 'justify'
        : 'left';

      return {
        bold: current.isActive('bold'),
        italic: current.isActive('italic'),
        underline: current.isActive('underline'),
        bullet: current.isActive('bulletList'),
        ordered: current.isActive('orderedList'),
        heading2: current.isActive('heading', { level: 2 }),
        heading3: current.isActive('heading', { level: 3 }),
        fontSize: computedSize,
        textAlign,
        link: current.isActive('link'),
        table: current.isActive('table'),
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
    if (onOpenLinkDialog) {
      onOpenLinkDialog();
    } else {
      window.dispatchEvent(new CustomEvent('rider:open-link-dialog'));
    }
  };

  return (
    <div className="docs-toolbar-scroll sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1 overflow-x-auto">
      <ThemeDropdown theme={theme} onThemeChange={onThemeChange} />

      <ToolbarButton label="Deshacer" disabled={!editor} onClick={() => run((current) => current.chain().focus().undo().run())}>
        ↺
      </ToolbarButton>
      <ToolbarButton label="Rehacer" disabled={!editor} onClick={() => run((current) => current.chain().focus().redo().run())}>
        ↻
      </ToolbarButton>

      <ToolbarDivider />

      <select
        aria-label="Zoom del documento"
        title="Zoom"
        value={zoom}
        disabled={!editor}
        onChange={(event) => onZoomChange?.(event.target.value)}
        className="h-8 shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 cursor-pointer outline-none hover:bg-slate-50 focus:border-violet-400 disabled:opacity-40"
      >
        <option value="fit">Ajustar</option>
        <option value="50">50%</option>
        <option value="75">75%</option>
        <option value="90">90%</option>
        <option value="100">100%</option>
        <option value="125">125%</option>
        <option value="150">150%</option>
        <option value="200">200%</option>
      </select>

      <ToolbarDivider />

      <select
        aria-label="Estilo de párrafo"
        value={style}
        disabled={!editor}
        onChange={(event) => setStyle(event.target.value)}
        className="h-8 shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 cursor-pointer outline-none hover:bg-slate-50 focus:border-violet-400 disabled:opacity-40"
      >
        <option value="paragraph">Texto</option>
        <option value="heading-2">Título</option>
        <option value="heading-3">Subtítulo</option>
      </select>
      <RiderInsertMenu editor={editor} />

      <ToolbarDivider />

      <FontSizeControl editor={editor} currentSize={marks?.fontSize ?? 11} />

      <ToolbarDivider />

      <ToolbarButton label="Negrita" active={marks?.bold} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleBold().run())}>
        B
      </ToolbarButton>
      <ToolbarButton label="Cursiva" active={marks?.italic} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleItalic().run())}>
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton label="Subrayado" active={marks?.underline} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleUnderline().run())}>
        <span className="underline">U</span>
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Enlace (⌘K)"
        active={marks?.link}
        disabled={!editor}
        onClick={editLink}
      >
        <Icon name="link" className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Insertar imagen"
        disabled={!editor}
        onClick={() => fileRef.current?.click()}
      >
        <Icon name="image" className="w-3.5 h-3.5" />
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

      <ToolbarDivider />

      <AlignMenu editor={editor} currentAlign={marks?.textAlign ?? 'left'} />

      <ToolbarButton label="Lista" active={marks?.bullet} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleBulletList().run())}>
        <Icon name="list" className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Lista numerada" active={marks?.ordered} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleOrderedList().run())}>
        1.
      </ToolbarButton>

      {marks?.table && (
        <>
          <ToolbarDivider />
          <ToolbarButton
            label="Eliminar tabla"
            disabled={!editor}
            onClick={() => run((current) => current.chain().focus().deleteTable().run())}
          >
            <Icon name="trash" className="w-3.5 h-3.5 text-rose-500" />
          </ToolbarButton>
        </>
      )}

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

function ToolbarDivider() {
  return <div className="h-4 w-px bg-slate-200 shrink-0 mx-0.5" aria-hidden="true" />;
}

function FontSizeControl({
  editor,
  currentSize,
}: {
  editor: Editor | null;
  currentSize: number;
}) {
  const [inputValue, setInputValue] = useState(String(currentSize));

  useEffect(() => {
    setInputValue(String(currentSize));
  }, [currentSize]);

  const applySize = (size: number) => {
    if (!editor) return;
    const clamped = Math.max(6, Math.min(96, size));
    editor.chain().focus().setFontSize(`${clamped}pt`).run();
    setInputValue(String(clamped));
  };

  const commit = () => {
    const parsed = parseInt(inputValue.trim(), 10);
    if (isNaN(parsed)) {
      setInputValue(String(currentSize));
      return;
    }
    applySize(parsed);
  };

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Tamaño de fuente">
      <button
        type="button"
        title="Reducir tamaño de fuente"
        aria-label="Reducir tamaño de fuente"
        disabled={!editor}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => applySize(currentSize - 1)}
        className="h-8 w-6 shrink-0 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center text-xs font-bold disabled:opacity-40 cursor-pointer disabled:cursor-default"
      >
        <Icon name="minus" className="w-3 h-3" />
      </button>
      <input
        type="text"
        aria-label="Tamaño de fuente"
        value={inputValue}
        disabled={!editor}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        className="h-8 w-9 shrink-0 rounded-lg border border-slate-200 bg-white text-center text-xs font-semibold text-slate-700 outline-none focus:border-violet-400 disabled:opacity-40"
      />
      <button
        type="button"
        title="Aumentar tamaño de fuente"
        aria-label="Aumentar tamaño de fuente"
        disabled={!editor}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => applySize(currentSize + 1)}
        className="h-8 w-6 shrink-0 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center text-xs font-bold disabled:opacity-40 cursor-pointer disabled:cursor-default"
      >
        <Icon name="plus" className="w-3 h-3" />
      </button>
    </div>
  );
}

function ThemeDropdown({
  theme,
  onThemeChange,
}: {
  theme: RiderDocumentTheme;
  onThemeChange?: (theme: RiderDocumentTheme) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentTheme = RIDER_DOCUMENT_THEMES.find((item) => item.id === theme) || RIDER_DOCUMENT_THEMES[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && (buttonRef.current?.contains(target) || menuRef.current?.contains(target))) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const box = buttonRef.current?.getBoundingClientRect();
    if (!box) return;
    const width = 288;
    const left = Math.min(box.left, window.innerWidth - width - 8);
    setCoords({ top: box.bottom + 4, left: Math.max(8, left) });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Tema del documento: ${currentTheme.label}`}
        title={`Tema actual: ${currentTheme.label}. Clic para cambiar de estilo`}
        disabled={!onThemeChange}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggle}
        className="h-8 px-2.5 shrink-0 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 inline-flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-default hover:bg-slate-50 transition-colors"
      >
        <span
          className="h-3.5 w-3.5 rounded-full border border-slate-300 shadow-sm shrink-0"
          style={{ background: currentTheme.swatch }}
        />
        <span className="truncate max-w-[110px]">{currentTheme.label}</span>
        <Icon name="chevronDown" className="w-3 h-3 text-slate-400 shrink-0" />
      </button>
      {open && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Temas del documento"
          className="fixed z-[80] w-72 max-h-[440px] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
          style={{ top: coords.top, left: coords.left }}
        >
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-800 tracking-wide uppercase">
              Tema visual del rider
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {RIDER_DOCUMENT_THEMES.length} estilos
            </span>
          </div>
          <div className="py-1">
            {RIDER_DOCUMENT_THEMES.map((item) => {
              const isSelected = item.id === theme;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors ${
                    isSelected ? 'bg-violet-50/70 text-violet-950' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onThemeChange?.(item.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className="mt-0.5 h-4 w-4 rounded-full border border-slate-300 shadow-sm shrink-0"
                    style={{ background: item.swatch }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold leading-tight truncate">
                        {item.label}
                      </span>
                      {item.category && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Icon name="check" className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function AlignMenu({
  editor,
  currentAlign,
}: {
  editor: Editor | null;
  currentAlign: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && (buttonRef.current?.contains(target) || menuRef.current?.contains(target))) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const box = buttonRef.current?.getBoundingClientRect();
    if (!box) return;
    const width = 144;
    const left = Math.min(box.left, window.innerWidth - width - 8);
    setCoords({ top: box.bottom + 4, left: Math.max(8, left) });
    setOpen(true);
  };

  const activeOption = ALIGN_OPTIONS.find((opt) => opt.id === currentAlign) || ALIGN_OPTIONS[0];

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Alineación del texto"
        title="Alineación"
        disabled={!editor}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggle}
        className="h-8 px-1.5 shrink-0 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 inline-flex items-center gap-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-default hover:bg-slate-50"
      >
        <Icon name={activeOption.icon} className="w-3.5 h-3.5" />
        <Icon name="chevronDown" className="w-3 h-3 text-slate-400" />
      </button>
      {open && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Opciones de alineación"
          className="fixed z-[80] flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
          style={{ top: coords.top, left: coords.left }}
        >
          {ALIGN_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              title={item.label}
              aria-label={item.label}
              aria-pressed={currentAlign === item.id}
              className={`h-8 w-8 rounded-lg inline-flex items-center justify-center cursor-pointer ${
                currentAlign === item.id ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (editor) {
                  editor.chain().focus().setTextAlign(item.id).run();
                }
                setOpen(false);
              }}
            >
              <Icon name={item.icon} className="w-4 h-4" />
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

function RiderInsertMenu({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && (buttonRef.current?.contains(target) || menuRef.current?.contains(target))) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const box = buttonRef.current?.getBoundingClientRect();
    if (!box) return;
    const width = 208;
    const left = Math.min(box.left, window.innerWidth - width - 8);
    setCoords({ top: box.bottom + 4, left: Math.max(8, left) });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Insertar bloque del rider"
        disabled={!editor}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggle}
        className="h-8 px-2 shrink-0 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-default hover:bg-slate-50"
      >
        Insertar
        <Icon name="chevronDown" className="w-3.5 h-3.5" />
      </button>
      {open && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Bloques del rider"
          className="fixed z-[80] w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
          style={{ top: coords.top, left: coords.left }}
        >
          {RIDER_INSERTS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (editor) insertRiderBlock(editor, item.id);
                setOpen(false);
              }}
            >
              <Icon name={item.icon} className="w-3.5 h-3.5 text-slate-500" />
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
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
