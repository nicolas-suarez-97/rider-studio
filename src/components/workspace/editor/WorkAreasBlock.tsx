"use client";

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/components/common/Icon';
import {
  createWorkArea,
  moveWorkArea,
  normalizeWorkAreas,
  removeWorkArea,
  updateWorkArea,
  WORK_AREA_LOCATIONS,
  type WorkArea,
} from '@/core/constants/work-areas';

function stop(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

export function WorkAreasBlock({ node, updateAttributes, editor, selected }: NodeViewProps) {
  const readOnly = !editor.isEditable;
  const areas = normalizeWorkAreas(node.attrs.areas);
  const save = (next: WorkArea[]) => updateAttributes({ areas: next });

  return (
    <NodeViewWrapper className={`docs-work-areas ${selected ? 'is-selected' : ''}`} data-type="work-areas">
      <div className="docs-work-areas-card" contentEditable={false}>
        <div className="docs-work-areas-head">
          <span className="docs-work-areas-head-title">Áreas de trabajo</span>
          {!readOnly && (
            <button
              type="button"
              className="docs-work-areas-add-btn"
              aria-label="Añadir área de trabajo"
              onMouseDown={stop}
              onClick={() => save([...areas, createWorkArea()])}
            >
              Añadir
            </button>
          )}
        </div>
        {areas.length === 0 && (
          <p className="docs-work-areas-empty">Aún no hay áreas. Añade FOH, backstage u otra ubicación.</p>
        )}
        {areas.map((area, index) => (
          <div key={area.id} className="docs-work-areas-row">
            <label className="docs-work-areas-field">
              <span>Nombre</span>
              <input
                aria-label={`Nombre del área ${index + 1}`}
                placeholder="Nombre"
                value={area.name}
                readOnly={readOnly}
                onMouseDown={stop}
                onChange={(event) => save(updateWorkArea(areas, area.id, { name: event.target.value }))}
              />
            </label>
            <label className="docs-work-areas-field">
              <span>Ubicación / tipo</span>
              <select
                aria-label={`Ubicación del área ${index + 1}`}
                value={area.location}
                disabled={readOnly}
                onMouseDown={stop}
                onChange={(event) => save(updateWorkArea(areas, area.id, {
                  location: event.target.value as WorkArea['location'],
                }))}
              >
                {WORK_AREA_LOCATIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="docs-work-areas-field docs-work-areas-notes">
              <span>Notas</span>
              <input
                aria-label={`Notas del área ${index + 1}`}
                placeholder="Notas"
                value={area.notes}
                readOnly={readOnly}
                onMouseDown={stop}
                onChange={(event) => save(updateWorkArea(areas, area.id, { notes: event.target.value }))}
              />
            </label>
            {!readOnly && (
              <div className="docs-work-areas-actions">
                <button
                  type="button"
                  aria-label={`Subir ${area.name || `área ${index + 1}`}`}
                  disabled={index === 0}
                  onMouseDown={stop}
                  onClick={() => save(moveWorkArea(areas, area.id, 'up'))}
                >
                  <Icon name="chevronUp" className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label={`Bajar ${area.name || `área ${index + 1}`}`}
                  disabled={index === areas.length - 1}
                  onMouseDown={stop}
                  onClick={() => save(moveWorkArea(areas, area.id, 'down'))}
                >
                  <Icon name="chevronDown" className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label={`Eliminar ${area.name || `área ${index + 1}`}`}
                  onMouseDown={stop}
                  onClick={() => save(removeWorkArea(areas, area.id))}
                >
                  <Icon name="trash" className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  );
}
