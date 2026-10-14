"use client";

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/components/common/Icon';
import {
  cloneInputListColumns,
  columnOptions,
  createInputListColumn,
  createInputListRow,
  type InputListColumn,
  type InputListColumnKind,
  type InputListOptionPreset,
  type InputListRow,
} from '@/core/constants/input-list';

function asRows(value: unknown): InputListRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((row, index) => createInputListRow(index, row as Partial<InputListRow>));
}

function asColumns(value: unknown): InputListColumn[] {
  if (!Array.isArray(value)) return cloneInputListColumns();
  return value.map((column, index) => ({
    id: typeof column?.id === 'string' ? column.id : `col-${index}`,
    label: typeof column?.label === 'string' && column.label.trim() ? column.label : 'Columna',
    kind: column?.kind === 'select' || column?.kind === 'toggle' ? column.kind : 'text',
    options: column?.options === 'instruments' || column?.options === 'positions' ? column.options : undefined,
  }));
}

export function InputListBlock({ node, updateAttributes, deleteNode, editor, selected }: NodeViewProps) {
  const rows = asRows(node.attrs.rows);
  const columns = asColumns(node.attrs.columns);
  const readOnly = !editor.isEditable;

  const save = (nextRows: InputListRow[], nextColumns = columns) => {
    updateAttributes({
      columns: nextColumns,
      rows: nextRows.map((row, index) => ({ ...row, ch: String(index + 1).padStart(2, '0') })),
    });
  };

  const patchCell = (rowId: string, columnId: string, value: string | boolean) => {
    save(rows.map((row) => (
      row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: value } } : row
    )));
  };

  const addColumn = (kind: InputListColumnKind | InputListOptionPreset | 'notes') => {
    save(rows, [...columns, createInputListColumn(kind)]);
  };

  const renameColumn = (columnId: string, label: string) => {
    save(rows, columns.map((column) => (column.id === columnId ? { ...column, label } : column)));
  };

  const removeColumn = (columnId: string) => {
    save(
      rows.map((row) => {
        const nextCells = { ...row.cells };
        delete nextCells[columnId];
        return { ...row, cells: nextCells };
      }),
      columns.filter((column) => column.id !== columnId),
    );
  };

  const cellValue = (row: InputListRow, column: InputListColumn): string | boolean => {
    const value = row.cells?.[column.id];
    if (column.kind === 'toggle') return value === true;
    return typeof value === 'string' ? value : '';
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
            <div className="docs-input-list-actions">
              <button
                type="button"
                className="docs-input-list-add"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => save([...rows, createInputListRow(rows.length)])}
              >
                <Icon name="plus" className="h-3 w-3" />
                Canal
              </button>
              <label className="docs-input-list-add">
                <Icon name="plus" className="h-3 w-3" />
                Columna
                <select
                  aria-label="Añadir columna"
                  value=""
                  onMouseDown={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    const value = event.target.value as InputListColumnKind | InputListOptionPreset | 'notes' | '';
                    event.target.value = '';
                    if (value) addColumn(value);
                  }}
                >
                  <option value="" disabled>Añadir columna</option>
                  <option value="text">Texto</option>
                  <option value="notes">Notas</option>
                  <option value="instruments">Instrumento</option>
                  <option value="positions">Posición</option>
                  <option value="toggle">+48V</option>
                </select>
              </label>
              <button
                type="button"
                className="docs-input-list-delete-block"
                title="Eliminar Input List"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => deleteNode()}
              >
                <Icon name="trash" className="h-3 w-3" />
                <span>Eliminar</span>
              </button>
            </div>
          )}
        </div>
        <div className="docs-input-list-scroll">
          <table>
            <thead>
              <tr>
                <th className="col-ch">CH</th>
                {columns.map((column) => (
                  <th key={column.id} className={column.kind === 'toggle' ? 'col-48' : 'col-data'}>
                    <div className="docs-input-list-colhead">
                      {readOnly ? (
                        <span>{column.label}</span>
                      ) : (
                        <input
                          value={column.label}
                          aria-label="Nombre de la columna"
                          onChange={(event) => renameColumn(column.id, event.target.value)}
                        />
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          className="docs-input-list-delete"
                          title={`Eliminar columna ${column.label}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => removeColumn(column.id)}
                        >
                          <Icon name="trash" className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                {!readOnly && <th className="col-actions" />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(1, columns.length + (readOnly ? 1 : 2))} className="docs-input-list-empty">
                    No hay canales. Añade uno para armar el patch.
                  </td>
                </tr>
              ) : rows.map((row) => (
                <tr key={row.id}>
                  <td className="col-ch">{row.ch}</td>
                  {columns.map((column) => (
                    <td key={column.id} className={column.kind === 'toggle' ? 'col-48' : 'col-data'}>
                      {column.kind === 'select' ? (
                        <CreatableSelect
                          id={`${row.id}-${column.id}`}
                          value={String(cellValue(row, column))}
                          options={columnOptions(column)}
                          placeholder={column.label}
                          disabled={readOnly}
                          onChange={(value) => patchCell(row.id, column.id, value)}
                        />
                      ) : column.kind === 'toggle' ? (
                        <button
                          type="button"
                          disabled={readOnly}
                          className={`docs-input-list-48 ${cellValue(row, column) === true ? 'is-on' : ''}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => patchCell(row.id, column.id, cellValue(row, column) !== true)}
                        >
                          {column.label || '+48V'}
                        </button>
                      ) : (
                        <input
                          value={String(cellValue(row, column))}
                          disabled={readOnly}
                          placeholder={column.label}
                          onChange={(event) => patchCell(row.id, column.id, event.target.value)}
                        />
                      )}
                    </td>
                  ))}
                  {!readOnly && (
                    <td className="col-actions">
                      <button
                        type="button"
                        className="docs-input-list-delete"
                        title="Eliminar canal"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => save(rows.filter((item) => item.id !== row.id))}
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
