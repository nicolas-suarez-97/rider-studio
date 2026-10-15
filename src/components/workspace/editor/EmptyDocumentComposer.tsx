"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Icon } from '@/components/common/Icon';
import { RiderType } from '@/core/types/rider.types';
import { BLANK_COMPOSER_PLACEHOLDER, BLANK_RIDER_PROMPTS } from '@/core/constants/blank-rider-prompts';

const CHIP =
  'shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 cursor-pointer';

interface EmptyDocumentComposerProps {
  riderType: RiderType;
  showPrompts: boolean;
  isThinking?: boolean;
  onAsk: (text: string) => void;
  onInsertSection?: () => void;
  onOpenImportModal?: () => void;
}

export function EmptyDocumentComposer({
  riderType,
  showPrompts,
  isThinking = false,
  onAsk,
  onInsertSection,
  onOpenImportModal,
}: EmptyDocumentComposerProps) {
  const [text, setText] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [mounted, setMounted] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showMore) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setShowMore(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowMore(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showMore]);

  const prompts = BLANK_RIDER_PROMPTS[riderType] || BLANK_RIDER_PROMPTS.tecnico;
  const primary = useMemo(() => prompts.slice(0, 3), [prompts]);
  const extra = useMemo(() => prompts.slice(3), [prompts]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const next = text.trim();
    if (!next || isThinking) return;
    onAsk(next);
    setText('');
  };

  if (!mounted) return null;

  return (
    <motion.div
      initial={false}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] xl:pb-6"
    >
      <div className="pointer-events-auto w-full max-w-[720px]">
        {showPrompts && (
          <div className="mb-2.5 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {onOpenImportModal && (
                <button
                  type="button"
                  disabled={isThinking}
                  onClick={onOpenImportModal}
                  className="shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-violet-200 bg-violet-50/90 px-3 py-1.5 text-[12px] font-bold text-violet-700 shadow-xs hover:bg-violet-100 hover:border-violet-300 disabled:opacity-50 cursor-pointer transition-all active:scale-95"
                >
                  <Icon name="upload" className="w-3.5 h-3.5 text-violet-600" />
                  Importar rider (PDF/Word)
                </button>
              )}
              {primary.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  disabled={isThinking}
                  onClick={() => onAsk(prompt.prompt)}
                  className={CHIP}
                >
                  <Icon name={prompt.icon} className="w-3.5 h-3.5 text-slate-400" />
                  {prompt.label}
                </button>
              ))}
            </div>
            {extra.length > 0 && (
              <div ref={moreRef} className="relative shrink-0 pb-1">
                {showMore && (
                  <div
                    role="menu"
                    className="absolute bottom-full right-0 z-20 mb-2 flex w-max flex-col items-end gap-2"
                  >
                    {extra.map((prompt) => (
                      <button
                        key={prompt.id}
                        type="button"
                        role="menuitem"
                        disabled={isThinking}
                        onClick={() => {
                          setShowMore(false);
                          onAsk(prompt.prompt);
                        }}
                        className={CHIP}
                      >
                        <Icon name={prompt.icon} className="w-3.5 h-3.5 text-slate-400" />
                        {prompt.label}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  aria-expanded={showMore}
                  aria-haspopup="menu"
                  onClick={() => setShowMore((current) => !current)}
                  className={CHIP}
                >
                  <Icon name="fileText" className="w-3.5 h-3.5 text-slate-400" />
                  {showMore ? 'Menos' : 'Más'}
                </button>
              </div>
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
    </motion.div>
  );
}
