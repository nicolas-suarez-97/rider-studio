"use client";

import React, { useState } from 'react';
import {
  REOPEN_BADGE,
  REOPEN_LABEL,
  SHARE_RESPONSE_BADGE,
  SHARE_RESPONSE_LABEL,
  type ArtistShareActionType,
  type ArtistShareItem,
  type ArtistShareSummary,
} from '@/lib/share/artist-confirms';

interface ArtistShareConfirmsPanelProps {
  title: string;
  items: ArtistShareItem[];
  summary: ArtistShareSummary;
  loading?: boolean;
  onClose: () => void;
  onAction: (
    item: ArtistShareItem,
    action: ArtistShareActionType,
    text: string
  ) => Promise<void>;
}

export function ArtistShareConfirmsPanel({
  title,
  items,
  summary,
  loading = false,
  onClose,
  onAction,
}: ArtistShareConfirmsPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openForm, setOpenForm] = useState<Record<string, 'reply' | 'propose' | 'accept' | 'reopen' | undefined>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const itemKey = (item: ArtistShareItem) => `${item.guestKey}:${item.lineId}`;
  const guests = summary.guestNames.length ? summary.guestNames.join(', ') : 'nadie todavía';

  const run = async (
    item: ArtistShareItem,
    action: ArtistShareActionType,
    text: string
  ) => {
    const key = itemKey(item);
    setSavingKey(key);
    try {
      await onAction(item, action, text);
      setErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setOpenForm((current) => ({ ...current, [key]: undefined }));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [key]: error instanceof Error ? error.message : 'No se pudo guardar',
      }));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="artist-share-confirms-title"
        className="bg-white rounded-t-[28px] sm:rounded-[32px] max-w-2xl w-full max-h-[88vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-white"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="artist-share-confirms-title" className="font-extrabold text-base text-slate-900">
              Respuestas del organizador
            </h2>
            <p className="text-xs text-slate-500 mt-1">{title}</p>
            <p className="text-xs text-slate-600 mt-2 font-semibold">
              {summary.answeredCount} {summary.answeredCount === 1 ? 'respuesta' : 'respuestas'}
              {' · '}
              Faltan {summary.needsActionCount} de tu lado
              {' · '}
              {guests}
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

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Cargando respuestas…</p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            Aún no hay respuestas del organizador en este rider. Cuando alguien confirme pedidos, aparecerán aquí.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {items.map((item) => {
              const key = itemKey(item);
              const form = openForm[key];
              const draft = drafts[key] ?? item.artistResponse;
              const previousDecision = item.previousDecision;
              const previousText = previousDecision
                ? (previousDecision.response === 'alternativa'
                    ? previousDecision.offer
                    : previousDecision.note
                  ).trim()
                : '';
              return (
                <article key={key} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 whitespace-pre-wrap">{item.pedido}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                        {item.guestName}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold uppercase tracking-wider border px-2 py-1 rounded-full ${
                        item.reopened ? REOPEN_BADGE : SHARE_RESPONSE_BADGE[item.response]
                      }`}
                    >
                      {item.reopened ? `${REOPEN_LABEL} · En revisión` : SHARE_RESPONSE_LABEL[item.response]}
                    </span>
                  </div>
                  {item.organizerText ? (
                    <blockquote className="mt-2 text-[13px] leading-relaxed text-slate-600 whitespace-pre-wrap border-l-2 border-slate-200 pl-3">
                      {item.organizerText}
                    </blockquote>
                  ) : (
                    <p className="mt-2 text-[13px] text-slate-400">Sin texto del organizador.</p>
                  )}
                  {item.acceptedAlternative && !item.reopened ? (
                    <p className="mt-2 text-xs font-semibold text-emerald-700">
                      Aceptaste la alternativa: {item.organizerText || 'oferta del organizador'}
                    </p>
                  ) : null}
                  {item.reopened ? (
                    <p className="mt-2 text-xs text-orange-800 whitespace-pre-wrap">
                      Reabierto{item.reopenAuthor ? ` por ${item.reopenAuthor}` : ''}
                      {item.reopenedAt ? ` · ${item.reopenedAt}` : ''}
                      {item.reopenReason ? `: ${item.reopenReason}` : ''}
                    </p>
                  ) : null}
                  {item.reopened && previousDecision ? (
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Decisión anterior
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {previousDecision.response
                          ? SHARE_RESPONSE_LABEL[previousDecision.response]
                          : 'Sin estado'}
                        {previousDecision.acceptedAlternative ? ' · alternativa aceptada' : ''}
                      </p>
                      {previousText ? (
                        <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap">{previousText}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {item.artistResponse ? (
                    <p className="mt-2 text-xs text-slate-600 whitespace-pre-wrap">
                      Tu respuesta: {item.artistResponse}
                    </p>
                  ) : null}

                  {item.needsAction && item.response === 'alternativa' ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {form === 'accept' ? (
                        <>
                          <button
                            type="button"
                            disabled={savingKey === key}
                            onClick={() => void run(item, 'accept_alternative', '')}
                            className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-2xl text-xs font-bold disabled:opacity-60"
                          >
                            {savingKey === key ? 'Guardando…' : 'Confirmar aceptación'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenForm((current) => ({ ...current, [key]: undefined }))}
                            className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-2xl text-xs font-bold"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setOpenForm((current) => ({ ...current, [key]: 'accept' }))}
                          className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-2xl text-xs font-bold"
                        >
                          Aceptar alternativa
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenForm((current) => ({ ...current, [key]: 'reply' }))}
                        className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-2xl text-xs font-bold"
                      >
                        Responder
                      </button>
                    </div>
                  ) : null}

                  {item.needsAction && item.response === 'pregunta' ? (
                    <button
                      type="button"
                      onClick={() => setOpenForm((current) => ({ ...current, [key]: 'reply' }))}
                      className="mt-3 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-2xl text-xs font-bold"
                    >
                      Responder
                    </button>
                  ) : null}

                  {item.needsAction && item.response === 'no_puedo' ? (
                    <button
                      type="button"
                      onClick={() => setOpenForm((current) => ({ ...current, [key]: 'propose' }))}
                      className="mt-3 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-2xl text-xs font-bold"
                    >
                      Proponer otra opción
                    </button>
                  ) : null}

                  {item.canReopen && form !== 'reopen' ? (
                    <button
                      type="button"
                      onClick={() => setOpenForm((current) => ({ ...current, [key]: 'reopen' }))}
                      className="mt-3 bg-white border border-orange-200 text-orange-800 px-3 py-2 rounded-2xl text-xs font-bold hover:bg-orange-50"
                      aria-label={`Reabrir / Revisar ${item.pedido}`}
                    >
                      Reabrir / Revisar
                    </button>
                  ) : null}

                  {form === 'reopen' ? (
                    <div className="mt-3">
                      <label className="sr-only" htmlFor={`reopen-reason-${key}`}>
                        Motivo para reabrir {item.pedido}
                      </label>
                      <textarea
                        id={`reopen-reason-${key}`}
                        value={drafts[key] ?? ''}
                        onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
                        rows={3}
                        required
                        placeholder="Motivo obligatorio para reabrir este pedido"
                        className="w-full resize-none rounded-2xl border border-orange-200 bg-orange-50/40 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={savingKey === key}
                          onClick={() => void run(item, 'reopen', drafts[key] ?? '')}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-2xl text-xs font-bold disabled:opacity-60"
                        >
                          {savingKey === key ? 'Guardando…' : 'Confirmar reapertura'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenForm((current) => ({ ...current, [key]: undefined }))}
                          className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-2xl text-xs font-bold"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {form === 'reply' || form === 'propose' ? (
                    <div className="mt-3">
                      <textarea
                        value={draft}
                        onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
                        rows={3}
                        placeholder={form === 'propose' ? 'Qué otra opción propones' : 'Tu respuesta al organizador'}
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={savingKey === key}
                          onClick={() => void run(item, form, draft)}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-2xl text-xs font-bold disabled:opacity-60"
                        >
                          {savingKey === key ? 'Guardando…' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenForm((current) => ({ ...current, [key]: undefined }))}
                          className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-2xl text-xs font-bold"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {errors[key] ? (
                    <p className="mt-2 text-xs font-semibold text-rose-600">{errors[key]}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
