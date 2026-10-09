"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '../common/Icon';
import { AgentRole } from '@/core/types/agent.types';
import { ChatMessageItem } from '@/core/types/chat.types';
import { Rider } from '@/core/models/Rider';
import { AGENT_PROFILES, AGENT_INFO, SAMPLE_FAQS } from '@/core/constants/agent-profiles';

interface AssistantChatPanelProps {
  activeAgent: AgentRole;
  onSelectAgent: (role: AgentRole) => void;
  messages: ChatMessageItem[];
  isThinking: boolean;
  onSendMessage: (text: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  rider?: Rider;
  sessionId?: string | null;
  sessionTitle?: string | null;
}

export function AssistantChatPanel({
  activeAgent,
  onSelectAgent,
  messages,
  isThinking,
  onSendMessage,
  isCollapsed,
  onToggleCollapse,
  rider,
  sessionId,
  sessionTitle
}: AssistantChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleSendPromptDirectly = (prompt: string) => {
    if (isThinking) return;
    onSendMessage(prompt);
  };

  const profile = AGENT_PROFILES[activeAgent];
  const info = AGENT_INFO[activeAgent];

  if (isCollapsed) {
    return (
      <div 
        onClick={onToggleCollapse}
        className="hidden xl:flex w-12 border-l border-slate-200/80 bg-white/70 backdrop-blur-md flex-col items-center py-4 justify-between shrink-0 select-none cursor-pointer hover:bg-slate-50/90 transition-colors group"
        title="Clic para abrir Asistente IA"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          className="p-2 rounded-xl bg-slate-100 group-hover:bg-violet-100 text-slate-600 group-hover:text-violet-700 transition-colors cursor-pointer"
          title="Expandir panel del asistente"
        >
          <Icon name="panelRightOpen" className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
            {info.icon}
          </div>
          <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-violet-600 transition-colors [writing-mode:vertical-rl] rotate-180 tracking-widest">
            Copilot IA
          </span>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    );
  }

  return (
    <aside className="w-full xl:w-96 xl:border-l border-slate-200/80 bg-white/70 backdrop-blur-md flex flex-col shrink-0 h-full overflow-hidden select-none">
      {/* Header del Copilot */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200/60 shrink-0">
        <div className="flex items-center justify-between mb-2.5 sm:mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">{info.icon}</span>
            <div>
              <h3 className="text-xs font-black text-slate-900 leading-tight">
                {profile.name}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {profile.title}
              </p>
            </div>
          </div>
          <button
            onClick={onToggleCollapse}
            className="hidden xl:flex p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
            title="Colapsar asistente"
          >
            <Icon name="panelRightClose" className="w-4 h-4" />
          </button>
        </div>

        {/* Indicador de vinculación con el Rider actual y Conversación */}
        {rider && (
          <div className="mb-2.5 px-3 py-2 bg-violet-50/90 border border-violet-200/70 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs shrink-0">🎸</span>
              <div className="truncate">
                <span className="block text-[9px] font-black uppercase text-violet-600 leading-none">
                  {sessionId ? 'Conversación & Rider Vinculados' : 'Vinculado a este Rider'}
                </span>
                <span className="block text-xs font-bold text-slate-800 truncate leading-tight mt-0.5">
                  {sessionTitle ? `${rider.artistName} · ${sessionTitle}` : rider.artistName}
                </span>
              </div>
            </div>
            <Link
              href={sessionId ? `/chat?session=${sessionId}` : rider.id ? `/chat?riderId=${rider.id}` : '/chat'}
              className="text-[10px] font-bold text-violet-700 hover:text-violet-900 bg-white hover:bg-violet-100 px-2.5 py-1 rounded-xl border border-violet-200/60 transition-colors shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
              title="Abrir esta conversación en pantalla completa"
            >
              <span>Chat Completo</span>
              <span>↗</span>
            </Link>
          </div>
        )}

        {/* Selector de Agentes Especializados */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60">
          {(['master', 'audio_foh', 'hospitality', 'security'] as AgentRole[]).map((role) => {
            const active = activeAgent === role;
            const avatars: Record<AgentRole, string> = {
              master: '🧠',
              audio_foh: '🎛️',
              hospitality: '☕',
              security: '🛡️'
            };

            return (
              <button
                key={role}
                onClick={() => onSelectAgent(role)}
                className={`py-1.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title={AGENT_PROFILES[role].name}
              >
                <span>{avatars[role]}</span>
                <span className="text-[9px] capitalize">{role.split('_')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Flujo de Mensajes */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 overscroll-contain">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-3 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center text-xl shadow-xs">
              {info.icon}
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-700">
                {profile.name}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed max-w-xs mx-auto">
                {profile.desc}
              </p>
            </div>
            <div className="w-full pt-2 space-y-1.5 text-left max-w-sm mx-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Sugerencias rápidas:
              </span>
              {SAMPLE_FAQS.slice(0, 3).map((faq, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendPromptDirectly(faq)}
                  className="w-full text-left text-[11px] p-2 rounded-xl bg-slate-50 hover:bg-violet-50/80 text-slate-600 hover:text-violet-800 border border-slate-200/60 hover:border-violet-200 transition-all cursor-pointer"
                >
                  &quot;{faq}&quot;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isAi = m.sender === 'ai';

            return (
              <div
                key={idx}
                className={`flex gap-2.5 ${isAi ? 'items-start' : 'items-end flex-row-reverse'}`}
              >
                {isAi && (
                  <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-xs shrink-0 mt-0.5 border border-violet-200/50">
                    {m.roleAvatar || info.icon}
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    isAi
                      ? 'bg-white border border-slate-200/80 text-slate-800 shadow-xs'
                      : 'bg-violet-600 text-white font-medium shadow-xs'
                  }`}
                >
                  {isAi && m.roleName && (
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      {m.roleName}
                    </span>
                  )}
                  <p className="whitespace-pre-line">{m.text}</p>
                  <span className={`block text-[9px] mt-1 text-right ${isAi ? 'text-slate-400' : 'text-violet-200'}`}>
                    {m.time}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {isThinking && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
            <span className="w-2 h-2 rounded-full bg-violet-600 animate-ping" />
            <span className="text-[11px] font-semibold text-slate-500">
              {profile.name} está redactando respuesta técnica...
            </span>
          </div>
        )}
      </div>

      {/* Input de Chat con padding inferior para no solapar la barra de navegación móvil */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200/60 bg-white/50 shrink-0 pb-20 xl:pb-3">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-1.5 focus-within:border-violet-500 focus-within:bg-white transition-all">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Consulta a ${profile.name}...`}
            className="flex-1 bg-transparent text-base sm:text-xs text-slate-800 placeholder-slate-400 px-2.5 py-1.5 outline-none font-medium"
            disabled={isThinking}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Icon name="send" className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
}
