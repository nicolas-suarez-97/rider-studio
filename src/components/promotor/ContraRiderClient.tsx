"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/common/Header';
import { Icon } from '@/components/common/Icon';
import { Toast } from '@/components/common/Toast';
import { DocumentEditorPanel } from '@/components/workspace/DocumentEditorPanel';
import { Rider } from '@/core/models/Rider';
import { ContraLine, ContraResponse } from '@/core/types/contra-rider.types';
import { RiderType } from '@/core/types/rider.types';
import { answersFromLines, sendBlockReason } from '@/lib/promotor/contra-rider';

type MobileTab = 'contra' | 'document';

interface ContraMeta {
  status: 'draft' | 'sent';
  version: number;
  sentAt: string | null;
  lines: ContraLine[];
}

interface ContraRiderClientProps {
  showId: string;
  initialRiderData: ConstructorParameters<typeof Rider>[0];
  initialContra: ContraMeta;
}

const RESPONSE_CHOICES: { value: Exclude<ContraResponse, ''>; label: string; activeClass: string }[] = [
  { value: 'cubro', label: 'Cubro igual', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'alternativa', label: 'Alternativa', activeClass: 'bg-violet-600 text-white border-violet-600' },
  { value: 'no_puedo', label: 'No puedo', activeClass: 'bg-rose-600 text-white border-rose-600' },
  { value: 'pregunta', label: 'Pregunta', activeClass: 'bg-amber-500 text-white border-amber-500' },
];

const MODULE_FILTERS: { id: 'todos' | RiderType; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'tecnico', label: 'Técnico' },
  { id: 'hospitality', label: 'Hospitality' },
  { id: 'seguridad', label: 'Seguridad' },
];

