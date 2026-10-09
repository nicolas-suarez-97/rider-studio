"use client";

import React from 'react';
import { Icon } from '@/components/common/Icon';
import { ContraFinding, FindingVerdict } from '@/core/types/contra-rider.types';
import { FINDING_RESPONSE_LABEL, downloadContraRiderFile, verdictSummary } from '@/lib/promotor/contra-file';

const PILL_CLASS: Record<FindingVerdict, string> = {
  cumple: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  parcial: 'bg-violet-50 text-violet-700 border-violet-200',
  no_aparece: 'bg-rose-50 text-rose-700 border-rose-200',
  contradice: 'bg-rose-50 text-rose-700 border-rose-200',
};

interface ContraCrossProps {
  artistName: string;
  sources: string[];
  findings: ContraFinding[];
  lineNumbers: Record<string, string>;
  appliedLineIds: string[];
  thinkingLabel: string | null;
  onApplyFinding: (finding: ContraFinding) => void;
  onApplyCovered: (findings: ContraFinding[]) => void;
  onOpenDocument: () => void;
}

export function ContraCross({
  artistName,
  sources,
  findings,
  lineNumbers,
  appliedLineIds,
  thinkingLabel,
  onApplyFinding,
  onApplyCovered,
  onOpenDocument,
}: ContraCrossProps) {
  const ordered = [...findings].sort((a, b) => (
    (lineNumbers[a.lineId] || '99').localeCompare(lineNumbers[b.lineId] || '99')
  ));
  const summary = verdictSummary(ordered);
  const hasCovered = ordered.some((finding) => finding.verdict === 'cumple');

  return (
    <div className="w-full h-full min-h-0 min-w-0 flex flex-col bg-[#f8f9fa]">
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-200/80 bg-white/80 backdrop-blur-md shrink-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Cruce</p>
        <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 truncate">
          {artistName || 'Artista'}
        </h2>
        <p className="mt-1 text-xs font-semibold text-slate-600">{summary}</p>
        {sources.length ? (
          <p className="mt-1 text-[11px] font-semibold text-slate-400 truncate">
            Datos: {sources.join(', ')}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadContraRiderFile({
              artistName,
              sources,
              findings: ordered,
              summary,
            })}
            className="bg-white hover:bg-violet-50 text-violet-700 border border-violet-200 h-9 px-3.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Icon name="download" className="w-3.5 h-3.5" />
            Descargar contra-rider
          </button>
          {hasCovered ? (
            <button
              type="button"
              onClick={() => onApplyCovered(ordered)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3.5 rounded-full text-xs font-bold cursor-pointer active:scale-95"
            >
              Aplicar lo aprobado
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpenDocument}
            className="h-9 px-3.5 rounded-full text-xs font-bold text-slate-500 hover:text-violet-700 cursor-pointer"
          >
            Rider del artista
          </button>
        </div>
        <p className="mt-2 text-[11px] font-semibold text-slate-400">
          Esto no envía el contra-rider. Las filas de la izquierda son la respuesta oficial.
        </p>
        {thinkingLabel ? (
          <p className="mt-2 text-[11px] font-semibold text-violet-700">{thinkingLabel}</p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4">
        <div className="bg-white border border-slate-200/80 rounded-[28px] shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] divide-y divide-slate-100">
          {ordered.map((finding) => {
            const phrase = finding.fileOffer || finding.suggestedText || finding.riderAsk;
            return (
              <article key={finding.lineId} className="px-4 sm:px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[11px] font-black tabular-nums text-slate-300">
                    {lineNumbers[finding.lineId] || ''}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {finding.sectionTitle}
                      </h3>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${PILL_CLASS[finding.verdict]}`}>
                        {FINDING_RESPONSE_LABEL[finding.verdict]}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-600 whitespace-pre-wrap">
                      {phrase}
                    </p>
                    {finding.verdict !== 'cumple' ? (
                      <button
                        type="button"
                        onClick={() => onApplyFinding(finding)}
                        className="mt-2.5 h-8 px-3 rounded-full border border-violet-200 bg-white text-xs font-bold text-violet-700 hover:bg-violet-50 cursor-pointer active:scale-95"
                      >
                        {appliedLineIds.includes(finding.lineId) ? 'En la fila' : 'Pasar a la fila'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
