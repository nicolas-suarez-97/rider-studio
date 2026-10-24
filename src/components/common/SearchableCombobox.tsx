"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { BrandModelOption } from '@/lib/equipment/brand-model';
import { NO_ACTIVE_INDEX, nextActiveIndexOnArrowDown } from '@/components/common/combobox-focus';

type SearchableComboboxProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  getOptions: (query: string) => BrandModelOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function SearchableCombobox({
  label,
  value,
  onChange,
  getOptions,
  placeholder,
  disabled = false,
  className = '',
}: SearchableComboboxProps) {
  const uid = useId();
  const listId = `${uid}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [activeIndex, setActiveIndex] = useState(NO_ACTIVE_INDEX);
  const query = open ? draft : value;
  const options = useMemo(() => getOptions(query), [getOptions, query]);
  const focusOptions = useMemo(
    () => options.map((option) => ({ freeText: Boolean(option.custom) })),
    [options],
  );

  const openList = () => {
    setDraft(value);
    setActiveIndex(NO_ACTIVE_INDEX);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const commit = (next: string) => {
    onChange(next);
    setDraft(next);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) openList();
      setActiveIndex((index) => nextActiveIndexOnArrowDown(index, focusOptions));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openList();
      setActiveIndex((index) => {
        if (!options.length) return NO_ACTIVE_INDEX;
        if (index < 0) return options.length - 1;
        return Math.max(index - 1, 0);
      });
      return;
    }
    if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(Math.max(options.length - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      if (!open) return;
      event.preventDefault();
      const option = options[activeIndex];
      if (option) commit(option.value);
      return;
    }
    if (event.key === 'Escape') {
      if (!open) return;
      event.preventDefault();
      setDraft(value);
      setOpen(false);
    }
  };

  const activeId = options[activeIndex] ? `${uid}-opt-${activeIndex}` : undefined;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <label htmlFor={uid} className="sr-only">{label}</label>
      <input
        ref={inputRef}
        id={uid}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? activeId : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          setDraft(event.target.value);
          setActiveIndex(NO_ACTIVE_INDEX);
          setOpen(true);
        }}
        onFocus={() => {
          if (!disabled) openList();
        }}
        onKeyDown={onKeyDown}
        className="h-8 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 outline-none focus:border-slate-400 disabled:opacity-60"
      />
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.map((option, index) => (
            <li
              key={`${option.value}-${option.custom ? 'custom' : 'item'}`}
              id={`${uid}-opt-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`cursor-pointer px-2.5 py-1.5 text-xs ${
                index === activeIndex ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
              } ${option.custom ? 'italic' : 'font-medium'}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                commit(option.value);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
