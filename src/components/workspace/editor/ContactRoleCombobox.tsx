"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { contactRoleOptions } from '@/core/constants/contact-roles';

type ContactRoleComboboxProps = {
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onMouseDown?: (event: MouseEvent) => void;
};

export function ContactRoleCombobox({
  value,
  readOnly,
  onChange,
  onKeyDown,
  onMouseDown,
}: ContactRoleComboboxProps) {
  const uid = useId();
  const inputId = `${uid}-role`;
  const listId = `${uid}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const options = useMemo(() => contactRoleOptions(value), [value]);

  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((index) => (options.length ? (index + 1) % options.length : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((index) => (options.length ? (index - 1 + options.length) % options.length : 0));
      return;
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) pick(option.value);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
    }
    onKeyDown?.(event);
  };

  return (
    <div ref={rootRef} className="docs-contacts-role">
      <label htmlFor={inputId} className="docs-contacts-field-label">Rol</label>
      <input
        id={inputId}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && options[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        placeholder="Rol"
        value={value}
        readOnly={readOnly}
        autoComplete="off"
        onMouseDown={onMouseDown}
        onFocus={() => {
          if (!readOnly) setOpen(true);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          if (rootRef.current?.contains(event.relatedTarget as Node)) return;
          setOpen(false);
        }}
      />
      {open && !readOnly && (
        <ul id={listId} role="listbox" className="docs-contacts-role-list" aria-label="Roles">
          {options.map((option, index) => (
            <li
              key={`${option.kind}-${option.value}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`docs-contacts-role-option${index === activeIndex ? ' is-active' : ''}${option.kind === 'custom' ? ' is-custom' : ''}`}
              onMouseDown={(event) => {
                event.preventDefault();
                onMouseDown?.(event);
                pick(option.value);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
