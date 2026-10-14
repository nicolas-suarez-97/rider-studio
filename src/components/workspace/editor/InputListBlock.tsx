"use client";

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/components/common/Icon';
import {
  createInputListRow,
  INPUT_LIST_INSTRUMENTS,
  INPUT_LIST_POSITIONS,
  type InputListRow,
} from '@/core/constants/input-list';

function asRows(value: unknown): InputListRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((row, index) => createInputListRow(index, row as Partial<InputListRow>));
}

export function InputListBlock({ node, updateAttributes, editor, selected }: NodeViewProps) {
  const rows = asRows(node.attrs.rows);
  const readOnly = !editor.isEditable;

  const setRows = (next: InputListRow[]) => {
    updateAttributes({
      rows: next.map((row, index) => ({ ...row, ch: String(index + 1).padStart(2, '0') })),
    });
  };

  const patchRow = (id: string, patch: Partial<InputListRow>) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <NodeViewWrapper
      className={`docs-input-list ${selected ? 'is-selected' : ''}`}
      data-type="input-list"
    >
      <div className="docs-input-list-card" contentEditable={false}>
        <div className="docs-input-list-head">
          <span className="docs-input-list-title">
            <Icon name="list" className="h-3.5 w-3.5" />
            Input List
          </span>
          <span className="docs-input-list-count">
            {rows.length} {rows.length === 1 ? 'canal' : 'canales'}
          </span>
          {!readOnly && (
            <button
              type="button"
              className="docs-input-list-add"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setRows([...rows, createInputListRow(rows.length)])}
            >
              <Icon name="plus" className="h-3 w-3" />
              Canal
            </button>
          )}
        </div>
        <div className="docs-input-list-scroll">
          <table>
            <thead>
              <tr>
                <th className="col-ch">CH</th>
                <th>Instrumento</th>
                <th>Posición</th>
                <th>Micrófono</th>
                <th>Atril</th>
                <th className="col-48">+48V</th>
                {!readOnly && <th className="col-actions" />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 6 : 7} className="docs-input-list-empty">
                    No hay canales. Añade uno para armar el patch.
                  </td>
                </tr>
              ) : rows.map((row) => (
                <tr key={row.id}>
                  <td className="col-ch">{row.ch}</td>
                  <td>
                    <CreatableSelect
                      id={`${row.id}-instrument`}
                      value={row.instrument}
                      options={INPUT_LIST_INSTRUMENTS}
                      placeholder="Instrumento"
                      disabled={readOnly}
                      onChange={(instrument) => patchRow(row.id, { instrument })}
                    />
                  </td>
                  <td>
                    <CreatableSelect
                      id={`${row.id}-position`}
                      value={row.position}
                      options={INPUT_LIST_POSITIONS}
                      placeholder="Posición"
                      disabled={readOnly}
                      onChange={(position) => patchRow(row.id, { position })}
                    />
                  </td>
                  <td>
                    <input
                      value={row.mic}
                      disabled={readOnly}
                      placeholder="ej. Shure SM58"
                      onChange={(event) => patchRow(row.id, { mic: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={row.stand}
                      disabled={readOnly}
                      placeholder="ej. Jirafa"
                      onChange={(event) => patchRow(row.id, { stand: event.target.value })}
                    />
                  </td>
                  <td className="col-48">
                    <button
                      type="button"
                      disabled={readOnly}
                      className={`docs-input-list-48 ${row.phantom ? 'is-on' : ''}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => patchRow(row.id, { phantom: !row.phantom })}
                    >
                      +48V
                    </button>
                  </td>
                  {!readOnly && (
                    <td className="col-actions">
                      <button
                        type="button"
                        className="docs-input-list-delete"
                        title="Eliminar canal"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setRows(rows.filter((item) => item.id !== row.id))}
                      >
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

function CreatableSelect({
  id,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="docs-combo">
      <input
        list={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id={id}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
  );
}
