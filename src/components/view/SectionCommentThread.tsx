"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/common/Icon';
import { SectionCommentItem } from '@/lib/share/comments';

interface SectionCommentAnchorProps {
  open: boolean;
  title: string;
  comments: SectionCommentItem[];
  authorName: string;
  canWrite: boolean;
  onToggle: () => void;
  onSubmit: (authorName: string, body: string) => Promise<void>;
}

function formatCommentTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function placePopover(anchor: DOMRect, height: number) {
  const margin = 8;
  const bottomReserve = window.innerWidth < 1280 ? 72 : margin;
  const width = Math.min(300, window.innerWidth - margin * 2);
  let left = anchor.right - width;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

  const below = anchor.bottom + margin;
  const above = anchor.top - margin - height;
  const fitsBelow = below + height <= window.innerHeight - bottomReserve;
  const preferred = fitsBelow || above < margin
    ? Math.min(below, window.innerHeight - bottomReserve - height)
    : above;
  const top = Math.max(margin, preferred);

  const anchorCenter = anchor.left + anchor.width / 2;
  const caretLeft = Math.min(width - 18, Math.max(12, anchorCenter - left - 6));

  return { top, left, width, caretLeft, placement: fitsBelow || above < margin ? 'below' as const : 'above' as const };
}

export function SectionCommentAnchor({
  open,
  title,
  comments,
  authorName,
  canWrite,
  onToggle,
  onSubmit,
}: SectionCommentAnchorProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<ReturnType<typeof placePopover> | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }

    const update = () => {
      const anchor = buttonRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const height = cardRef.current?.offsetHeight ?? 220;
      setBox(placePopover(anchor, height));
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, comments.length, authorName, canWrite]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (cardRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      onToggle();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onToggle();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onToggle]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className={`relative w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
          comments.length > 0 || open
            ? 'text-violet-700 bg-violet-50 border-violet-200'
            : 'text-violet-600 bg-white border-violet-200 hover:bg-violet-50'
        }`}
        title={comments.length > 0 ? `${comments.length} notas` : 'Notas de la sección'}
        aria-label={
          comments.length > 0
            ? `${comments.length} notas en "${title}"`
            : `Notas de "${title}"`
        }
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Icon name="messageSquare" className="w-4 h-4" />
        {comments.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-violet-600 text-white text-[9px] font-bold leading-4 text-center">
            {comments.length}
          </span>
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={cardRef}
          role="dialog"
          aria-label={`Notas de ${title}`}
          className="fixed z-[70] rounded-2xl border border-slate-200 bg-white shadow-2xl"
          style={{
            top: box?.top ?? -9999,
            left: box?.left ?? 8,
            width: box?.width ?? 300,
            visibility: box ? 'visible' : 'hidden',
          }}
        >
          {box && (
            <span
              aria-hidden
              className={`absolute h-3 w-3 rotate-45 border-slate-200 bg-white ${
                box.placement === 'below'
                  ? '-top-1.5 border-l border-t'
                  : '-bottom-1.5 border-r border-b'
              }`}
              style={{ left: box.caretLeft }}
            />
          )}

          <div className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-2">
            <p className="text-xs font-bold text-slate-800 leading-snug truncate">{title}</p>
            <button
              type="button"
              onClick={onToggle}
              className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer text-sm leading-none"
              aria-label="Cerrar notas"
            >
              ×
            </button>
          </div>

          <div className="px-3.5 pb-3 space-y-3">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-400">Sin notas en esta sección.</p>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-3 pr-1">
                {comments.map((comment) => (
                  <div key={comment.id}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-slate-800">{comment.authorName}</span>
                      <span className="text-[10px] text-slate-400">{formatCommentTime(comment.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line">{comment.body}</p>
                  </div>
                ))}
              </div>
            )}

            {canWrite && (
              <CommentComposer authorName={authorName} onSubmit={onSubmit} />
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function CommentComposer({
  authorName,
  onSubmit,
}: {
  authorName: string;
  onSubmit: (authorName: string, body: string) => Promise<void>;
}) {
  const [name, setName] = useState(authorName);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextName = (authorName || name).trim();
    const nextBody = body.trim();
    if (!nextName || !nextBody || sending) return;
    setSending(true);
    try {
      await onSubmit(nextName, nextBody);
      setBody('');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2 pt-1">
      {!authorName && (
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          placeholder="Tu nombre"
          autoFocus
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-violet-300"
        />
      )}
      <div className="flex gap-2">
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1000}
          placeholder="Escribe una nota…"
          autoFocus={Boolean(authorName)}
          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-violet-300"
        />
        <button
          type="submit"
          disabled={sending || !(authorName || name).trim() || !body.trim()}
          className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shrink-0 disabled:opacity-40 cursor-pointer"
          aria-label="Enviar nota"
        >
          <Icon name="send" className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
