"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '../common/Icon';
import { AgentRole } from '@/core/types/agent.types';
import { ChatAttachment, ChatMessageItem, ChatSessionSummary } from '@/core/types/chat.types';
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  readChatAttachment
} from '@/core/utils/chat-attachments';
import { RiderType } from '@/core/types/rider.types';
import { AGENT_PROFILES, AGENT_INFO, SAMPLE_FAQS } from '@/core/constants/agent-profiles';

interface ChatViewProps {
  sessions: ChatSessionSummary[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  activeAgent: AgentRole;
  onSelectAgent: (role: AgentRole) => void;
  messages: ChatMessageItem[];
  isThinking: boolean;
  onSendMessage: (text: string, attachments?: ChatAttachment[]) => void;
  availableRiders?: Array<{ id: string; title: string; artist: string; type: string }>;
  onLinkRider?: (sessionId: string, riderId: string | null) => void;
  onCreateRider?: (artistName: string, type: RiderType) => Promise<string | null>;
}

export function ChatView({
  sessions,
  currentSessionId,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  activeAgent,
  onSelectAgent,
  messages,
  isThinking,
  onSendMessage,
  availableRiders,
  onLinkRider,
  onCreateRider
}: ChatViewProps) {
  const [inputVal, setInputVal] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [attachError, setAttachError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [isCreatingRider, setIsCreatingRider] = useState(false);
  const [newRiderName, setNewRiderName] = useState('');
  const [newRiderType, setNewRiderType] = useState<RiderType>('tecnico');
  const [isSubmittingRider, setIsSubmittingRider] = useState(false);

  // Drawer de conversaciones en móvil
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeSession = sessions.find(s => s.id === currentSessionId);

  const handleCreateRiderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiderName.trim() || isSubmittingRider || !onCreateRider) return;

    setIsSubmittingRider(true);
    try {
      const createdId = await onCreateRider(newRiderName.trim(), newRiderType);
      if (createdId) {
        setIsCreatingRider(false);
        setNewRiderName('');
        setShowLinkMenu(false);
      }
    } finally {
      setIsSubmittingRider(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isThinking) return;
    if (!inputVal.trim() && attachments.length === 0) return;
    onSendMessage(inputVal.trim(), attachments);
    setInputVal('');
    setAttachments([]);
    setAttachError('');
  };

  const handleAttachFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      setAttachError(`Solo puedes adjuntar hasta ${MAX_ATTACHMENTS} archivos.`);
      return;
    }

    const selected = Array.from(fileList).slice(0, remaining);
    if (fileList.length > remaining) {
      setAttachError(`Solo puedes adjuntar hasta ${MAX_ATTACHMENTS} archivos.`);
    } else {
      setAttachError('');
    }

