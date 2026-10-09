"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { Icon } from '@/components/common/Icon';

export function PromotorInbox() {
  const router = useRouter();
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  const openShow = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!link.trim() || isOpening) return;
    setIsOpening(true);
    setError('');

    try {
      const response = await fetch('/api/promotor/abrir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.showId !== 'string') {
        setError(typeof data.error === 'string' ? data.error : 'No se pudo abrir el show');
        return;
      }
      router.push(`/promotor/shows/${data.showId}/contra-rider`);
    } catch {
      setError('No se pudo abrir el show');
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#f8f9fa] text-slate-900 flex flex-col">
      <Header pageType="promotor" />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold">
            <Icon name="fileCheck" className="w-3.5 h-3.5" />
            <span>Promotor</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Responde el rider
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
            Pega el enlace que te compartió el artista. El documento se abre en solo lectura y el contra-rider queda al lado.
          </p>

          <form onSubmit={openShow} className="mt-6">
            <div className="bg-white rounded-3xl p-2 border border-slate-200/90 shadow-[0_12px_36px_-10px_rgba(99,102,241,0.12)] flex items-center gap-2 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all">
              <div className="w-9 h-9 rounded-xl bg-violet-100/90 text-violet-700 flex items-center justify-center ml-1 shrink-0">
                <Icon name="link" className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://…/view/…"
                aria-label="Enlace compartido del rider"
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none font-medium min-w-0"
              />
              <button
                type="submit"
                disabled={!link.trim() || isOpening}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-md shadow-violet-500/25 transition-all cursor-pointer active:scale-95 shrink-0"
              >
                {isOpening ? 'Abriendo…' : 'Abrir show'}
              </button>
            </div>
            {error ? (
              <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>
            ) : null}
          </form>
        </div>
      </main>
    </div>
  );
}
