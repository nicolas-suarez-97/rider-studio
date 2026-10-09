"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { AGENT_PROFILES } from '@/core/constants/agent-profiles';
import { AgentRole } from '@/core/types/agent.types';
import {
  ContraFinding,
  ContraReviewRecord,
  PromotorChatMessage,
  PromotorFileView,
  ReviewVerdict,
} from '@/core/types/contra-rider.types';
import { formatAttachmentSize } from '@/core/utils/chat-attachments';

const ACCEPT = '.pdf,.txt,.md,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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
  '¿El PA del archivo cubre lo pedido?',
  '¿Qué hospitality no aparece?',
  '¿Qué seguridad contradice el rider?',
];

const VERDICT_LABEL: Record<ReviewVerdict | ContraFinding['verdict'], string> = {
  cumple: 'Cumple',
  con_observaciones: 'Con observaciones',
  no_cumple: 'No cumple',
  parcial: 'Parcial',
  no_aparece: 'No aparece',
  contradice: 'Contradice',
};

const VERDICT_CLASS: Record<string, string> = {
  cumple: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  con_observaciones: 'bg-amber-50 text-amber-700 border-amber-200',
  no_cumple: 'bg-rose-50 text-rose-700 border-rose-200',
  parcial: 'bg-amber-50 text-amber-700 border-amber-200',
  no_aparece: 'bg-slate-100 text-slate-600 border-slate-200',
  contradice: 'bg-rose-50 text-rose-700 border-rose-200',
};

interface PromotorAssistantProps {
  artistName: string;
  version: string;
  activeAgent: AgentRole;
  onSelectAgent: (role: AgentRole) => void;
  messages: PromotorChatMessage[];
  file: PromotorFileView | null;
  isThinking: boolean;
  thinkingLabel: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSendMessage: (text: string) => void;
  onUpload: (file: File) => void;
  onClearFile: () => void;
  onApplyFinding: (finding: ContraFinding) => void;
  appliedLineIds: string[];
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
  file,
  isThinking,
  thinkingLabel,
  isCollapsed,
  onToggleCollapse,
  onSendMessage,
  onUpload,
  onClearFile,
  onApplyFinding,
  appliedLineIds,
}: PromotorAssistantProps) {
  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const profile = AGENT_PROFILES[activeAgent];
  const suggestions = file ? FILE_SUGGESTIONS : ASK_SUGGESTIONS;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isThinking]);

  const pickFile = (list: FileList | null) => {
    const next = list?.[0];
    if (!next || isThinking) return;
    onUpload(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = inputText.trim();
    if (!text || isThinking) return;
    onSendMessage(text);
    setInputText('');
  };

  const panel = (
    <aside
      className={`w-full xl:w-96 xl:border-l border-slate-200/80 bg-white/70 backdrop-blur-md flex flex-col shrink-0 h-full overflow-hidden ${
        isDragging ? 'ring-2 ring-violet-400 ring-inset' : ''
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!isThinking) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        pickFile(event.dataTransfer.files);
      }}
    >
      <div className="p-3.5 sm:p-4 border-b border-slate-200/60 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Revisión</p>
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
        <div className="mt-3">
          {file ? (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <Icon name="fileText" className="w-4 h-4 text-violet-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                <p className="text-[10px] font-semibold text-slate-400">
                  {formatAttachmentSize(file.size)} · {file.hasText ? 'texto leído' : 'sin texto'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isThinking}
                className="text-[10px] font-bold text-slate-500 hover:text-violet-700 disabled:opacity-40 cursor-pointer"
              >
                Reemplazar
              </button>
              <button
                type="button"
                onClick={onClearFile}
                disabled={isThinking}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 disabled:opacity-40 cursor-pointer"
              >
                Quitar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isThinking}
              className="w-full h-9 rounded-full border border-dashed border-violet-300 bg-violet-50/70 text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-40 cursor-pointer"
            >
              Subir contra-rider
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => pickFile(event.target.files)}
          />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 overscroll-contain">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center text-center px-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Icon name="sparkles" className="w-5 h-5" />
            </div>
            <p className="mt-3 text-xs font-black text-slate-700">Suelta el contra-rider del recinto</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              PDF, Word o texto, hasta 8 MB. Lo comparo con este rider y te digo qué se cubre.
            </p>
            <div className="mt-4 space-y-1.5 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">También puedes preguntar</span>
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
                  {message.review ? (
                    <ReviewBody
                      review={message.review}
                      appliedLineIds={appliedLineIds}
                      onApplyFinding={onApplyFinding}
                    />
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
            placeholder={file ? 'Pregunta sobre el rider o el archivo...' : 'Pregunta sobre este rider...'}
            disabled={isThinking}
            className="w-full bg-transparent text-base sm:text-xs text-slate-800 placeholder-slate-400 px-2.5 py-1.5 outline-none font-medium"
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isThinking}
              className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-violet-700 disabled:opacity-40 flex items-center justify-center cursor-pointer shrink-0"
              title="Subir contra-rider"
            >
              <Icon name="paperclip" className="w-3.5 h-3.5" />
            </button>
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
        title="Abrir revisión"
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapse();
          }}
          className="p-2 rounded-xl bg-slate-100 text-slate-600 cursor-pointer"
          title="Expandir revisión"
        >
          <Icon name="panelRightOpen" className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-black uppercase text-slate-400 [writing-mode:vertical-rl] rotate-180 tracking-widest">
          Revisión
        </span>
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
      </div>
    </>
  );
}

function ReviewBody({
  review,
  appliedLineIds,
  onApplyFinding,
}: {
  review: ContraReviewRecord;
  appliedLineIds: string[];
  onApplyFinding: (finding: ContraFinding) => void;
}) {
  return (
    <div className="mt-2.5 space-y-2 border-t border-slate-100 pt-2.5">
      <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${VERDICT_CLASS[review.verdict]}`}>
        {VERDICT_LABEL[review.verdict]}
      </span>
      {review.summary ? <p className="text-[11px] text-slate-500">{review.summary}</p> : null}
      <div className="space-y-1.5">
        {review.findings.map((finding) => (
          <div key={finding.lineId} className="rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-slate-800 truncate">{finding.sectionTitle}</p>
              <span className={`shrink-0 px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${VERDICT_CLASS[finding.verdict]}`}>
                {VERDICT_LABEL[finding.verdict]}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
              {finding.fileOffer || finding.riderAsk}
            </p>
            {finding.verdict !== 'cumple' ? (
              <button
                type="button"
                onClick={() => onApplyFinding(finding)}
                className="mt-1.5 text-[10px] font-bold text-violet-700 hover:text-violet-900 cursor-pointer"
              >
                {appliedLineIds.includes(finding.lineId) ? 'En la fila' : 'Pasar a la fila'}
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400">
        Esto no envía el contra-rider. Las filas de la izquierda siguen siendo la respuesta oficial.
      </p>
    </div>
  );
}
