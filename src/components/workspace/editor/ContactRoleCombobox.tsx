"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { NO_ACTIVE_INDEX, nextActiveIndexOnArrowDown } from '@/components/common/combobox-focus';
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
  const [activeIndex, setActiveIndex] = useState(NO_ACTIVE_INDEX);
  const options = useMemo(() => contactRoleOptions(value), [value]);
  const focusOptions = useMemo(
    () => options.map((option) => ({ freeText: option.kind === 'custom' })),
    [options],
  );

  useEffect(() => {
    setActiveIndex(NO_ACTIVE_INDEX);
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
      if (!open) setOpen(true);
      setActiveIndex((index) => nextActiveIndexOnArrowDown(index, focusOptions, true));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((index) => {
        if (!options.length) return NO_ACTIVE_INDEX;
        if (index < 0) return options.length - 1;
        return (index - 1 + options.length) % options.length;
      });
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
          if (readOnly) return;
          setActiveIndex(NO_ACTIVE_INDEX);
          setOpen(true);
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
