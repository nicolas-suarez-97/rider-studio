"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '../common/Icon';
import { AgentRole } from '@/core/types/agent.types';
import { ChatMessageItem } from '@/core/types/chat.types';
import { Rider } from '@/core/models/Rider';
import { AGENT_PROFILES, AGENT_INFO, SAMPLE_FAQS } from '@/core/constants/agent-profiles';
import { DocumentSuggestion } from '@/core/types/suggestion.types';
import { chatExpandControlLabel } from '@/components/workspace/chat-panel-width';

interface AssistantChatPanelProps {
  activeAgent: AgentRole;
  onSelectAgent: (role: AgentRole) => void;
  messages: ChatMessageItem[];
  isThinking: boolean;
  onSendMessage: (text: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  rider?: Rider;
  sessionId?: string | null;
  sessionTitle?: string | null;
  consultMode?: boolean;
  suggestionMode?: boolean;
  suggestions?: DocumentSuggestion[];
  sectionTitles?: Record<string, string>;
  onAcceptSuggestion?: (id: string) => void;
  onRejectSuggestion?: (id: string) => void;
  onFocusSuggestion?: (id: string) => void;
  incomingDraft?: { text: string; id: number } | null;
}

export function AssistantChatPanel({
  activeAgent,
  onSelectAgent,
  messages,
  isThinking,
  onSendMessage,
  isCollapsed,
  onToggleCollapse,
  isExpanded = false,
  onToggleExpand,
  rider,
  sessionId,
  sessionTitle,
  consultMode = false,
  suggestionMode = false,
  suggestions = [],
  sectionTitles = {},
  onAcceptSuggestion,
  onRejectSuggestion,
  onFocusSuggestion,
  incomingDraft,
}: AssistantChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  useEffect(() => {
    if (incomingDraft?.text) {
      setInputText(incomingDraft.text);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = incomingDraft.text.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 50);
    }
  }, [incomingDraft]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(Math.max(34, textareaRef.current.scrollHeight), 120)}px`;
    }
  }, [inputText]);

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
  const prompts = consultMode
    ? [
        '¿Qué pide el rider para la voz principal?',
        '¿Qué requisitos de hospitality están escritos?',
        '¿Qué medidas de seguridad aparecen en el documento?'
      ]
    : SAMPLE_FAQS.slice(0, 3);

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
            {consultMode ? 'Consulta' : suggestionMode ? 'Sugerencias' : 'Copilot IA'}
          </span>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    );
  }

  return (
    <aside className="w-full xl:border-l border-slate-200/80 bg-white/70 backdrop-blur-md flex flex-col shrink-0 h-full overflow-hidden select-none">
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
          <div className="hidden xl:flex items-center gap-0.5">
            {onToggleExpand && (
              <button
                type="button"
                onClick={onToggleExpand}
                aria-label={chatExpandControlLabel(isExpanded)}
                aria-expanded={isExpanded}
                title={chatExpandControlLabel(isExpanded)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <Icon name={isExpanded ? 'chevronsRight' : 'chevronsLeft'} className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              title="Colapsar asistente"
            >
              <Icon name="panelRightClose" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Indicador de vinculación con el Rider actual y Conversación */}
        {rider && (
          <div className="mb-2.5 px-3 py-2 bg-violet-50/90 border border-violet-200/70 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs shrink-0">🎸</span>
              <div className="truncate">
                <span className="block text-[9px] font-black uppercase text-violet-600 leading-none">
                  {consultMode ? 'Consulta sobre este rider' : sessionId ? 'Conversación & Rider Vinculados' : 'Vinculado a este Rider'}
                </span>
                <span className="block text-xs font-bold text-slate-800 truncate leading-tight mt-0.5">
                  {sessionTitle ? `${rider.artistName} · ${sessionTitle}` : rider.artistName}
                </span>
              </div>
            </div>
            {!consultMode && (
            <Link
              href={sessionId ? `/artista/chat?session=${sessionId}` : rider.id ? `/artista/chat?riderId=${rider.id}` : '/artista/chat'}
              className="text-[10px] font-bold text-violet-700 hover:text-violet-900 bg-white hover:bg-violet-100 px-2.5 py-1 rounded-xl border border-violet-200/60 transition-colors shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
              title="Abrir esta conversación en pantalla completa"
            >
              <span>Chat Completo</span>
              <span>↗</span>
            </Link>
            )}
          </div>
        )}
      </div>

      {/* Flujo de Mensajes */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 overscroll-contain">
        {messages.length === 0 && !isThinking ? (
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
              {prompts.map((faq, idx) => (
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
                    m.isError
                      ? 'bg-rose-50/90 border border-rose-200 text-rose-900 shadow-xs'
                      : isAi
                      ? 'bg-white border border-slate-200/80 text-slate-800 shadow-xs'
                      : 'bg-violet-600 text-white font-medium shadow-xs'
                  }`}
                >
                  {isAi && m.roleName && (
                    <span className={`block text-[9px] font-black uppercase tracking-wider mb-1 ${m.isError ? 'text-rose-600' : 'text-slate-400'}`}>
                      {m.roleName}
                    </span>
                  )}
                  <p className="whitespace-pre-line">{m.text}</p>
                  
                  {m.isError && (
                    <div className="mt-2.5 pt-2 border-t border-rose-200/70 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] text-rose-600 font-medium">¿Deseas intentar de nuevo?</span>
                      <button
                        type="button"
                        onClick={() => {
                          const promptToRetry = m.retryPrompt || [...messages.slice(0, idx)].reverse().find(msg => msg.sender === 'user')?.text;
                          if (promptToRetry) onSendMessage(promptToRetry);
                        }}
                        disabled={isThinking}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Icon name="refresh" className="w-3.5 h-3.5" />
                        <span>Volver a intentar</span>
                      </button>
                    </div>
                  )}

                  <span className={`block text-[9px] mt-1 text-right ${m.isError ? 'text-rose-400' : isAi ? 'text-slate-400' : 'text-violet-200'}`}>
                    {m.time}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {suggestions.filter((item) => item.status === 'pending').length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">
              Puntos de mejora
            </p>
            {suggestions.filter((item) => item.status === 'pending').map((item) => (
              <div key={item.id} className="rounded-2xl border border-violet-200 bg-violet-50/70 p-3 text-xs text-slate-700">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                  {sectionTitles[item.sectionId] || 'Documento'}
                </p>
                <p className="mt-1 font-semibold text-slate-900 leading-relaxed">{item.rationale}</p>
                {item.proposedText.trim() && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 line-clamp-4">
                    {item.proposedText}
                  </p>
                )}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onAcceptSuggestion?.(item.id)}
                    className="px-2.5 py-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Aplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => onFocusSuggestion?.(item.id)}
                    className="px-2.5 py-1 rounded-xl bg-white border border-violet-200 text-violet-700 text-[11px] font-bold cursor-pointer"
                  >
                    Ver en el documento
                  </button>
                  <button
                    type="button"
                    onClick={() => onRejectSuggestion?.(item.id)}
                    className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-500 text-[11px] font-bold cursor-pointer"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isThinking && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
            <span className="w-2 h-2 rounded-full bg-violet-600 animate-ping" />
            <span className="text-[11px] font-semibold text-slate-500">
              {profile.name} {messages.length === 0 ? 'está revisando el rider…' : consultMode ? 'está revisando el rider...' : 'está redactando respuesta técnica...'}
            </span>
          </div>
        )}
      </div>

      {/* Input de Chat con padding inferior para no solapar la barra de navegación móvil */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200/60 bg-white/50 shrink-0 pb-20 xl:pb-3">
        <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-1.5 focus-within:border-violet-500 focus-within:bg-white transition-all">
          {incomingDraft && inputText.startsWith(incomingDraft.text.slice(0, 10)) && (
            <div className="flex items-center justify-between px-2 pt-1 pb-0.5 text-[10px] text-violet-700 font-semibold border-b border-violet-100">
              <span className="flex items-center gap-1.5 truncate">
                <Icon name="sparkles" className="w-3 h-3 text-violet-600 shrink-0" />
                <span className="truncate">Redactando sobre texto seleccionado</span>
              </span>
              <button
                type="button"
                onClick={() => setInputText('')}
                className="text-slate-400 hover:text-slate-600 ml-1 text-xs cursor-pointer p-0.5 hover:bg-violet-100 rounded"
                title="Limpiar"
              >
                ✕
              </button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={suggestionMode ? 'Pide un cambio para esta sección…' : consultMode ? 'Pregunta sobre este rider...' : `Consulta a ${profile.name}...`}
            className="w-full bg-transparent text-base sm:text-xs text-slate-800 placeholder-slate-400 px-2.5 py-1.5 outline-none font-medium resize-none min-h-[34px] max-h-28 overflow-y-auto leading-relaxed"
            disabled={isThinking}
          />
          <div className="flex items-center gap-1.5">
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
                    title={AGENT_PROFILES[role].name}
                  >
                    {labels[role]}
                  </button>
                );
              })}
            </div>
            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Icon name="send" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
}
