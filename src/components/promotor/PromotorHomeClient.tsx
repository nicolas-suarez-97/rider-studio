"use client";

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { Icon } from '@/components/common/Icon';
import type { PromotorConversationCard, PromotorShowCard } from '@/lib/promotor/home';
import type { ReviewVerdict } from '@/core/types/contra-rider.types';

interface PromotorHomeClientProps {
  shows: PromotorShowCard[];
  conversations: PromotorConversationCard[];
  pendingPrompt: string | null;
}

const VERDICT_LABEL: Record<ReviewVerdict, string> = {
  cumple: 'Cumple',
  con_observaciones: 'Con observaciones',
  no_cumple: 'No cumple',
};

function showHref(id: string, prompt: string | null) {
  const base = `/promotor/shows/${id}/contra-rider`;
  return prompt ? `${base}?prompt=${encodeURIComponent(prompt)}` : base;
}

export function PromotorHomeClient({ shows, conversations, pendingPrompt }: PromotorHomeClientProps) {
  const assistantHref = shows.length === 1 ? showHref(shows[0].id, pendingPrompt) : null;

  return (
    <div className="min-h-dvh bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans antialiased pb-12 relative overflow-hidden">
      <div
        className="absolute top-0 inset-x-0 h-[520px] bg-[radial-gradient(ellipse_70%_60%_at_50%_-15%,rgba(139,92,246,0.14),rgba(248,249,250,0))] pointer-events-none -z-0"
        aria-hidden="true"
      />

      <Header pageType="promotor-home" />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">En revisión</h1>
            <p className="text-sm text-slate-500 font-medium">
              Asistente, riders en revisión y conversaciones recientes.
            </p>
          </div>
          {assistantHref ? (
            <Link
              href={assistantHref}
              className="bg-violet-600 hover:bg-violet-700 text-white h-9 px-4 rounded-full text-xs font-bold transition-all shadow-xs shadow-violet-500/25 flex items-center gap-1.5 active:scale-95 shrink-0 w-fit"
            >
              <Icon name="sparkles" className="w-3.5 h-3.5" />
              Asistente
            </Link>
          ) : null}
        </div>

        {pendingPrompt && shows.length === 0 ? (
          <p className="text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-2xl px-4 py-3">
            No hay un show en revisión para enviar esta consulta.
          </p>
        ) : null}

        {pendingPrompt && shows.length > 1 ? (
          <p className="text-sm font-medium text-slate-600 bg-white border border-violet-200 rounded-2xl px-4 py-3">
            Elige el show para enviar esta consulta.
          </p>
        ) : null}

        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-2.5 border-b border-slate-200/90 pb-3">
            <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Icon name="fileCheck" className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">Riders en revisión</h2>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
              {shows.length}
            </span>
          </div>

          {shows.length === 0 ? (
            <div className="bg-white/90 rounded-3xl p-8 border border-slate-200/90 text-center">
              <p className="text-sm text-slate-500 font-medium">
                Un rider compartido aparece aquí mientras el contra-rider no se ha enviado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shows.map((show) => (
                <Link
                  key={show.id}
                  href={showHref(show.id, pendingPrompt)}
                  className="group bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-violet-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                        {show.verdict ? VERDICT_LABEL[show.verdict] : 'En revisión'}
                      </span>
                      {show.version > 0 ? (
                        <span className="text-[11px] font-bold text-slate-500">v{show.version}</span>
                      ) : null}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-violet-600 transition-colors mt-2.5 leading-snug">
                      {show.artistName}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {show.venue || show.title}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold text-violet-600">
                    <span>{show.updatedLabel}</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">Abrir asistente →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-2.5 border-b border-slate-200/90 pb-3">
            <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Icon name="messageSquare" className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">Conversaciones recientes</h2>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
              {conversations.length}
            </span>
          </div>

          {conversations.length === 0 ? (
            <div className="bg-white/90 rounded-3xl p-8 border border-slate-200/90 text-center">
              <p className="text-sm text-slate-500 font-medium">Todavía no hay consultas de revisión.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={showHref(conversation.showId, null)}
                  className="group p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50/90 hover:border-violet-300 transition-all flex items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800 truncate group-hover:text-violet-700">
                      {conversation.title}
                    </span>
                    <span className="block text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                      {[conversation.artistName, conversation.venue, conversation.date].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-violet-600 font-bold shrink-0">→</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
