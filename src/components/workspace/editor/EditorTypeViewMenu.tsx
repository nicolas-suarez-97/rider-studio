'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/common/Icon';
import {
  TYPE_VIEW_BY_ID,
  TYPE_VIEW_OPTIONS,
  type TypeView,
  type TypeViewCounts,
  type TypeViewOption,
} from '@/core/constants/rider-type-tokens';

interface EditorTypeViewMenuProps {
  value: TypeView;
  counts: TypeViewCounts;
  onChange: (value: TypeView) => void;
}

function sectionCountLabel(count: number) {
  return count === 1 ? '1 sección' : `${count} secciones`;
}

export function EditorTypeViewMenu({ value, counts, onChange }: EditorTypeViewMenuProps) {
  const menuId = useId();
  const liveId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const active = TYPE_VIEW_BY_ID[value] || TYPE_VIEW_OPTIONS[0];
  const total = counts.all.sections;
  const visible = counts[value]?.sections ?? total;
  const filtered = value !== 'all';

  const closeMenu = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  const openMenu = useCallback(() => {
    const box = buttonRef.current?.getBoundingClientRect();
    if (box) {
      const width = 256;
      const left = Math.min(Math.max(8, box.left), window.innerWidth - width - 8);
      setCoords({ top: box.bottom + 6, left });
    }
    setOpen(true);
  }, []);

  const announce = useCallback((next: TypeView) => {
    const shown = counts[next].sections;
    const all = counts.all.sections;
    if (next === 'all') {
      setAnnouncement(all === 0 ? 'Vista: Todo' : `Vista: Todo. Mostrando ${all} de ${all} secciones`);
      return;
    }
    setAnnouncement(`Vista: ${TYPE_VIEW_BY_ID[next].label}. Mostrando ${shown} de ${all} secciones`);
  }, [counts]);

  const select = useCallback((next: TypeView) => {
    onChange(next);
    announce(next);
    closeMenu();
  }, [announce, closeMenu, onChange]);

  const clearFilter = useCallback((event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    onChange('all');
    announce('all');
    setOpen(false);
  }, [announce, onChange]);

  const focusOption = useCallback((id: TypeView) => {
    const index = TYPE_VIEW_OPTIONS.findIndex((option) => option.id === id);
    optionRefs.current[index]?.focus();
  }, []);

  const moveFocus = useCallback((from: TypeView, delta: number) => {
    const current = Math.max(0, TYPE_VIEW_OPTIONS.findIndex((option) => option.id === from));
    const next = TYPE_VIEW_OPTIONS[(current + delta + TYPE_VIEW_OPTIONS.length) % TYPE_VIEW_OPTIONS.length];
    focusOption(next.id);
  }, [focusOption]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => focusOption(value));

    const onPointer = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target) || clearRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      closeMenu(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    };

    const listen = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointer);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(listen);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [closeMenu, focusOption, open, value]);

  const onButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) openMenu();
    }
  };

  const onOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, option: TypeViewOption) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(option.id, 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(option.id, -1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(option.id);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`inline-flex items-center rounded-full border ${
        filtered ? `${active.buttonClass} ${active.iconClass}` : 'bg-white border-slate-200 text-slate-700'
      }`}>
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={filtered ? `Vista: ${active.label}` : 'Vista: Todo'}
          title="Ver secciones por tipo"
          onClick={() => (open ? closeMenu(false) : openMenu())}
          onKeyDown={onButtonKeyDown}
          className={`h-[30px] pl-2.5 ${filtered ? 'pr-1.5' : 'pr-2.5'} rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2`}
        >
          <span>{filtered ? active.label : 'Vista: Todo'}</span>
          {filtered ? null : (
            <Icon name="chevronDown" className={`w-3.5 h-3.5 text-slate-400 ${open ? 'rotate-180' : ''}`} />
          )}
        </button>
        {filtered ? (
          <button
            ref={clearRef}
            type="button"
            aria-label="Quitar filtro, ver todo"
            title="Quitar filtro, ver todo"
            onClick={clearFilter}
            className="h-[30px] w-8 rounded-full inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
          >
            <Icon name="x" className="w-3.5 h-3.5" />
          </button>
        ) : null}

        {open && typeof document !== 'undefined' ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Ver secciones por tipo"
            className="fixed z-[80] w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
            style={{ top: coords?.top ?? 0, left: coords?.left ?? 0 }}
          >
            {TYPE_VIEW_OPTIONS.map((option, index) => {
              const selected = value === option.id;
              const count = counts[option.id]?.sections ?? 0;
              return (
                <button
                  key={option.id}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onKeyDown={(event) => onOptionKeyDown(event, option)}
                  onClick={() => select(option.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left cursor-pointer ${
                    selected ? 'bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-800">{option.label}</span>
                    <span className="block text-[11px] font-semibold text-slate-400">
                      {sectionCountLabel(count)}
                    </span>
                  </span>
                  {selected ? (
                    <Icon name="check" className="w-4 h-4 text-slate-700 shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>,
          document.body,
        ) : null}
      </div>
      {filtered ? (
        <span className="text-[11px] font-semibold text-slate-500 truncate">
          Mostrando {visible} de {total} secciones
        </span>
      ) : null}
      <span id={liveId} className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
