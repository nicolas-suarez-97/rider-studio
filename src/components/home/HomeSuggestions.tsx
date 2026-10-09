'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/common/Icon';
import type { HomeSuggestion } from '@/lib/home-suggestions';

export function WorkQuestions({
  label,
  items,
}: {
  label: string;
  items: { label: string; href: string }[];
}) {
  if (!items.length) return null;
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-full bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200/70 transition-all"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function ProgressMeter({ percent, caption }: { percent: number; caption: string }) {
  const done = percent >= 100;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-violet-600'}`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
      <span className={`text-xs font-bold whitespace-nowrap ${done ? 'text-emerald-700' : 'text-slate-700'}`}>
        {caption}
      </span>
    </div>
  );
}

export function StartConversation({ suggestions }: { suggestions: HomeSuggestion[] }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');

  const go = (text: string) => {
    const value = text.trim();
    if (!value) return;
    router.push(`/artista/chat?fresh=1&prompt=${encodeURIComponent(value)}`);
  };

  return (
    <section className="space-y-2.5">
      <form onSubmit={(event) => { event.preventDefault(); go(prompt); }}>
        <div className="bg-white rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 border border-slate-200/90 shadow-[0_12px_36px_-10px_rgba(99,102,241,0.12)] flex items-center gap-2 sm:gap-3 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-violet-100/90 text-violet-700 flex items-center justify-center ml-1 shrink-0">
            <Icon name="sparkles" className="w-4 h-4 text-violet-600" />
          </div>
          <input
            type="text"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe tu banda o requerimiento técnico (ej: 5 integrantes, in-ears, backline)..."
            className="flex-1 bg-transparent text-base sm:text-sm text-slate-800 placeholder-slate-400 outline-none font-medium min-w-0"
          />
          <div className="hidden md:flex items-center text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/70 shrink-0">
            ↵ Enter
          </div>
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-violet-500/25 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <span>Generar</span>
            <Icon name="sparkles" className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-400 mr-1">Prueba rápida:</span>
        {suggestions.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => go(item.prompt)}
            className="text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-full bg-slate-100/90 hover:bg-violet-50 text-slate-600 hover:text-violet-700 border border-slate-200/70 hover:border-violet-200 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
