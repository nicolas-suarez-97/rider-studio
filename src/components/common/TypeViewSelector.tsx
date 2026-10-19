'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/common/Icon';
import {
  emptyTypeViewCounts,
  TYPE_VIEW_BY_ID,
  TYPE_VIEW_OPTIONS,
  type TypeView,
  type TypeViewCounts,
  type TypeViewOption,
} from '@/core/constants/rider-type-tokens';

export type TypeViewSelectorVariant = 'toolbar' | 'compact' | 'sheet';
export type TypeViewCountMode = 'editor' | 'organizer';

export interface TypeViewSelectorProps {
  value: TypeView;
  counts: TypeViewCounts;
  onChange: (value: TypeView) => void;
  disabledTypes?: TypeView[];
  variant?: TypeViewSelectorVariant;
  onAddSection?: (type: TypeView) => void;
  loading?: boolean;
  countMode?: TypeViewCountMode;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('.ProseMirror'));
}

function countLine(option: TypeViewOption, counts: TypeViewCounts, mode: TypeViewCountMode) {
  const count = counts[option.id];
  if (mode === 'organizer') {
    if (count.requests === 0) return 'Sin pedidos';
    return `${count.sections} respondidos · ${count.requests} pedidos`;
  }
  if (count.sections === 0) return 'Sin secciones';
  const sectionLabel = count.sections === 1 ? 'sección' : 'secciones';
  const requestLabel = count.requests === 1 ? 'pedido' : 'pedidos';
  return `${count.sections} ${sectionLabel} · ${count.requests} ${requestLabel}`;
}

