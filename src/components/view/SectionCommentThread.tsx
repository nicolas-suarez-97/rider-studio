"use client";

import React, { useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { SectionCommentItem } from '@/lib/share/comments';

interface SectionCommentThreadProps {
  comments: SectionCommentItem[];
  authorName: string;
  canWrite: boolean;
  onSubmit: (authorName: string, body: string) => Promise<void>;
}

function formatCommentTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

export function SectionCommentThread({
  comments,
  authorName,
  canWrite,
  onSubmit,
}: SectionCommentThreadProps) {
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
    <div className="mt-3.5 sm:mt-4 pt-3.5 sm:pt-4 border-t border-slate-100 space-y-3">
      {comments.length === 0 ? (
        <p className="text-xs text-slate-400">Sin notas en esta sección.</p>
      ) : (
        <div className="space-y-3">
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
        <form onSubmit={submit} className="space-y-2">
          {!authorName && (
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="Tu nombre"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-violet-300"
            />
          )}
          <div className="flex gap-2">
            <input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1000}
              placeholder="Escribe una nota…"
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
      )}
    </div>
  );
}