    const next: ChatAttachment[] = [];
    for (const file of selected) {
      try {
        next.push(await readChatAttachment(file));
      } catch (err) {
        setAttachError(err instanceof Error ? err.message : 'No se pudo adjuntar el archivo.');
      }
    }
    if (next.length) setAttachments((prev) => [...prev, ...next]);
  };

  const removeAttachment = (id: string) => {
    setAttachError('');
    setAttachments((prev) => {
      const target = prev.find((file) => file.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((file) => file.id !== id);
    });
  };

  const profile = AGENT_PROFILES[activeAgent];
  const info = AGENT_INFO[activeAgent];

  // Componente reutilizable para el contenido de la barra lateral (Desktop & Mobile Drawer)
  const renderSidebarContent = (isMobile = false) => (
    <>
      <div className="p-3.5 sm:p-4 border-b border-slate-200/60 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Conversaciones
          </h3>
          <p className="text-[10px] text-slate-400">
            Historial de consultas ({sessions.length})
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              onNewSession();
              if (isMobile) setIsMobileSidebarOpen(false);
            }}
            className="text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs"
            title="Iniciar nueva consulta"
          >
            <Icon name="plus" className="w-3.5 h-3.5" />
            <span>Nuevo</span>
          </button>
          {isMobile && (
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold ml-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Lista de Sesiones */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 overscroll-contain">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 space-y-2">
            <p>No hay conversaciones activas.</p>
            <button
              onClick={() => {
                onNewSession();
                if (isMobile) setIsMobileSidebarOpen(false);
              }}
              className="text-xs font-bold text-violet-600 hover:underline cursor-pointer"
            >
              + Iniciar primera conversación
            </button>
          </div>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === currentSessionId;
            return (
              <div
                key={s.id}
                onClick={() => {
                  onSelectSession(s.id);
                  if (isMobile) setIsMobileSidebarOpen(false);
                }}
                className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isActive
                    ? 'bg-violet-50/90 border-violet-200 shadow-xs ring-1 ring-violet-200/50'
                    : 'bg-white hover:bg-slate-50 border-slate-200/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500 group-hover:bg-violet-50 group-hover:text-violet-600'
                  }`}>
                    <Icon name="messageSquare" className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="block text-xs font-bold text-slate-800 truncate">
                      {s.title}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-400">
                        {s.date}
                      </span>
                      {s.riderInfo && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 border border-violet-200/60 truncate max-w-[120px]">
                          🎸 {s.riderInfo.artistName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones: Borrar (visible en touch móvil) y Estado */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => onDeleteSession(s.id, e)}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all cursor-pointer"
                    title="Eliminar conversación"
                  >
                    <Icon name="trash" className="w-3.5 h-3.5" />
                  </button>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* 1. Sidebar Desktop (visible en pantallas >= 768px) */}
      <aside className="hidden md:flex w-80 border-r border-slate-200/80 bg-white/70 backdrop-blur-md flex-col shrink-0 select-none">
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Drawer Móvil Deslizable (pantallas < 768px) */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="relative w-4/5 max-w-xs h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Flujo de Conversación Principal */}
      <main className="flex-1 flex flex-col bg-[#f8f9fa] overflow-hidden min-w-0">
        {/* Banner del Agente & Rider Vinculado adaptado a móviles */}
        <div className="h-14 px-3 sm:px-6 border-b border-slate-200/60 bg-white flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Botón para abrir el historial de conversaciones en móvil */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 active:scale-95 transition-all"
              title="Abrir historial de conversaciones"
            >
              <Icon name="list" className="w-4 h-4" />
            </button>

            <span className="text-xl shrink-0">{info.icon}</span>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight truncate">
                {profile.name}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                {profile.title}
              </p>
            </div>
          </div>

          {/* Vínculo con Rider */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              {activeSession?.riderInfo ? (
                <div className="flex items-center gap-1.5 sm:gap-2 bg-violet-50/90 border border-violet-200/80 rounded-2xl px-2 sm:px-3 py-1 sm:py-1.5 shadow-2xs">
                  <div className="w-5 h-5 rounded-lg bg-violet-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    🎸
                  </div>
                  <div className="text-left min-w-0">
                    <span className="hidden sm:block text-[9px] font-black uppercase tracking-wider text-violet-600 leading-tight">
                      Rider Vinculado
                    </span>
                    <span className="block text-xs font-bold text-slate-800 leading-tight truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[180px]">
                      {activeSession.riderInfo.artistName}
                    </span>
                  </div>
                  <Link
                    href={`/workspace?id=${activeSession.riderInfo.id}${currentSessionId ? `&session=${currentSessionId}` : ''}`}
                    className="ml-0.5 sm:ml-1 text-[10px] sm:text-[11px] font-bold text-violet-700 hover:text-violet-900 bg-white hover:bg-violet-100 px-1.5 sm:px-2 py-0.5 rounded-lg transition-all flex items-center gap-0.5 shadow-xs border border-violet-200/60 shrink-0"
                    title="Abrir este rider en Workspace 3 Paneles"
                  >
                    <span className="hidden sm:inline">Workspace</span>
                    <span className="sm:hidden">Doc</span>
                    <span className="text-[9px]">↗</span>
                  </Link>
                  {onLinkRider && (
                    <button
                      onClick={() => setShowLinkMenu(!showLinkMenu)}
                      className="p-1 hover:bg-violet-200/60 rounded-lg text-violet-600 transition-colors cursor-pointer shrink-0"
                      title="Cambiar o desvincular rider"
                    >
                      <Icon name="moreVertical" className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                onLinkRider && (
                  <button
                    onClick={() => setShowLinkMenu(!showLinkMenu)}
                    className="text-xs font-bold text-slate-600 hover:text-violet-700 bg-slate-100/80 hover:bg-violet-50 border border-slate-200/80 px-2.5 sm:px-3 py-1.5 rounded-2xl transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Icon name="link" className="w-3.5 h-3.5 text-violet-600" />
                    <span className="hidden xs:inline">Vincular</span>
                    <span className="text-[10px] text-slate-400">▾</span>
                  </button>
                )
              )}

              {/* Menu desplegable de vinculación responsivo (no se sale en pantallas estrechas) */}
              {showLinkMenu && (
                <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
                  {/* Encabezado del Popover */}
                  <div className="px-1 pb-2 border-b border-slate-100 flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Vincular Rider al Chat
                    </span>
                    <button
                      onClick={() => {
                        setShowLinkMenu(false);
                        setIsCreatingRider(false);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Formulario rápido para Crear Nuevo Rider */}
                  {isCreatingRider ? (
                    <form onSubmit={handleCreateRiderSubmit} className="p-3 bg-violet-50/70 rounded-2xl border border-violet-100 space-y-2.5 mb-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-violet-900 flex items-center gap-1.5">
                          <span>✨</span>
                          <span>Crear Nuevo Rider</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCreatingRider(false)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Artista o Banda
                        </label>
                        <input
                          type="text"
                          autoFocus
                          value={newRiderName}
                          onChange={(e) => setNewRiderName(e.target.value)}
                          placeholder="ej. Carlos Vives, SoundWave..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-base sm:text-xs text-slate-800 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-300"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Tipo de Rider
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['tecnico', 'hospitality', 'seguridad'] as RiderType[]).map((t) => {
                            const isSel = newRiderType === t;
                            const labels = { tecnico: 'Técnico', hospitality: 'Hospitality', seguridad: 'Seguridad' };
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setNewRiderType(t)}
                                className={`py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                  isSel
                                    ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {labels[t]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={!newRiderName.trim() || isSubmittingRider}
                        className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                      >
                        {isSubmittingRider ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Creando...</span>
                          </>
                        ) : (
                          <>
                            <Icon name="plus" className="w-3 h-3" />
                            <span>Crear y Vincular</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="mb-2.5">
                      <button
                        type="button"
                        onClick={() => setIsCreatingRider(true)}
                        className="w-full py-2.5 px-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <Icon name="plus" className="w-3.5 h-3.5" />
                        <span>+ Crear Nuevo Rider</span>
                      </button>
                    </div>
                  )}

                  {/* Lista de Riders Existentes */}
                  {!isCreatingRider && (
                    <>
                      <div className="px-1 py-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {availableRiders && availableRiders.length > 0
                            ? `Riders Guardados (${availableRiders.length}):`
                            : 'Riders Guardados:'}
                        </span>
                      </div>

                      <div className="max-h-48 overflow-y-auto py-1 space-y-1">
                        {availableRiders && availableRiders.length > 0 ? (
                          availableRiders.map((r) => {
                            const isSelected = activeSession?.riderId === r.id;
                            return (
                              <button
                                key={r.id}
                                onClick={() => {
                                  if (onLinkRider) onLinkRider(currentSessionId, r.id);
                                  setShowLinkMenu(false);
                                }}
                                className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-violet-50 text-violet-700 font-bold border border-violet-200/60'
                                    : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                                }`}
                              >
                                <div className="truncate pr-2">
                                  <span className="block font-bold truncate">{r.artist}</span>
                                  <span className="block text-[10px] text-slate-400 truncate">{r.title}</span>
                                </div>
                                {isSelected && <span className="text-violet-600 font-bold text-xs">✓</span>}
                              </button>
                            );
                          })
                        ) : (
                          <div className="py-4 px-2 text-center text-xs text-slate-400 space-y-1 bg-slate-50/60 rounded-2xl border border-slate-100">
                            <p className="font-semibold text-slate-500">No hay riders creados aún.</p>
                            <p className="text-[11px] text-slate-400">Pulsa el botón superior para crear el primero.</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Desvincular si hay rider activo */}
                  {activeSession?.riderId && onLinkRider && !isCreatingRider && (
                    <div className="pt-2 mt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          onLinkRider(currentSessionId, null);
                          setShowLinkMenu(false);
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        Desvincular Rider de este Chat
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mensajes con padding responsivo */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 max-w-4xl w-full mx-auto overscroll-contain">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-8 space-y-3 sm:space-y-4 text-slate-400">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center text-2xl sm:text-3xl shadow-xs">
                {info.icon}
              </div>
              <div className="max-w-md">
                <h3 className="text-sm sm:text-base font-black text-slate-800">
                  {profile.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {profile.desc}
                </p>
              </div>

              <div className="w-full max-w-lg pt-3 space-y-2 text-left">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Preguntas Frecuentes Sugeridas:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAMPLE_FAQS.map((faq, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSendMessage(faq)}
                      className="text-left text-xs p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-violet-50/80 text-slate-700 hover:text-violet-900 border border-slate-200/70 hover:border-violet-200 transition-all shadow-xs cursor-pointer active:scale-98"
                    >
                      &quot;{faq}&quot;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isAi = m.sender === 'ai';

              return (
                <div
                  key={idx}
                  className={`flex gap-2 sm:gap-3 ${isAi ? 'items-start' : 'items-end flex-row-reverse'}`}
                >
                  {isAi && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-xs sm:text-sm shrink-0 border border-violet-200/50">
                      {m.roleAvatar || info.icon}
                    </div>
                  )}
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl sm:rounded-3xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm leading-relaxed ${
                      isAi
                        ? 'bg-white border border-slate-200/80 text-slate-800 shadow-xs'
                        : 'bg-violet-600 text-white font-medium shadow-md shadow-violet-500/10'
                    }`}
                  >
                    {isAi && m.roleName && (
                      <span className="block text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        {m.roleName}
                      </span>
                    )}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {m.attachments.map((file) => (
                          <span
                            key={file.id}
                            className={`inline-flex items-center gap-1.5 max-w-full rounded-xl px-1.5 py-1 text-[11px] font-semibold ${
                              isAi ? 'bg-slate-100 text-slate-700' : 'bg-white/15 text-white'
                            }`}
                          >
                            {file.kind === 'image' && file.previewUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={file.previewUrl} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                            ) : (
                              <Icon name="fileText" className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className="truncate max-w-[160px]">{file.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {m.text ? <p className="whitespace-pre-line">{m.text}</p> : null}
                    <span className={`block text-[9px] sm:text-[10px] mt-1 text-right ${isAi ? 'text-slate-400' : 'text-violet-200'}`}>
                      {m.time}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {isThinking && (
            <div className="flex items-center gap-2.5 text-slate-400 text-xs py-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-600 animate-ping" />
              <span className="text-xs font-semibold text-slate-600">
                {profile.name} está redactando respuesta...
              </span>
            </div>
          )}
        </div>

        {/* Input Bar con safe-area inferior */}
        <div className="p-3 sm:p-4 bg-white/90 backdrop-blur-md border-t border-slate-200/60 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex flex-col gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-1.5 sm:p-2 focus-within:border-violet-500 focus-within:bg-white transition-all shadow-xs">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1 pt-0.5">
                {attachments.map((file) => (
                  <span
                    key={file.id}
                    className="inline-flex items-center gap-1.5 max-w-full rounded-xl bg-white border border-slate-200 pl-1.5 pr-1 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    {file.kind === 'image' && file.previewUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={file.previewUrl} alt="" className="w-6 h-6 rounded-lg object-cover shrink-0" />
                    ) : (
                      <Icon name="fileText" className="w-3.5 h-3.5 shrink-0 text-violet-600" />
                    )}
                    <span className="truncate max-w-[160px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(file.id)}
                      className="w-5 h-5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      aria-label={`Quitar ${file.name}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            {attachError && (
              <p className="px-2 text-[11px] font-medium text-rose-600">{attachError}</p>
            )}
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={`Escribe a ${profile.name}...`}
              className="w-full bg-transparent text-base sm:text-sm text-slate-800 placeholder-slate-400 px-2 sm:px-3 py-1.5 outline-none font-medium"
              disabled={isThinking}
            />
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  void handleAttachFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isThinking}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40"
                title="Adjuntar imagen, PDF o documento"
                aria-label="Adjuntar archivo"
              >
                <Icon name="paperclip" className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto">
                {(['master', 'audio_foh', 'hospitality', 'security'] as AgentRole[]).map((role) => {
                  const active = activeAgent === role;
                  const labels: Record<AgentRole, string> = {
                    master: '🧠 Master',
                    audio_foh: '🎛️ Audio',
                    hospitality: '☕ Hosp.',
                    security: '🛡️ Seg.'
                  };

                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => onSelectAgent(role)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        active
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {labels[role]}
                    </button>
                  );
                })}
              </div>
              <button
                type="submit"
                disabled={(!inputVal.trim() && attachments.length === 0) || isThinking}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <span className="hidden xs:inline">Enviar</span>
                <Icon name="send" className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
