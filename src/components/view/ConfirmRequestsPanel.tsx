"use client";

import React, { useState } from 'react';
import type { ContraLine, ContraResponse } from '@/core/types/contra-rider.types';

const RESPONSE_CHOICES: { value: Exclude<ContraResponse, ''>; label: string; activeClass: string }[] = [
  { value: 'cubro', label: 'Aprobado', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'alternativa', label: 'Alternativa', activeClass: 'bg-violet-600 text-white border-violet-600' },
  { value: 'no_puedo', label: 'Rechazado', activeClass: 'bg-rose-600 text-white border-rose-600' },
  { value: 'pregunta', label: 'Pregunta', activeClass: 'bg-amber-500 text-white border-amber-500' },
];

const RESPONSE_LABEL: Record<Exclude<ContraResponse, ''>, string> = {
  cubro: 'Aprobado',
  alternativa: 'Alternativa',
  no_puedo: 'Rechazado',
  pregunta: 'Pregunta',
};

interface ConfirmRequestsPanelProps {
  guestName: string;
  lines: ContraLine[];
  showReady?: boolean;
  onClose: () => void;
  onSave: (lineId: string, response: Exclude<ContraResponse, ''>, text: string) => Promise<void>;
}

export function ConfirmRequestsPanel({
  guestName,
  lines,
  showReady = false,
  onClose,
  onSave,
}: ConfirmRequestsPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, { response: ContraResponse; text: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const draftFor = (line: ContraLine) => drafts[line.id] ?? {
    response: line.response,
    text: line.response === 'alternativa' ? line.offer : line.note,
  };

  const save = async (line: ContraLine) => {
    const draft = draftFor(line);
    if (!draft.response) {
      setErrors((current) => ({ ...current, [line.id]: 'Elige una respuesta' }));
      return;
    }
    setSavingId(line.id);
    try {
      await onSave(line.id, draft.response, draft.text);
      setErrors((current) => {
        const next = { ...current };
        delete next[line.id];
        return next;
      });
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [line.id]: error instanceof Error ? error.message : 'No se pudo guardar',
      }));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-requests-title"
        className="bg-white rounded-t-[28px] sm:rounded-[32px] max-w-2xl w-full max-h-[88vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-white"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="confirm-requests-title" className="font-extrabold text-base text-slate-900">
              {showReady ? 'Pedidos del rider' : 'Confirmar pedidos'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {showReady
                ? `${guestName}, el artista no tiene pendientes. Puedes revisar lo confirmado.`
                : `${guestName}, responde al menos un pedido. Alternativa, Rechazado y Pregunta piden un texto.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">Este rider aún no tiene pedidos escritos.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {lines.map((line) => {
              const draft = draftFor(line);
              const responded = Boolean(line.response);
              return (
                <article key={line.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">{line.sectionTitle}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{line.moduleLabel}</p>
                    </div>
                    {line.reopened ? (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-orange-800 bg-orange-50 border border-orange-200 px-2 py-1 rounded-full">
                        Reabierto · En revisión
                      </span>
                    ) : responded && line.response ? (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                        Respondido · {RESPONSE_LABEL[line.response]}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600 whitespace-pre-wrap">{line.pedido}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {RESPONSE_CHOICES.map((choice) => {
                      const selected = draft.response === choice.value;
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          onClick={() => setDrafts((current) => ({
                            ...current,
                            [line.id]: { response: choice.value, text: draft.text },
                          }))}
                          className={`h-8 px-3 rounded-full border text-xs font-bold ${
                            selected
                              ? choice.activeClass
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                  {draft.response && draft.response !== 'cubro' ? (
                    <textarea
                      value={draft.text}
                      onChange={(event) => setDrafts((current) => ({
                        ...current,
                        [line.id]: { response: draft.response, text: event.target.value },
                      }))}
                      rows={2}
                      placeholder={
                        draft.response === 'alternativa'
                          ? 'Qué alternativa ofreces'
                          : draft.response === 'no_puedo'
                            ? 'Por qué lo rechazas'
                            : 'Qué necesitas preguntar'
                      }
                      className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                    />
                  ) : null}
                  {errors[line.id] ? (
                    <p className="mt-2 text-xs font-semibold text-rose-600">{errors[line.id]}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void save(line)}
                    disabled={savingId === line.id}
                    className="mt-3 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-2xl text-xs font-bold disabled:opacity-60"
                  >
                    {savingId === line.id ? 'Guardando…' : responded ? 'Actualizar respuesta' : 'Guardar respuesta'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
