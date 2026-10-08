"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '../common/Icon';
import { AgentRole } from '@/core/types/agent.types';
import { ChatMessageItem, ChatSessionSummary } from '@/core/types/chat.types';
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
  onSendMessage: (text: string) => void;
  availableRiders?: Array<{ id: string; title: string; artist: string; type: string }>;
  onLinkRider?: (sessionId: string, riderId: string | null) => void;
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
  onLinkRider
}: ChatViewProps) {
  const [inputVal, setInputVal] = useState('');
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(s => s.id === currentSessionId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isThinking) return;
    onSendMessage(inputVal.trim());
    setInputVal('');
  };

  const profile = AGENT_PROFILES[activeAgent];
  const info = AGENT_INFO[activeAgent];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar de Conversaciones y Agentes */}
      <aside className="w-80 border-r border-slate-200/80 bg-white/70 backdrop-blur-md flex flex-col shrink-0 select-none">
        <div className="p-4 border-b border-slate-200/60 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Conversaciones
            </h3>
            <p className="text-[10px] text-slate-400">
              Historial de consultas ({sessions.length})
            </p>
          </div>
          <button
            onClick={onNewSession}
            className="text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs"
            title="Iniciar nueva consulta"
          >
            <Icon name="plus" className="w-3.5 h-3.5" />
            <span>Nuevo</span>
          </button>
        </div>

        {/* Lista de Sesiones */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 space-y-2">
              <p>No hay conversaciones activas.</p>
              <button
                onClick={onNewSession}
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
                  onClick={() => onSelectSession(s.id)}
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

                  {/* Acciones: Borrar y Estado */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => onDeleteSession(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all cursor-pointer"
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

        {/* Especialistas de Producción */}
        <div className="p-3 border-t border-slate-200/60 bg-white/50 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
            Agente Especializado Activo:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {(['master', 'audio_foh', 'hospitality', 'security'] as AgentRole[]).map((role) => {
              const active = activeAgent === role;
              const avatars: Record<AgentRole, string> = {
                master: '🧠 Master',
                audio_foh: '🎛️ Audio',
                hospitality: '☕ Hosp.',
                security: '🛡️ Seg.'
              };

              return (
                <button
                  key={role}
                  onClick={() => onSelectAgent(role)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {avatars[role]}
                </button>
              );
            })}
          </div>
          <div className="pt-2">
            <Link
              href="/workspace"
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <span>Abrir en Workspace 3 Paneles</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Flujo de Conversación Principal */}
      <main className="flex-1 flex flex-col bg-[#f8f9fa] overflow-hidden">
        {/* Banner del Agente & Rider Vinculado */}
        <div className="h-14 px-4 sm:px-6 border-b border-slate-200/60 bg-white flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl shrink-0">{info.icon}</span>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900 leading-tight truncate">
                {profile.name}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {profile.title}
              </p>
            </div>
          </div>

          {/* Vínculo con Rider */}
          <div className="flex items-center gap-3">
            <div className="relative">
              {activeSession?.riderInfo ? (
                <div className="flex items-center gap-2 bg-violet-50/90 border border-violet-200/80 rounded-2xl px-3 py-1.5 shadow-2xs">
                  <div className="w-5 h-5 rounded-lg bg-violet-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    🎸
                  </div>
                  <div className="text-left min-w-0">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-violet-600 leading-tight">
                      Rider Vinculado
                    </span>
                    <span className="block text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px] sm:max-w-[180px]">
                      {activeSession.riderInfo.artistName}
                    </span>
                  </div>
                  <Link
                    href={`/workspace?id=${activeSession.riderInfo.id}`}
                    className="ml-1 text-[11px] font-bold text-violet-700 hover:text-violet-900 bg-white hover:bg-violet-100 px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 shadow-xs border border-violet-200/60 shrink-0"
                    title="Abrir este rider en Workspace 3 Paneles"
                  >
                    <span>Workspace</span>
                    <span className="text-[10px]">↗</span>
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
                    className="text-xs font-bold text-slate-600 hover:text-violet-700 bg-slate-100/80 hover:bg-violet-50 border border-slate-200/80 px-3 py-1.5 rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Icon name="link" className="w-3.5 h-3.5 text-violet-600" />
                    <span>Vincular a Rider</span>
                    <span className="text-[10px] text-slate-400">▾</span>
                  </button>
                )
              )}

              {/* Menu desplegable de vinculación */}
              {showLinkMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Vincular Rider al Chat
                    </span>
                    <button
                      onClick={() => setShowLinkMenu(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto py-1 space-y-1">
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
                                ? 'bg-violet-50 text-violet-700 font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <span className="block font-bold truncate">{r.artist}</span>
                              <span className="block text-[10px] text-slate-400 truncate">{r.title}</span>
                            </div>
                            {isSelected && <span className="text-violet-600 font-bold">✓</span>}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No hay riders guardados aún.
                      </div>
                    )}
                  </div>

                  {activeSession?.riderId && onLinkRider && (
                    <div className="pt-1 border-t border-slate-100">
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

            <span className="hidden sm:inline-flex text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              En línea
            </span>
          </div>
        </div>

        {/* Mensajes */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl w-full mx-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center text-3xl shadow-xs">
                {info.icon}
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-black text-slate-800">
                  {profile.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {profile.desc}
                </p>
              </div>

              <div className="w-full max-w-lg pt-4 space-y-2 text-left">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Preguntas Frecuentes Sugeridas:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAMPLE_FAQS.map((faq, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSendMessage(faq)}
                      className="text-left text-xs p-3 rounded-2xl bg-white hover:bg-violet-50/80 text-slate-700 hover:text-violet-900 border border-slate-200/70 hover:border-violet-200 transition-all shadow-xs cursor-pointer"
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
                  className={`flex gap-3 ${isAi ? 'items-start' : 'items-end flex-row-reverse'}`}
                >
                  {isAi && (
                    <div className="w-8 h-8 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-sm shrink-0 border border-violet-200/50">
                      {m.roleAvatar || info.icon}
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-3xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                      isAi
                        ? 'bg-white border border-slate-200/80 text-slate-800 shadow-xs'
                        : 'bg-violet-600 text-white font-medium shadow-md shadow-violet-500/10'
                    }`}
                  >
                    {isAi && m.roleName && (
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        {m.roleName}
                      </span>
                    )}
                    <p className="whitespace-pre-line">{m.text}</p>
                    <span className={`block text-[10px] mt-1.5 text-right ${isAi ? 'text-slate-400' : 'text-violet-200'}`}>
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

        {/* Input Bar */}
        <div className="p-4 bg-white/80 border-t border-slate-200/60">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-2 focus-within:border-violet-500 focus-within:bg-white transition-all shadow-xs">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={`Escribe a ${profile.name}...`}
              className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 px-3 py-1 outline-none font-medium"
              disabled={isThinking}
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || isThinking}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <span>Enviar</span>
              <Icon name="send" className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