export function TypeViewSelector({
  value,
  counts,
  onChange,
  disabledTypes = [],
  variant,
  onAddSection,
  loading = false,
  countMode = 'editor',
}: TypeViewSelectorProps) {
  const menuId = useId();
  const liveId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const resolvedCounts = counts || emptyTypeViewCounts();
  const active = TYPE_VIEW_BY_ID[value] || TYPE_VIEW_OPTIONS[0];
  const total = resolvedCounts.all.sections;
  const visible = resolvedCounts[value]?.sections ?? total;
  const filtered = value !== 'all';

  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const resolvedVariant: TypeViewSelectorVariant = variant ?? (isMobile ? 'sheet' : 'toolbar');
  const sheet = resolvedVariant === 'sheet';
  const compact = resolvedVariant === 'compact';

  const isDisabled = useCallback((id: TypeView) => {
    if (id === 'all') return false;
    if (disabledTypes.includes(id)) return true;
    if (countMode === 'organizer') return resolvedCounts[id].requests === 0;
    return resolvedCounts[id].sections === 0;
  }, [countMode, disabledTypes, resolvedCounts]);

  const enabledIds = useMemo(
    () => TYPE_VIEW_OPTIONS.map((option) => option.id).filter((id) => !isDisabled(id)),
    [isDisabled],
  );

  const closeMenu = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  const openMenu = useCallback(() => {
    if (loading) return;
    const box = buttonRef.current?.getBoundingClientRect();
    if (box) {
      const width = 312;
      const left = Math.min(Math.max(8, box.left), window.innerWidth - width - 8);
      setCoords({ top: box.bottom + 6, left, width });
    }
    setOpen(true);
  }, [loading]);

  const announce = useCallback((next: TypeView) => {
    const shown = resolvedCounts[next].sections;
    const all = resolvedCounts.all.sections;
    if (next === 'all') {
      setAnnouncement(all === 0 ? 'Mostrando todo el rider' : `Mostrando ${all} de ${all} secciones`);
      return;
    }
    setAnnouncement(`Mostrando ${shown} de ${all} secciones · ${TYPE_VIEW_BY_ID[next].label}`);
  }, [resolvedCounts]);

  const select = useCallback((next: TypeView) => {
    if (isDisabled(next)) return;
    onChange(next);
    announce(next);
    closeMenu();
  }, [announce, closeMenu, isDisabled, onChange]);

  const addType = useCallback((next: TypeView) => {
    if (!onAddSection || next === 'all') return;
    onAddSection(next);
    closeMenu();
  }, [closeMenu, onAddSection]);

  const clearFilter = useCallback((event?: React.MouseEvent | React.KeyboardEvent) => {
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
    if (enabledIds.length === 0) return;
    const current = Math.max(0, enabledIds.indexOf(from));
    const next = enabledIds[(current + delta + enabledIds.length) % enabledIds.length];
    focusOption(next);
  }, [enabledIds, focusOption]);

  useEffect(() => {
    if (!open) return;
    const activeId = isDisabled(value) ? (enabledIds[0] || 'all') : value;
    const frame = window.requestAnimationFrame(() => focusOption(activeId));

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
        return;
      }
      if (event.key === 'Tab') {
        closeMenu(false);
        return;
      }
      const shortcut = TYPE_VIEW_OPTIONS.find((option) => {
        if (option.shortcut === '0') return event.code === 'Digit0' || event.key === '0';
        return event.code === `Key${option.shortcut}` || event.key.toUpperCase() === option.shortcut;
      });
      if (shortcut && !event.altKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        if (isDisabled(shortcut.id)) return;
        select(shortcut.id);
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
  }, [closeMenu, enabledIds, focusOption, isDisabled, open, select, value]);

  useEffect(() => {
    const onGlobal = (event: KeyboardEvent) => {
      if (!event.altKey || event.metaKey || event.ctrlKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.code === 'KeyV') {
        event.preventDefault();
        if (open) closeMenu();
        else openMenu();
        return;
      }
      if (event.code === 'Digit0') {
        event.preventDefault();
        clearFilter();
      }
    };
    document.addEventListener('keydown', onGlobal);
    return () => document.removeEventListener('keydown', onGlobal);
  }, [clearFilter, closeMenu, open, openMenu]);

  const onButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
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
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(enabledIds[0] || 'all');
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(enabledIds[enabledIds.length - 1] || 'all');
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isDisabled(option.id)) addType(option.id);
      else select(option.id);
    }
  };

  const hint = filtered
    ? (countMode === 'organizer'
      ? `Mostrando ${visible} de ${total} pedidos`
      : `Mostrando ${visible} de ${total} secciones`)
    : '';

  const buttonHeight = compact ? 'h-[30px]' : sheet ? 'h-10' : 'h-[34px]';
  const buttonClass = filtered
    ? `${active.buttonClass} ${active.iconClass}`
    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300';

  const menu = open ? (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label="Ver secciones por tipo"
      className={sheet
        ? 'fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl border border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_50px_rgba(15,23,42,0.18)] motion-reduce:transition-none'
        : 'fixed z-[80] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)] motion-reduce:transition-none'}
      style={sheet ? undefined : { top: coords?.top ?? 0, left: coords?.left ?? 0, width: coords?.width ?? 312 }}
    >
      {sheet ? (
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
      ) : null}
      <div className={`px-2 ${sheet ? 'pb-3' : 'pb-1.5'}`}>
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
          Ver secciones por tipo
        </p>
        <p className="text-[11px] font-semibold text-slate-400">
          Solo cambia lo que ves
        </p>
      </div>
      {TYPE_VIEW_OPTIONS.map((option, index) => {
        const disabled = isDisabled(option.id);
        const selected = value === option.id;
        const empty = option.id !== 'all' && (
          countMode === 'organizer'
            ? resolvedCounts[option.id].requests === 0
            : resolvedCounts[option.id].sections === 0
        );
        const label = empty
          ? (onAddSection && countMode === 'editor'
            ? `${option.label}: sin secciones. Agregar sección`
            : `${option.label}: ${countMode === 'organizer' ? 'sin pedidos' : 'sin secciones'}`)
          : option.label;
        return (
          <button
            key={option.id}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            aria-disabled={disabled}
            aria-label={label}
            tabIndex={selected ? 0 : -1}
            onKeyDown={(event) => onOptionKeyDown(event, option)}
            onClick={() => {
              if (disabled) addType(option.id);
              else select(option.id);
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left cursor-pointer ${
              disabled
                ? 'opacity-50'
                : selected
                  ? 'bg-slate-50'
                  : 'hover:bg-slate-50'
            }`}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${option.id === 'all' ? 'bg-slate-100 text-slate-600' : option.buttonClass}`}>
              <Icon name={option.icon} className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-bold ${disabled ? 'text-slate-400' : 'text-slate-800'}`}>
                {option.label}
              </span>
              <span className="block text-[11px] font-semibold text-slate-400">
                {empty
                  ? (onAddSection && countMode === 'editor' ? 'Sin secciones · Agregar' : countLine(option, resolvedCounts, countMode))
                  : countLine(option, resolvedCounts, countMode)}
              </span>
            </span>
            {selected ? <Icon name="check" className="w-4 h-4 text-slate-700 shrink-0" /> : null}
            {!sheet ? (
              <span className="w-5 text-right text-[10px] font-black text-slate-400 shrink-0">
                {option.shortcut}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  ) : null;

  if (loading) {
    return (
      <div
        className={`${buttonHeight} w-[118px] rounded-full bg-slate-100 border border-slate-200 animate-pulse`}
        aria-busy="true"
        aria-label="Cargando vista"
      />
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`inline-flex items-center rounded-full border ${buttonClass}`}>
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={filtered ? `Vista: ${active.label}` : 'Vista: Todo'}
          title="Abrir vista por tipo"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => (open ? closeMenu(false) : openMenu())}
          onKeyDown={onButtonKeyDown}
          className={`${buttonHeight} pl-2.5 ${filtered ? 'pr-1.5' : 'pr-2.5'} rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2`}
        >
          <Icon name={active.icon} className={`w-3.5 h-3.5 ${filtered ? active.iconClass : 'text-slate-500'}`} />
          {filtered ? (
            <span>{active.label}</span>
          ) : (
            <span>Vista: Todo</span>
          )}
          {filtered ? null : (
            <Icon name="chevronDown" className={`w-3.5 h-3.5 text-slate-400 ${open ? 'rotate-180' : ''} motion-reduce:transition-none`} />
          )}
        </button>
        {filtered ? (
          <button
            ref={clearRef}
            type="button"
            aria-label="Quitar filtro, ver todo"
            title="Quitar filtro, ver todo"
            onClick={clearFilter}
            className={`${buttonHeight} w-8 rounded-full inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600`}
          >
            <Icon name="x" className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
      {hint ? (
        <span className={`text-[11px] font-semibold truncate ${filtered ? active.iconClass : 'text-slate-500'}`}>
          {hint}
        </span>
      ) : null}
      <span id={liveId} className="sr-only" aria-live="polite">
        {announcement}
      </span>
      {open && sheet && typeof document !== 'undefined'
        ? createPortal(
          <div className="fixed inset-0 z-[70] bg-slate-900/40" onClick={() => closeMenu(false)} />,
          document.body,
        )
        : null}
      {open && typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </div>
  );
}
