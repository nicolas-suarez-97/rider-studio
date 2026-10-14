"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { RiderType } from '@/core/types/rider.types';
import { BLANK_COMPOSER_PLACEHOLDER, BLANK_RIDER_PROMPTS } from '@/core/constants/blank-rider-prompts';

interface EmptyDocumentComposerProps {
  riderType: RiderType;
  showPrompts: boolean;
  isThinking?: boolean;
  onAsk: (text: string) => void;
  onInsertSection?: () => void;
}

export function EmptyDocumentComposer({
  riderType,
  showPrompts,
  isThinking = false,
  onAsk,
  onInsertSection,
}: EmptyDocumentComposerProps) {
  const [text, setText] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const prompts = BLANK_RIDER_PROMPTS[riderType] || BLANK_RIDER_PROMPTS.tecnico;
  const visible = useMemo(
    () => (showMore ? prompts : prompts.slice(0, 3)),
    [prompts, showMore],
  );

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const next = text.trim();
    if (!next || isThinking) return;
    onAsk(next);
    setText('');
  };

  if (!mounted) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] xl:pb-6">
      <div className="pointer-events-auto w-full max-w-[720px]">
        {showPrompts && (
          <div className="mb-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {visible.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                disabled={isThinking}
                onClick={() => onAsk(prompt.prompt)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 cursor-pointer"
              >
                <Icon name={prompt.icon} className="w-3.5 h-3.5 text-slate-400" />
                {prompt.label}
              </button>
            ))}
            {prompts.length > 3 && (
              <button
                type="button"
                onClick={() => setShowMore((current) => !current)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 shadow-sm hover:bg-slate-50 cursor-pointer"
              >
                <Icon name="fileText" className="w-3.5 h-3.5 text-slate-400" />
                {showMore ? 'Menos' : 'Más'}
              </button>
            )}
          </div>
        )}
        <form
          onSubmit={submit}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.08)]"
        >
          <button
            type="button"
            onClick={() => onInsertSection?.()}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer shrink-0"
            aria-label="Insertar sección"
          >
            <Icon name="plus" className="w-4 h-4" />
          </button>
          <Icon name="sparkles" className="w-4 h-4 text-violet-500 shrink-0" />
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={BLANK_COMPOSER_PLACEHOLDER}
            disabled={isThinking}
            aria-label="Escribir con el asistente"
            className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none py-1.5"
          />
          <button
            type="submit"
            disabled={!text.trim() || isThinking}
            aria-label="Enviar al chat"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-violet-600 hover:text-white disabled:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-slate-100 disabled:hover:text-slate-300 cursor-pointer disabled:cursor-default shrink-0"
          >
            {isThinking ? (
              <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-violet-600 rounded-full animate-spin" />
            ) : (
              <Icon name="chevronUp" className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