export function ContraRiderClient({ showId, initialRiderData, initialContra }: ContraRiderClientProps) {
  const [rider, setRider] = useState<Rider>(() => new Rider(initialRiderData));
  const [lines, setLines] = useState<ContraLine[]>(initialContra.lines);
  const [contraStatus, setContraStatus] = useState(initialContra.status);
  const [version, setVersion] = useState(initialContra.version);
  const [moduleFilter, setModuleFilter] = useState<'todos' | RiderType>('todos');
  const [mobileTab, setMobileTab] = useState<MobileTab>('contra');
  const [readSectionIds, setReadSectionIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const requestId = useRef(0);
  const linesRef = useRef(lines);
  linesRef.current = lines;

  const readableTypes = rider.getReadableTypes();
  const visibleLines = lines.filter((line) => moduleFilter === 'todos' || line.module === moduleFilter);
  const blockReason = sendBlockReason(lines);
  const answered = lines.filter((line) => line.response).length;

  const statusLabel = useMemo(() => {
    if (contraStatus === 'sent' && version > 0) return `Enviado v${version}`;
    if (version > 0) return `Borrador sobre v${version}`;
    return 'Borrador';
  }, [contraStatus, version]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3200);
  };

  const persist = async (intent: 'draft' | 'send', snapshot: ContraLine[]) => {
    const id = ++requestId.current;
    if (intent === 'draft') setSaveState('saving');
    const response = await fetch(`/api/promotor/shows/${showId}/contra-rider`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, answers: answersFromLines(snapshot) }),
    });
    const data = await response.json().catch(() => ({}));
    if (id !== requestId.current) return data;
    if (!response.ok) {
      if (intent === 'draft') setSaveState('error');
      throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo guardar');
    }
    if (data.contra) {
      setContraStatus(data.contra.status);
      setVersion(data.contra.version);
    }
    if (intent === 'draft') setSaveState('saved');
    return data;
  };

  const scheduleSave = (snapshot: ContraLine[]) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      persist('draft', snapshot).catch(() => showToast('No se pudo guardar el borrador'));
    }, 700);
  };

  const updateLine = (id: string, patch: Partial<ContraLine>) => {
    setLines((current) => {
      const next = current.map((line) => (line.id === id ? { ...line, ...patch } : line));
      setContraStatus('draft');
      scheduleSave(next);
      return next;
    });
  };

  const focusSection = (line: ContraLine) => {
    if (rider.type !== line.module) {
      const updated = new Rider(rider);
      updated.switchType(line.module);
      setRider(updated);
    }
    setMobileTab('document');
    window.setTimeout(() => {
      document.getElementById(line.sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const send = async () => {
    const reason = sendBlockReason(linesRef.current);
    if (reason || isSending) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setIsSending(true);
    try {
      await persist('send', linesRef.current);
      showToast('Contra-rider enviado');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo enviar');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-[#f8f9fa] text-slate-900 flex flex-col">
      <Toast message={toastMessage} />
      <Header
        pageType="promotor"
        riderType={rider.type}
        onSelectRiderType={readableTypes.length > 1 ? (type) => {
          const updated = new Rider(rider);
          updated.switchType(type);
          setRider(updated);
          setMobileTab('document');
        } : undefined}
        visibleModuleTypes={readableTypes}
      />

      <div className="flex-1 flex overflow-hidden">
        <section className={`h-full min-w-0 flex-col pb-16 xl:pb-0 ${mobileTab === 'contra' ? 'flex flex-1' : 'hidden'} xl:flex xl:flex-1 xl:max-w-[58%]`}>
          <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full">
                Contra-rider
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                {statusLabel}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {saveState === 'saving' ? 'Guardando…' : saveState === 'saved' ? 'Borrador guardado' : saveState === 'error' ? 'Sin guardar' : `${answered}/${lines.length} respondidos`}
              </span>
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-slate-900 truncate">
              {rider.artistName || 'Artista'}
            </h1>
            <p className="text-xs font-semibold text-slate-500 truncate">
              {[rider.season, rider.venue, rider.version].filter(Boolean).join(' · ') || rider.title}
            </p>
            <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
              {MODULE_FILTERS.filter((filter) => filter.id === 'todos' || readableTypes.includes(filter.id)).map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setModuleFilter(filter.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 cursor-pointer active:scale-95 transition-all ${
                    moduleFilter === filter.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
            <div className="bg-white border border-slate-200/80 rounded-[28px] shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] divide-y divide-slate-100">
            {visibleLines.map((line, index) => {
              const detailLabel = line.response === 'alternativa'
                ? 'Oferta'
                : line.response === 'no_puedo'
                  ? 'Motivo'
                  : 'Pregunta';
              const detailValue = line.response === 'alternativa' ? line.offer : line.note;
              const detailPlaceholder = line.response === 'alternativa'
                ? 'El equipo o la condición que propones'
                : line.response === 'no_puedo'
                  ? 'Por qué no se puede cumplir'
                  : 'Qué dato te falta para responder';
              return (
                <article key={line.id} className="px-4 sm:px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="mt-0.5 text-[11px] font-black tabular-nums text-slate-300">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-sm font-extrabold text-slate-900 leading-snug">
                          {line.sectionTitle}
                        </h2>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {line.moduleLabel}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => focusSection(line)}
                      className="shrink-0 mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-violet-700 cursor-pointer"
                    >
                      <Icon name="eye" className="w-3.5 h-3.5" />
                      Documento
                    </button>
                  </div>
                  <p className="mt-3 sm:ml-8 text-[13px] leading-relaxed text-slate-600 whitespace-pre-wrap line-clamp-3">
                    {line.pedido}
                  </p>
                  <div className="mt-4 sm:ml-8 flex flex-wrap gap-1.5">
                    {RESPONSE_CHOICES.map((choice) => {
                      const selected = line.response === choice.value;
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          onClick={() => updateLine(line.id, { response: selected ? '' : choice.value })}
                          className={`h-8 px-3 rounded-full border text-xs font-bold cursor-pointer active:scale-95 transition-colors ${
                            selected
                              ? choice.activeClass
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800'
                          }`}
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                  {line.response && line.response !== 'cubro' ? (
                    <label className="mt-3 sm:ml-8 block">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{detailLabel}</span>
                      <textarea
                        value={detailValue}
                        onChange={(event) => updateLine(
                          line.id,
                          line.response === 'alternativa'
                            ? { offer: event.target.value }
                            : { note: event.target.value }
                        )}
                        rows={2}
                        placeholder={detailPlaceholder}
                        className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                      />
                    </label>
                  ) : null}
                </article>
              );
            })}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-slate-500 min-w-0">
              {blockReason || 'El envío congela esta versión. El rider del artista no cambia.'}
            </p>
            <button
              type="button"
              onClick={send}
              disabled={Boolean(blockReason) || isSending}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white h-10 px-4 rounded-full text-xs font-bold shadow-md shadow-violet-500/25 flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <Icon name="send" className="w-3.5 h-3.5" />
              {isSending ? 'Enviando…' : 'Enviar contra-rider'}
            </button>
          </div>
        </section>

        <section className={`h-full min-w-0 border-l border-slate-200/80 bg-[#f8f9fa] ${mobileTab === 'document' ? 'flex flex-1' : 'hidden'} xl:flex xl:flex-1`}>
          <DocumentEditorPanel
            readOnly
            riderTitle={rider.title}
            artistName={rider.artistName}
            season={rider.season}
            riderType={rider.type}
            sections={rider.sections}
            channels={rider.channels}
            completedSectionIds={readSectionIds}
            onToggleComplete={(id) => {
              setReadSectionIds((current) => (
                current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
              ));
            }}
            onEditSection={() => {}}
            onUpdateChannel={() => {}}
            onAddChannel={() => {}}
            onDeleteChannel={() => {}}
            onExport={() => {}}
            onOpenStagePlot={() => {}}
            stagePlot={rider.stagePlot}
          />
        </section>
      </div>

      <nav
        aria-label="Navegación del promotor"
        className="xl:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex"
      >
        <button
          type="button"
          onClick={() => setMobileTab('contra')}
          className={`flex-1 py-1.5 rounded-2xl flex flex-col items-center gap-0.5 ${
            mobileTab === 'contra' ? 'text-violet-600 bg-violet-50 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Icon name="fileCheck" className="w-4 h-4" />
          <span className="text-[10px]">Contra-rider</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('document')}
          className={`flex-1 py-1.5 rounded-2xl flex flex-col items-center gap-0.5 ${
            mobileTab === 'document' ? 'text-violet-600 bg-violet-50 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Icon name="fileText" className="w-4 h-4" />
          <span className="text-[10px]">Rider</span>
        </button>
      </nav>
    </div>
  );
}
