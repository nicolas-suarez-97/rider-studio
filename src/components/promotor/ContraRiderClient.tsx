"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/common/Header';
import { Icon } from '@/components/common/Icon';
import { Toast } from '@/components/common/Toast';
import { ContraCross } from '@/components/promotor/ContraCross';
import { InventoryStep } from '@/components/promotor/InventoryStep';
import { PromotorAssistant } from '@/components/promotor/PromotorAssistant';
import { DocumentEditorPanel } from '@/components/workspace/DocumentEditorPanel';
import { Rider } from '@/core/models/Rider';
import { AgentRole } from '@/core/types/agent.types';
import {
  ContraFinding,
  ContraLine,
  ContraResponse,
  PromotorChatMessage,
  PromotorFileView,
} from '@/core/types/contra-rider.types';
import { RiderType } from '@/core/types/rider.types';
import { answersFromLines, sendBlockReason } from '@/lib/promotor/contra-rider';
import { downloadContraRiderFile, sourcesFromGeneratePrompt, sourcesFromReviewPrompt } from '@/lib/promotor/contra-file';
import { formatAttachmentSize } from '@/core/utils/chat-attachments';

type MobileTab = 'contra' | 'cross' | 'document' | 'assistant';
type SidePanel = 'none' | 'cross' | 'document' | 'chat';

interface ContraMeta {
  status: 'draft' | 'sent';
  version: number;
  sentAt: string | null;
  lines: ContraLine[];
}

interface AssistantMeta {
  sessionId: string | null;
  files: PromotorFileView[];
  submitted: PromotorFileView | null;
  messages: PromotorChatMessage[];
}

const MAX_INVENTORY_FILES = 5;
const INVENTORY_EXTENSIONS = new Set(['pdf', 'txt', 'md', 'docx']);

interface ContraRiderClientProps {
  showId: string;
  initialRiderData: ConstructorParameters<typeof Rider>[0];
  initialContra: ContraMeta;
  initialAssistant: AssistantMeta;
  initialPrompt?: string | null;
}

const RESPONSE_CHOICES: { value: Exclude<ContraResponse, ''>; label: string; activeClass: string }[] = [
  { value: 'cubro', label: 'Aprobado', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'alternativa', label: 'Alternativa', activeClass: 'bg-violet-600 text-white border-violet-600' },
  { value: 'no_puedo', label: 'Rechazado', activeClass: 'bg-rose-600 text-white border-rose-600' },
  { value: 'pregunta', label: 'Pregunta', activeClass: 'bg-amber-500 text-white border-amber-500' },
];

function lineGap(line: Pick<ContraLine, 'response' | 'offer' | 'note'>): 'oferta' | 'nota' | null {
  if (line.response === 'alternativa' && !line.offer.trim()) return 'oferta';
  if (line.response === 'no_puedo' && !line.note.trim()) return 'nota';
  return null;
}

function crossFromMessages(messages: PromotorChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const review = messages[index]?.review;
    if (!review?.findings?.length) continue;
    const previous = messages[index - 1]?.text;
    return {
      review,
      sources: [...sourcesFromGeneratePrompt(previous), ...sourcesFromReviewPrompt(previous)],
    };
  }
  return null;
}

const MODULE_FILTERS: { id: 'todos' | RiderType; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'tecnico', label: 'Técnico' },
  { id: 'hospitality', label: 'Hospitality' },
  { id: 'seguridad', label: 'Seguridad' },
];

