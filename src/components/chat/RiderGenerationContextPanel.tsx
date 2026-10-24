"use client";

import React from 'react';
import {
  FORMAT_OPTIONS,
  OTHER_SCALE,
  SCALE_OPTIONS,
  SCHEDULE_OPTIONS,
  completeContext,
  isContextComplete,
  summarizeContext,
  type RiderDocumentFormat,
  type RiderGenerationDraft,
  type RiderScheduleKind,
} from '@/core/chat/rider-generation-context';

export type ContextPanelMode = 'collect' | 'reuse' | 'ask_new';

interface AvailableRider {
  id: string;
  title: string;
  artist: string;
}

interface RiderGenerationContextPanelProps {
  mode: ContextPanelMode;
  draft: RiderGenerationDraft;
  onDraftChange: (next: RiderGenerationDraft) => void;
  availableRiders?: AvailableRider[];
  linkExistingId: string | null;
  onLinkExistingId: (id: string | null) => void;
  onConfirmCreate: () => void;
  onConfirmLink: () => void;
  onCancel: () => void;
  onOpenLinked: () => void;
  onStartNew: () => void;
  submitting?: boolean;
  error?: string | null;
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
        active
          ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

export function RiderGenerationContextPanel({
  mode,
  draft,
  onDraftChange,
  availableRiders = [],
  linkExistingId,
  onLinkExistingId,
  onConfirmCreate,
  onConfirmLink,
  onCancel,
  onOpenLinked,
  onStartNew,
  submitting = false,
  error = null,
}: RiderGenerationContextPanelProps) {
  const completed = completeContext(draft);
  const canCreate = isContextComplete(draft) && !submitting;

  if (mode === 'reuse') {
    return (
      <div className="rounded-2xl border border-violet-200/80 bg-violet-50/80 p-3.5 space-y-3">
        <p className="text-xs font-semibold text-slate-700">
          Este chat ya comparte un rider con el editor. Un segundo «generar» no crea un documento huérfano.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenLinked}
            className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold cursor-pointer"
          >
            Abrir editor
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'ask_new') {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-3.5 space-y-3">
        <p className="text-xs font-semibold text-slate-700">
          Este chat ya tiene un rider. ¿Abrimos ese documento o creamos uno nuevo?
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenLinked}
            className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold cursor-pointer"
          >
            Usar el vinculado
          </button>
          <button
            type="button"
            onClick={onStartNew}
            className="px-3 py-1.5 rounded-xl bg-white border border-violet-200 text-violet-700 text-xs font-bold cursor-pointer"
          >
            Crear uno nuevo
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200/80 bg-white p-3.5 sm:p-4 space-y-3.5 shadow-xs">
      <div>
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
          Contexto mínimo para el rider
        </h4>
        <p className="text-[11px] text-slate-500 mt-1">
          Editable antes de confirmar. La escala la eliges tú; no se infiere.
        </p>
      </div>

      {availableRiders.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="link-existing-rider" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
            O vincular un rider existente
          </label>
          <select
            id="link-existing-rider"
            value={linkExistingId || ''}
            onChange={(event) => onLinkExistingId(event.target.value || null)}
            className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
          >
            <option value="">Crear rider nuevo con este contexto</option>
            {availableRiders.map((rider) => (
              <option key={rider.id} value={rider.id}>
                {rider.artist || rider.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {!linkExistingId && (
        <>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              1. Gira o fecha individual
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SCHEDULE_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  active={draft.scheduleKind === option.id}
                  onClick={() => onDraftChange({ ...draft, scheduleKind: option.id as RiderScheduleKind })}
                />
              ))}
            </div>
            <input
              type="text"
              value={draft.scheduleLabel || ''}
              onChange={(event) => onDraftChange({ ...draft, scheduleLabel: event.target.value })}
              placeholder={draft.scheduleKind === 'gira' ? 'Nombre o temporada de gira (opcional)' : 'Fecha o ciudad (opcional)'}
              className="w-full text-xs rounded-xl border border-slate-200 px-2.5 py-2"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              2. Formato
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FORMAT_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  active={draft.format === option.id}
                  onClick={() => onDraftChange({ ...draft, format: option.id as RiderDocumentFormat })}
                />
              ))}
            </div>
            {draft.format === 'otro' && (
              <input
                type="text"
                value={draft.formatOther || ''}
                onChange={(event) => onDraftChange({ ...draft, formatOther: event.target.value })}
                placeholder="Describe el formato"
                className="w-full text-xs rounded-xl border border-slate-200 px-2.5 py-2"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              3. Escala de producción o artista
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SCALE_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  active={draft.scale === option.id || draft.scale === option.label}
                  onClick={() => onDraftChange({ ...draft, scale: option.id })}
                />
              ))}
            </div>
            {(draft.scale === OTHER_SCALE || draft.scale === 'Otra (la escribo yo)') && (
              <input
                type="text"
                value={draft.scaleOther || ''}
                onChange={(event) => onDraftChange({ ...draft, scaleOther: event.target.value })}
                placeholder="Escribe la escala; no se elige sola"
                className="w-full text-xs rounded-xl border border-slate-200 px-2.5 py-2"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              4. Observaciones (opcional)
            </span>
            <textarea
              value={draft.notes || ''}
              onChange={(event) => onDraftChange({ ...draft, notes: event.target.value })}
              rows={2}
              placeholder="Notas libres. No se imponen como requisitos del rider."
              className="w-full text-xs rounded-xl border border-slate-200 px-2.5 py-2 resize-y min-h-[56px]"
            />
          </div>

          {completed && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <span className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                Resumen (editable arriba)
              </span>
              <p className="text-xs text-slate-700 whitespace-pre-line">{summarizeContext(completed)}</p>
            </div>
          )}
        </>
      )}

      {error && (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {linkExistingId ? (
          <button
            type="button"
            onClick={onConfirmLink}
            disabled={submitting}
            className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            {submitting ? 'Vinculando…' : 'Vincular rider existente'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onConfirmCreate}
            disabled={!canCreate}
            className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            {submitting ? 'Creando…' : 'Generar / Crear rider'}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
