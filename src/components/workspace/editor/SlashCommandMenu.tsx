"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { Icon } from '@/components/common/Icon';
import { filterSlashCommands, getSlashRange, type SlashHelpers, type SlashRange } from '@/components/workspace/editor/slash-commands';

const MENU_WIDTH = 320;
const MENU_MAX_HEIGHT = 360;

interface SlashCommandMenuProps {
  editor: Editor | null;
  enabled: boolean;
  keysRef: MutableRefObject<(event: KeyboardEvent) => boolean>;
  onInsertImages: (files: File[]) => void;
  onAskAssistant?: (text: string, sectionId?: string) => void;
}

export function SlashCommandMenu({ editor, enabled, keysRef, onInsertImages, onAskAssistant }: SlashCommandMenuProps) {
  const [range, setRange] = useState<(SlashRange & { query: string }) | null>(null);
  const [index, setIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const dismissedRef = useRef(false);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickCallbackRef = useRef<((files: File[]) => void) | null>(null);

  const commands = useMemo(() => filterSlashCommands(range?.query || ''), [range?.query]);

  const sync = useCallback(() => {
    if (!editor || !enabled) {
      setRange(null);
      dismissedRef.current = false;
      return;
    }
    const next = getSlashRange(editor);
    if (!next) {
      dismissedRef.current = false;
      setRange(null);
      return;
    }
    if (dismissedRef.current) return;
    setRange((current) => (
      current && current.from === next.from && current.to === next.to && current.query === next.query
        ? current
        : next
    ));
  }, [editor, enabled]);

  useEffect(() => {
    if (!editor || !enabled) return;
    sync();
    editor.on('transaction', sync);
    editor.on('selectionUpdate', sync);
    return () => {
      editor.off('transaction', sync);
      editor.off('selectionUpdate', sync);
    };
  }, [editor, enabled, sync]);

  useEffect(() => {
    setIndex(0);
  }, [range?.query, range?.from]);

  useEffect(() => {
    if (index >= commands.length) setIndex(0);
  }, [commands.length, index]);

  const placeMenu = useCallback(() => {
    if (!editor || !range) {
      setCoords(null);
      return;
    }
    try {
      const caret = editor.view.coordsAtPos(range.from);
      const width = MENU_WIDTH;
      const estimated = Math.min(MENU_MAX_HEIGHT, window.innerHeight - 24);
      const spaceBelow = window.innerHeight - caret.bottom - 12;
      const openUp = spaceBelow < 180 && caret.top > spaceBelow;
      const maxHeight = Math.max(160, Math.min(estimated, openUp ? caret.top - 16 : spaceBelow));
      let left = caret.left;
      if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
      if (left < 12) left = 12;
      const top = openUp ? Math.max(12, caret.top - maxHeight - 8) : caret.bottom + 8;
      setCoords({ top, left, maxHeight });
    } catch {
      setCoords(null);
    }
  }, [editor, range]);

  useLayoutEffect(() => {
    if (!range) {
      setCoords(null);
      return;
    }
    placeMenu();
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);
    return () => {
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
    };
  }, [placeMenu, range]);

  const runCommand = useCallback((commandIndex: number) => {
    if (!editor || !range) return false;
    const command = commands[commandIndex];
    if (!command) return false;
    const helpers: SlashHelpers = {
      insertImages: onInsertImages,
      pickImages: (onFiles) => {
        pickCallbackRef.current = onFiles;
        fileRef.current?.click();
      },
      askAssistant: onAskAssistant,
    };
    command.run(editor, { from: range.from, to: range.to }, helpers);
    dismissedRef.current = false;
    setRange(null);
    return true;
  }, [commands, editor, onAskAssistant, onInsertImages, range]);

  useEffect(() => {
    if (!range) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      dismissedRef.current = true;
      setRange(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [range]);

  useEffect(() => {
    keysRef.current = (event) => {
      if (!range) return false;
      if (event.key === 'ArrowDown') {
        if (commands.length === 0) return true;
        event.preventDefault();
        setIndex((current) => (current + 1) % commands.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        if (commands.length === 0) return true;
        event.preventDefault();
        setIndex((current) => (current - 1 + commands.length) % commands.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        if (commands.length === 0) return true;
        event.preventDefault();
        return runCommand(index);
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        dismissedRef.current = true;
        setRange(null);
        return true;
      }
      return false;
    };
    return () => {
      keysRef.current = () => false;
    };
  }, [commands.length, index, keysRef, range, runCommand]);

  useEffect(() => {
    itemRefs.current[index]?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const groups = commands.reduce<Array<{ name: string; items: typeof commands }>>((acc, command) => {
    const last = acc[acc.length - 1];
    if (!last || last.name !== command.group) acc.push({ name: command.group, items: [command] });
    else last.items.push(command);
    return acc;
  }, []);

  let optionIndex = -1;
  const menu = range && coords && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Insertar bloque"
          className="fixed z-[80] overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
          style={{ top: coords.top, left: coords.left, width: MENU_WIDTH, maxHeight: coords.maxHeight }}
        >
          <p className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400">
            {range.query ? `Filtro: “${range.query}”` : 'Escribe para filtrar'}
          </p>
          {commands.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400">Sin resultados</p>
          ) : groups.map((group) => (
            <div key={group.name} className="mb-1">
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.name}</p>
              {group.items.map((command) => {
                optionIndex += 1;
                const selected = optionIndex === index;
                const itemIndex = optionIndex;
                return (
                  <button
                    key={command.id}
                    ref={(node) => {
                      itemRefs.current[itemIndex] = node;
                    }}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setIndex(itemIndex)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => runCommand(itemIndex)}
                    className={`flex w-full items-center gap-3 px-2.5 py-1.5 text-left ${
                      selected ? 'bg-violet-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      command.id === 'ai-suggestions'
                        ? 'border-violet-300 bg-violet-600 text-white shadow-xs'
                        : selected ? 'border-violet-200 bg-white text-violet-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}>
                      <Icon name={command.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={`block truncate text-[13px] font-semibold ${command.id === 'ai-suggestions' ? 'text-violet-900 font-bold' : 'text-slate-800'}`}>
                        {command.title}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">{command.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = '';
          pickCallbackRef.current?.(files);
          pickCallbackRef.current = null;
        }}
      />
      {menu}
    </>
  );
}
