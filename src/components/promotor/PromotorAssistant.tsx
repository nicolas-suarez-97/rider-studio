"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { AGENT_PROFILES } from '@/core/constants/agent-profiles';
import { AgentRole } from '@/core/types/agent.types';
import { PromotorChatMessage, PromotorFileView } from '@/core/types/contra-rider.types';

const AGENT_CHOICES: { id: AgentRole; label: string }[] = [
  { id: 'master', label: 'General' },
  { id: 'audio_foh', label: 'Audio' },
  { id: 'hospitality', label: 'Hospitality' },
  { id: 'security', label: 'Seguridad' },
];

const ASK_SUGGESTIONS = [
  '¿Qué pide el rider para la voz principal?',
  '¿Qué requisitos de hospitality están escritos?',
  '¿Qué medidas de seguridad aparecen en el documento?',
];

const FILE_SUGGESTIONS = [
  '¿Qué del inventario cubre el PA?',
  '¿Qué hospitality no está en el inventario?',
  '¿Qué seguridad queda rechazada?',
];

interface PromotorAssistantProps {
  artistName: string;
  version: string;
  activeAgent: AgentRole;
  onSelectAgent: (role: AgentRole) => void;
  messages: PromotorChatMessage[];
  files: PromotorFileView[];
  submittedFile: PromotorFileView | null;
  isThinking: boolean;
  thinkingLabel: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSendMessage: (text: string) => void;
  onOpenCross: () => void;
}

function MessageTime({ value, light }: { value: string; light?: boolean }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    setLabel(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [value]);
  return <span className={`block text-[9px] mt-1 text-right ${light ? 'text-violet-200' : 'text-slate-400'}`}>{label}</span>;
}

export function PromotorAssistant({
  artistName,
  version,
  activeAgent,
  onSelectAgent,
  messages,
  files,
  submittedFile,
  isThinking,
  thinkingLabel,
  isCollapsed,
  onToggleCollapse,
  onSendMessage,
  onOpenCross,
}: PromotorAssistantProps) {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const profile = AGENT_PROFILES[activeAgent];
  const hasSources = files.length > 0 || Boolean(submittedFile);
  const suggestions = hasSources ? FILE_SUGGESTIONS : ASK_SUGGESTIONS;
  const sourceLine = [
    ...files.map((item) => `${item.name}${item.hasText ? '' : ' (sin texto)'}`),
    submittedFile ? `${submittedFile.name}${submittedFile.hasText ? '' : ' (sin texto)'}` : '',
  ].filter(Boolean).join(' · ');
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isThinking]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = inputText.trim();
    if (!text || isThinking) return;
    onSendMessage(text);
    setInputText('');
  };

  const panel = (
    <aside className="w-full h-full min-h-0 min-w-0 border-slate-200/80 bg-white/70 backdrop-blur-md flex flex-col overflow-hidden">
      <div className="p-3.5 sm:p-4 border-b border-slate-200/60 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Asistente</p>
            <h3 className="text-sm font-black text-slate-900 truncate">{artistName || 'Artista'}</h3>
            <p className="text-[10px] font-semibold text-slate-400 truncate">
              {profile.name}{version ? ` · ${version}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden xl:flex p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            title="Colapsar asistente"
          >
            <Icon name="panelRightClose" className="w-4 h-4" />
          </button>
        </div>
        {sourceLine ? (
          <p className="mt-2 text-[11px] font-semibold text-slate-500 truncate">
            {sourceLine}
          </p>
        ) : null}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 overscroll-contain">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center text-center px-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Icon name="sparkles" className="w-5 h-5" />
            </div>
            <p className="mt-3 text-xs font-black text-slate-700">Pregunta sobre este rider</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              {hasSources
                ? 'El cruce queda en el documento. Aquí puedes preguntar por un pedido.'
                : 'Genera el contra-rider desde la hoja de respuestas. Aquí puedes consultar el rider.'}
            </p>
            <div className="mt-4 space-y-1.5 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preguntas</span>
              {suggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSendMessage(prompt)}
                  disabled={isThinking}
                  className="w-full text-left text-[11px] p-2 rounded-xl bg-slate-50 hover:bg-violet-50/80 text-slate-600 hover:text-violet-800 border border-slate-200/60 hover:border-violet-200 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isAi = message.sender === 'ai';
            return (
              <div key={`${message.createdAt}-${index}`} className={`flex gap-2.5 ${isAi ? 'items-start' : 'items-end flex-row-reverse'}`}>
                {isAi ? (
                  <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="sparkles" className="w-3.5 h-3.5" />
                  </div>
                ) : null}
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  isAi ? 'bg-white border border-slate-200/80 text-slate-800' : 'bg-violet-600 text-white font-medium'
                }`}>
                  {isAi && message.roleName ? (
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">{message.roleName}</span>
                  ) : null}
                  <p className="whitespace-pre-line">{message.text}</p>
                  {message.review?.findings?.length ? (
                    <button
                      type="button"
                      onClick={onOpenCross}
                      className="mt-2 inline-flex items-center h-7 px-2.5 rounded-full bg-violet-50 text-[11px] font-bold text-violet-700 hover:bg-violet-100 cursor-pointer"
                    >
                      Ver el cruce
                    </button>
                  ) : null}
                  <MessageTime value={message.createdAt} light={!isAi} />
                </div>
              </div>
            );
          })
        )}
        {isThinking ? (
          <div className="flex items-center gap-2 text-xs py-1">
            <span className="w-2 h-2 rounded-full bg-violet-600 animate-ping" />
            <span className="text-[11px] font-semibold text-slate-500">{thinkingLabel}</span>
          </div>
        ) : null}
      </div>

      <form onSubmit={submit} className="p-3 border-t border-slate-200/60 bg-white/50 shrink-0 pb-20 xl:pb-3">
        <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-1.5 focus-within:border-violet-500 focus-within:bg-white">
          <input
            type="text"
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder={hasSources ? 'Pregunta sobre el rider o los archivos...' : 'Pregunta sobre este rider...'}
            disabled={isThinking}
            className="w-full bg-transparent text-base sm:text-xs text-slate-800 placeholder-slate-400 px-2.5 py-1.5 outline-none font-medium"
          />
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto">
              {AGENT_CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onSelectAgent(choice.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap cursor-pointer shrink-0 ${
                    activeAgent === choice.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer shrink-0"
            >
              <Icon name="send" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </aside>
  );

  if (!isCollapsed) return panel;

  return (
    <>
      <div className="flex xl:hidden h-full min-w-0 flex-1">{panel}</div>
      <div
        onClick={onToggleCollapse}
        className="hidden xl:flex w-12 border-l border-slate-200/80 bg-white/70 backdrop-blur-md flex-col items-center py-4 justify-between shrink-0 cursor-pointer hover:bg-slate-50/90"
        title="Abrir asistente"
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapse();
          }}
          className="p-2 rounded-xl bg-slate-100 text-slate-600 cursor-pointer"
          title="Expandir asistente"
        >
          <Icon name="panelRightOpen" className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-black uppercase text-slate-400 [writing-mode:vertical-rl] rotate-180 tracking-widest">
          Asistente
        </span>
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
      </div>
    </>
  );
}