export function ContraRiderClient({
  showId,
  initialRiderData,
  initialContra,
  initialAssistant,
  initialPrompt = null,
}: ContraRiderClientProps) {
  const [rider, setRider] = useState<Rider>(() => new Rider(initialRiderData));
  const [lines, setLines] = useState<ContraLine[]>(initialContra.lines);
  const [contraStatus, setContraStatus] = useState(initialContra.status);
  const [version, setVersion] = useState(initialContra.version);
  const [moduleFilter, setModuleFilter] = useState<'todos' | RiderType>('todos');
  const [mobileTab, setMobileTab] = useState<MobileTab>('contra');
  const [readSectionIds, setReadSectionIds] = useState<string[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentRole>('master');
  const [assistantMessages, setAssistantMessages] = useState<PromotorChatMessage[]>(initialAssistant.messages);
  const [assistantFiles, setAssistantFiles] = useState<PromotorFileView[]>(initialAssistant.files);
  const [submittedFile, setSubmittedFile] = useState<PromotorFileView | null>(initialAssistant.submitted);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [keptNames, setKeptNames] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(initialAssistant.sessionId);
  const [side, setSide] = useState<SidePanel>(() => (crossFromMessages(initialAssistant.messages) ? 'cross' : 'none'));
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState('está revisando el rider...');
  const [highlightedLineId, setHighlightedLineId] = useState<string | null>(null);
  const [appliedLineIds, setAppliedLineIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const requestId = useRef(0);
  const linesRef = useRef(lines);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const prompted = useRef(false);
  linesRef.current = lines;

  const readableTypes = rider.getReadableTypes();
  const visibleLines = lines.filter((line) => moduleFilter === 'todos' || line.module === moduleFilter);
  const blockReason = sendBlockReason(lines);
  const cross = useMemo(() => crossFromMessages(assistantMessages), [assistantMessages]);
  const answered = lines.filter((line) => line.response).length;
  const reviewedPercent = lines.length ? Math.round((answered / lines.length) * 100) : 0;
  const lineNumbers = useMemo(() => {
    const map: Record<string, string> = {};
    lines.forEach((line, index) => {
      map[line.id] = String(index + 1).padStart(2, '0');
    });
    return map;
  }, [lines]);
  const inventoryItems = [
    ...assistantFiles
      .filter((file) => keptNames.includes(file.name))
      .map((file) => ({
        id: `stored:${file.name}`,
        name: file.name,
        size: file.size,
        detail: file.hasText ? 'texto leído' : 'sin texto',
      })),
    ...pendingFiles.map((file) => ({
      id: `pending:${file.name}`,
      name: file.name,
      size: file.size,
      detail: 'se leerá al generar',
    })),
  ];

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
    setSide('document');
    setMobileTab('document');
    window.setTimeout(() => {
      document.getElementById(line.sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const focusBlocker = () => {
    const target = lines.find((line) => lineGap(line)) ?? lines.find((line) => !line.response);
    if (!target) return;
    if (moduleFilter !== 'todos' && moduleFilter !== target.module) setModuleFilter('todos');
    setMobileTab('contra');
    window.setTimeout(() => {
      document.getElementById(`contra-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  const pushAssistant = (message: PromotorChatMessage) => {
    setAssistantMessages((current) => [...current, message]);
  };

  const askAssistant = async (text: string) => {
    if (isThinking) return;
    const history = [
      ...assistantMessages,
      { sender: 'user' as const, text, createdAt: new Date().toISOString() },
    ];
    setAssistantMessages(history);
    setSide('chat');
    setMobileTab('assistant');
    setThinkingLabel('está revisando el rider...');
    setIsThinking(true);
    try {
      const response = await fetch(`/api/promotor/shows/${showId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'message',
          activeAgent,
          sessionId: sessionId || undefined,
          messages: history.map((message) => ({
            role: message.sender === 'user' ? 'user' : 'assistant',
            content: message.text,
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo consultar');
      if (typeof data.sessionId === 'string') setSessionId(data.sessionId);
      pushAssistant({
        sender: 'ai',
        text: data.reply || 'No encuentro ese dato en el rider.',
        createdAt: new Date().toISOString(),
        roleName: data.roleName,
        roleAvatar: data.roleAvatar,
        review: data.review || null,
      });
    } catch (error) {
      pushAssistant({
        sender: 'ai',
        text: 'No pude consultar el rider. Intenta de nuevo.',
        createdAt: new Date().toISOString(),
      });
      showToast(error instanceof Error ? error.message : 'No se pudo consultar');
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    if (!initialPrompt || prompted.current) return;
    prompted.current = true;
    const clean = `/promotor/shows/${showId}/contra-rider`;
    window.history.replaceState({ ...window.history.state, as: clean, url: clean }, '', clean);
    void askAssistant(initialPrompt);
    // Se consume una sola vez al entrar con ?prompt=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, showId]);

  const openInventory = () => {
    if (isThinking || inventoryOpen) return;
    setKeptNames(assistantFiles.map((file) => file.name));
    setPendingFiles([]);
    setInventoryOpen(true);
    setMobileTab('contra');
  };

  const addInventoryFiles = (incoming: File[]) => {
    let kept = [...keptNames];
    let pending = [...pendingFiles];
    for (const file of incoming) {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      if (extension === 'doc') {
        showToast('El formato .doc no se puede leer. Guárdalo como .docx, PDF o texto.');
        continue;
      }
      if (!INVENTORY_EXTENSIONS.has(extension)) {
        showToast('Usa PDF, Word o texto.');
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        showToast('El archivo supera el límite de 8 MB.');
        continue;
      }
      kept = kept.filter((name) => name !== file.name);
      pending = pending.filter((item) => item.name !== file.name);
      if (kept.length + pending.length >= MAX_INVENTORY_FILES) {
        showToast('Puedes usar hasta 5 archivos.');
        break;
      }
      pending.push(file);
    }
    setKeptNames(kept);
    setPendingFiles(pending);
  };

  const removeInventoryItem = (id: string) => {
    if (id.startsWith('stored:')) {
      const name = id.slice('stored:'.length);
      setKeptNames((current) => current.filter((item) => item !== name));
      return;
    }
    const name = id.slice('pending:'.length);
    setPendingFiles((current) => current.filter((file) => file.name !== name));
  };

  const generateInventory = async () => {
    if (isThinking) return;
    const kept = assistantFiles.filter((file) => keptNames.includes(file.name));
    if (kept.length + pendingFiles.length === 0) return;
    if (
      assistantFiles.length > 0
      && !window.confirm('Esto arma otro archivo de contra-rider en el mismo hilo. Las pastillas que ya marcaste se quedan.')
    ) return;

    const names = [...kept.map((file) => file.name), ...pendingFiles.map((file) => file.name)];
    setInventoryOpen(false);
    setSide('cross');
    setMobileTab('cross');
    pushAssistant({
      sender: 'user',
      text: `Genera el contra-rider con: ${names.join(', ')}.`,
      createdAt: new Date().toISOString(),
    });
    setThinkingLabel('está cruzando tus datos con el rider...');
    setIsThinking(true);
    try {
      const form = new FormData();
      pendingFiles.forEach((file) => form.append('files', file));
      form.set('keep', JSON.stringify(kept.map((file) => file.name)));
      form.set('activeAgent', activeAgent);
      if (sessionId) form.set('sessionId', sessionId);
      const response = await fetch(`/api/promotor/shows/${showId}/chat`, { method: 'POST', body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo leer el inventario');
      if (typeof data.sessionId === 'string') setSessionId(data.sessionId);
      if (Array.isArray(data.files)) setAssistantFiles(data.files);
      setPendingFiles([]);
      if (data.review?.findings?.length) {
        downloadContraRiderFile({
          artistName: rider.artistName,
          sources: names,
          findings: data.review.findings,
          summary: data.review.summary,
        });
      }
      pushAssistant({
        sender: 'ai',
        text: data.reply || 'No pude armar la propuesta.',
        createdAt: new Date().toISOString(),
        roleName: data.roleName,
        roleAvatar: data.roleAvatar,
        review: data.review || null,
      });
    } catch (error) {
      pushAssistant({
        sender: 'ai',
        text: error instanceof Error ? error.message : 'No se pudo leer el inventario.',
        createdAt: new Date().toISOString(),
      });
      showToast(error instanceof Error ? error.message : 'No se pudo leer el inventario');
    } finally {
      setIsThinking(false);
    }
  };

  const uploadSubmitted = async (file: File) => {
    if (isThinking) return;
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (extension === 'doc') {
      showToast('El formato .doc no se puede leer. Guárdalo como .docx, PDF o texto.');
      return;
    }
    if (!INVENTORY_EXTENSIONS.has(extension)) {
      showToast('Usa PDF, Word o texto.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('El archivo supera el límite de 8 MB.');
      return;
    }
    if (
      submittedFile
      && !window.confirm('Reemplazar el contra-rider subido y revisar de nuevo? Las pastillas que ya marcaste se quedan.')
    ) return;

    setSide('cross');
    setMobileTab('cross');
    pushAssistant({
      sender: 'user',
      text: `Revisa el contra-rider «${file.name}».`,
      createdAt: new Date().toISOString(),
    });
    setThinkingLabel('está comparando el contra-rider...');
    setIsThinking(true);
    try {
      const form = new FormData();
      form.set('intent', 'review');
      form.set('file', file);
      form.set('activeAgent', activeAgent);
      if (sessionId) form.set('sessionId', sessionId);
      const response = await fetch(`/api/promotor/shows/${showId}/chat`, { method: 'POST', body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo leer el contra-rider');
      if (typeof data.sessionId === 'string') setSessionId(data.sessionId);
      setSubmittedFile(data.submitted ?? null);
      pushAssistant({
        sender: 'ai',
        text: data.reply || 'No pude revisar el contra-rider.',
        createdAt: new Date().toISOString(),
        roleName: data.roleName,
        roleAvatar: data.roleAvatar,
        review: data.review || null,
      });
    } catch (error) {
      pushAssistant({
        sender: 'ai',
        text: error instanceof Error ? error.message : 'No se pudo leer el contra-rider.',
        createdAt: new Date().toISOString(),
      });
      showToast(error instanceof Error ? error.message : 'No se pudo leer el contra-rider');
    } finally {
      setIsThinking(false);
    }
  };

  const removeSubmitted = async () => {
    if (isThinking || !submittedFile) return;
    if (!window.confirm('Quitar el contra-rider subido? Las próximas respuestas ya no lo verán.')) return;
    const previous = submittedFile;
    setSubmittedFile(null);
    const response = await fetch(`/api/promotor/shows/${showId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'remove-submitted' }),
    });
    if (!response.ok) {
      setSubmittedFile(previous);
      showToast('No se pudo quitar el archivo');
    }
  };

  const removeStoredFile = async (name: string) => {
    if (isThinking) return;
    if (!window.confirm('Quitar este archivo? Las próximas respuestas ya no lo usarán.')) return;
    const previous = assistantFiles;
    setAssistantFiles((current) => current.filter((file) => file.name !== name));
    const response = await fetch(`/api/promotor/shows/${showId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'remove-file', name }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setAssistantFiles(previous);
      showToast('No se pudo quitar el archivo');
      return;
    }
    if (Array.isArray(data.files)) setAssistantFiles(data.files);
  };

  const applyFinding = (finding: ContraFinding) => {
    const line = linesRef.current.find((item) => item.id === finding.lineId);
    if (!line) {
      showToast('Ese pedido no está en este rider.');
      return;
    }
    if (line.response && !window.confirm('Esta fila ya tiene respuesta. ¿Reemplazarla?')) return;
    updateLine(finding.lineId, {
      response: finding.suggestedResponse,
      offer: finding.suggestedResponse === 'alternativa' ? finding.suggestedText : line.offer,
      note: finding.suggestedResponse === 'no_puedo' || finding.suggestedResponse === 'pregunta'
        ? finding.suggestedText
        : line.note,
    });
    setAppliedLineIds((current) => current.includes(finding.lineId) ? current : [...current, finding.lineId]);
    setHighlightedLineId(finding.lineId);
    window.setTimeout(() => setHighlightedLineId((current) => current === finding.lineId ? null : current), 2500);
    if (window.matchMedia('(max-width: 1279px)').matches) setMobileTab('contra');
    window.setTimeout(() => {
      document.getElementById(`contra-${finding.lineId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const applyCovered = (findings: ContraFinding[]) => {
    const targets = findings.filter((finding) => {
      if (finding.verdict !== 'cumple' && finding.suggestedResponse !== 'cubro') return false;
      const line = linesRef.current.find((item) => item.id === finding.lineId);
      return Boolean(line && !line.response);
    });
    if (targets.length === 0) {
      showToast('Las filas cubiertas ya tienen respuesta.');
      return;
    }
    setLines((current) => {
      const next = current.map((line) => {
        const finding = targets.find((item) => item.lineId === line.id);
        if (!finding || line.response) return line;
        return { ...line, response: 'cubro' as const };
      });
      setContraStatus('draft');
      scheduleSave(next);
      return next;
    });
    setAppliedLineIds((current) => [...new Set([...current, ...targets.map((item) => item.lineId)])]);
    if (window.matchMedia('(max-width: 1279px)').matches) setMobileTab('contra');
    showToast(targets.length === 1 ? 'Marqué 1 fila como Aprobado.' : `Marqué ${targets.length} filas como Aprobado.`);
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
          setSide('document');
          setMobileTab('document');
        } : undefined}
        visibleModuleTypes={readableTypes}
      />

      <div className="flex-1 flex overflow-hidden">
        <section className={`h-full min-w-0 flex-col pb-16 xl:pb-0 ${mobileTab === 'contra' ? 'flex flex-1' : 'hidden'} xl:flex xl:flex-[1.4] xl:min-w-0`}>
          <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full">
                    Contra-rider
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                    {statusLabel}
                  </span>
                  {saveState !== 'idle' ? (
                    <span className="text-[11px] font-semibold text-slate-400">
                      {saveState === 'saving' ? 'Guardando…' : saveState === 'saved' ? 'Borrador guardado' : 'Sin guardar'}
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-slate-900 truncate">
                  {rider.artistName || 'Artista'}
                </h1>
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {[rider.season, rider.venue, rider.version].filter(Boolean).join(' · ') || rider.title}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openInventory}
                disabled={isThinking || inventoryOpen}
                className="bg-white hover:bg-violet-50 disabled:opacity-40 text-violet-700 border border-violet-200 h-10 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Icon name="sparkles" className="w-3.5 h-3.5" />
                {assistantFiles.length > 0 ? 'Volver a generar' : 'Generar contra-rider'}
              </button>
              {assistantFiles.map((file) => (
                <span key={file.name} className="inline-flex items-center gap-1.5 max-w-[220px] h-8 px-2.5 rounded-full bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 truncate" title={file.name}>
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeStoredFile(file.name)}
                    disabled={isThinking}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600 disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    Quitar
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={isThinking}
                className="bg-white hover:bg-violet-50 disabled:opacity-40 text-violet-700 border border-violet-200 h-10 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Icon name="paperclip" className="w-3.5 h-3.5" />
                Subir contra-rider
              </button>
              {submittedFile ? (
                <span className="inline-flex items-center gap-1.5 max-w-[220px] h-8 px-2.5 rounded-full bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 truncate" title={submittedFile.name}>
                    {submittedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={removeSubmitted}
                    disabled={isThinking}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600 disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    Quitar
                  </button>
                </span>
              ) : null}
              <input
                ref={uploadInputRef}
                type="file"
                accept=".pdf,.txt,.md,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  event.target.value = '';
                  if (next) uploadSubmitted(next);
                }}
              />
              <button
                type="button"
                onClick={send}
                disabled={Boolean(blockReason) || isSending}
                className={`ml-auto h-10 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                  blockReason || isSending
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/25 cursor-pointer active:scale-95'
                }`}
              >
                <Icon name="send" className="w-3.5 h-3.5" />
                {isSending ? 'Enviando…' : 'Enviar contra-rider'}
              </button>
            </div>
            {blockReason ? (
              <button
                type="button"
                onClick={focusBlocker}
                className="mt-2 text-left text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
              >
                {blockReason}
              </button>
            ) : (
              <p className="mt-2 text-[11px] font-semibold text-slate-500">
                El envío congela esta versión. El rider del artista no cambia.
              </p>
            )}
            {!inventoryOpen ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
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
                <div className="ml-auto flex items-center gap-2 min-w-0 w-36 sm:w-48" aria-label="Secciones revisadas">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${reviewedPercent === 100 ? 'bg-emerald-500' : 'bg-violet-600'}`}
                      style={{ width: `${reviewedPercent}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-bold whitespace-nowrap ${reviewedPercent === 100 ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {answered}/{lines.length}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {inventoryOpen ? (
            <InventoryStep
              items={inventoryItems}
              disabled={isThinking}
              onAdd={addInventoryFiles}
              onRemove={removeInventoryItem}
              onCancel={() => {
                setInventoryOpen(false);
                setPendingFiles([]);
              }}
              onGenerate={generateInventory}
            />
          ) : (
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
            <div className="bg-white border border-slate-200/80 rounded-[28px] shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] divide-y divide-slate-100">
            {visibleLines.map((line) => {
              const gap = lineGap(line);
              const detailLabel = gap === 'oferta'
                ? 'Oferta · falta para enviar'
                : gap === 'nota'
                  ? 'Motivo · falta para enviar'
                  : line.response === 'alternativa'
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
                <article
                  key={line.id}
                  id={`contra-${line.id}`}
                  className={`px-4 sm:px-5 py-5 ${
                    gap
                      ? 'bg-rose-50/60 ring-1 ring-inset ring-rose-200'
                      : highlightedLineId === line.id
                        ? 'bg-violet-50/80'
                        : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="mt-0.5 text-[11px] font-black tabular-nums text-slate-300">
                        {lineNumbers[line.id]}
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
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${gap ? 'text-rose-600' : 'text-slate-400'}`}>{detailLabel}</span>
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
                        className={`mt-1.5 w-full resize-none rounded-2xl border px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:bg-white focus:ring-4 ${
                          gap
                            ? 'border-rose-300 bg-white focus:border-rose-400 focus:ring-rose-500/10'
                            : 'border-slate-200 bg-slate-50/70 focus:border-violet-400 focus:ring-violet-500/10'
                        }`}
                      />
                    </label>
                  ) : null}
                </article>
              );
            })}
            </div>
          </div>
          )}
        </section>

        <section className={`h-full min-w-0 min-h-0 border-l border-slate-200/80 bg-[#f8f9fa] pb-16 xl:pb-0 ${mobileTab === 'cross' ? 'flex flex-1' : 'hidden'} ${side === 'cross' ? 'xl:flex xl:flex-1 xl:max-w-[640px] xl:min-w-[360px]' : 'xl:hidden'}`}>
          {cross ? (
            <ContraCross
              artistName={rider.artistName}
              sources={cross.sources}
              findings={cross.review.findings}
              lineNumbers={lineNumbers}
              appliedLineIds={appliedLineIds}
              thinkingLabel={isThinking && side === 'cross' ? thinkingLabel : null}
              onApplyFinding={applyFinding}
              onApplyCovered={applyCovered}
              onOpenDocument={() => {
                setSide('document');
                setMobileTab('document');
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center px-6 text-center">
              <p className="text-sm font-semibold text-slate-500">
                {isThinking ? thinkingLabel : 'El cruce aparece aquí cuando generas el contra-rider.'}
              </p>
            </div>
          )}
        </section>

        {(side === 'document' || mobileTab === 'document') ? (
        <section className={`h-full min-w-0 min-h-0 flex-col border-l border-slate-200/80 bg-[#f8f9fa] pb-16 xl:pb-0 ${mobileTab === 'document' ? 'flex flex-1' : 'hidden'} ${side === 'document' ? 'xl:flex xl:flex-1 xl:max-w-[720px] xl:min-w-[360px]' : 'xl:hidden'}`}>
          {cross ? (
            <div className="shrink-0 px-4 py-2 border-b border-slate-200/80 bg-white/80 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold text-slate-500">Rider del artista, solo lectura</p>
              <button
                type="button"
                onClick={() => {
                  setSide('cross');
                  setMobileTab('cross');
                }}
                className="text-xs font-bold text-violet-700 hover:text-violet-900 cursor-pointer"
              >
                Volver al cruce
              </button>
            </div>
          ) : null}
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
        ) : null}

        <section className={`h-full min-h-0 min-w-0 border-l border-slate-200/80 ${mobileTab === 'assistant' ? 'flex flex-1' : 'hidden'} ${side === 'chat' ? 'xl:flex xl:w-[440px] xl:max-w-[440px] xl:flex-none' : 'xl:flex xl:w-12 xl:flex-none'}`}>
          <PromotorAssistant
            artistName={rider.artistName}
            version={rider.version}
            activeAgent={activeAgent}
            onSelectAgent={setActiveAgent}
            messages={assistantMessages}
            files={assistantFiles}
            submittedFile={submittedFile}
            isThinking={isThinking}
            thinkingLabel={thinkingLabel}
            isCollapsed={side !== 'chat'}
            onToggleCollapse={() => {
              if (side === 'chat') {
                setSide(cross ? 'cross' : 'none');
                return;
              }
              setSide('chat');
              setMobileTab('assistant');
            }}
            onSendMessage={askAssistant}
            onOpenCross={() => {
              setSide('cross');
              setMobileTab('cross');
            }}
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
        {cross ? (
          <button
            type="button"
            onClick={() => {
              setSide('cross');
              setMobileTab('cross');
            }}
            className={`flex-1 py-1.5 rounded-2xl flex flex-col items-center gap-0.5 ${
              mobileTab === 'cross' ? 'text-violet-600 bg-violet-50 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <Icon name="list" className="w-4 h-4" />
            <span className="text-[10px]">Cruce</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setSide('document');
            setMobileTab('document');
          }}
          className={`flex-1 py-1.5 rounded-2xl flex flex-col items-center gap-0.5 ${
            mobileTab === 'document' ? 'text-violet-600 bg-violet-50 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Icon name="fileText" className="w-4 h-4" />
          <span className="text-[10px]">Rider</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSide('chat');
            setMobileTab('assistant');
          }}
          className={`flex-1 py-1.5 rounded-2xl flex flex-col items-center gap-0.5 ${
            mobileTab === 'assistant' ? 'text-violet-600 bg-violet-50 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Icon name="sparkles" className="w-4 h-4" />
          <span className="text-[10px]">Asistente</span>
        </button>
      </nav>
    </div>
  );
}
