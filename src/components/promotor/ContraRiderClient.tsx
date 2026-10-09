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

const RESPONSE_OPTIONS: { value: ContraResponse; label: string }[] = [
  { value: '', label: 'Sin respuesta' },
  { value: 'cubro', label: 'Cubro igual' },
  { value: 'alternativa', label: 'Alternativa' },
  { value: 'no_puedo', label: 'No puedo' },
  { value: 'pregunta', label: 'Pregunta' },
];

const MODULE_FILTERS: { id: 'todos' | RiderType; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'tecnico', label: 'Técnico' },
  { id: 'hospitality', label: 'Hospitality' },
  { id: 'seguridad', label: 'Seguridad' },
];

function responseClass(response: ContraResponse): string {
  if (response === 'cubro') return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  if (response === 'alternativa') return 'border-violet-300 bg-violet-50 text-violet-800';
  if (response === 'no_puedo') return 'border-rose-300 bg-rose-50 text-rose-800';
  if (response === 'pregunta') return 'border-amber-300 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-white text-slate-700';
}

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

          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-3">
            {visibleLines.map((line) => {
              const needsOffer = line.response === 'alternativa' && !line.offer.trim();
              const needsNote = line.response === 'no_puedo' && !line.note.trim();
              return (
                <article
                  key={line.id}
                  className="bg-white border border-slate-200/80 rounded-3xl shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {line.moduleLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => focusSection(line)}
                        className="block text-left text-sm font-extrabold text-slate-900 hover:text-violet-700 cursor-pointer"
                      >
                        {line.sectionTitle}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => focusSection(line)}
                      className="shrink-0 text-[11px] font-bold text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full cursor-pointer active:scale-95"
                    >
                      Ver pedido
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 whitespace-pre-wrap line-clamp-4">
                    {line.pedido}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_1fr]">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Respuesta</span>
                      <select
                        value={line.response}
                        onChange={(event) => updateLine(line.id, { response: event.target.value as ContraResponse })}
                        className={`mt-1 w-full rounded-xl border px-2.5 py-2 text-xs font-bold outline-none cursor-pointer ${responseClass(line.response)}`}
                      >
                        {RESPONSE_OPTIONS.map((option) => (
                          <option key={option.value || 'empty'} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Oferta</span>
                      <textarea
                        value={line.offer}
                        onChange={(event) => updateLine(line.id, { offer: event.target.value })}
                        rows={2}
                        placeholder={line.response === 'alternativa' ? 'Qué ofreces en su lugar' : 'Opcional'}
                        className={`mt-1 w-full resize-none rounded-xl border px-2.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-violet-500 ${
                          needsOffer ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50/60'
                        }`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nota</span>
                      <textarea
                        value={line.note}
                        onChange={(event) => updateLine(line.id, { note: event.target.value })}
                        rows={2}
                        placeholder={line.response === 'no_puedo' ? 'Por qué no se puede cumplir' : 'Opcional'}
                        className={`mt-1 w-full resize-none rounded-xl border px-2.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-violet-500 ${
                          needsNote ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50/60'
                        }`}
                      />
                    </label>
                  </div>
                </article>
              );
            })}
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
