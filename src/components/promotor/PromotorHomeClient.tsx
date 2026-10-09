"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { Icon } from '@/components/common/Icon';
import { ProgressMeter, StartConversation, WorkQuestions } from '@/components/home/HomeSuggestions';
import { chatService } from '@/core/services/chat.service';
import type { PromotorConversationCard, PromotorShowCard } from '@/lib/promotor/home';
import type { HomeSuggestion } from '@/lib/home-suggestions';
import type { RiderType } from '@/core/types/rider.types';

const TYPE_LABEL: Record<RiderType, string> = {
  tecnico: 'Rider técnico',
  hospitality: 'Hospitality',
  seguridad: 'Seguridad',
};

const TYPE_PILL: Record<RiderType, string> = {
  tecnico: 'bg-violet-50 text-violet-700 border-violet-200',
  hospitality: 'bg-sky-50 text-sky-700 border-sky-200',
  seguridad: 'bg-amber-50 text-amber-700 border-amber-200',
};

interface PromotorHomeClientProps {
  shows: PromotorShowCard[];
  conversations: PromotorConversationCard[];
  suggestions: HomeSuggestion[];
  progressQuestions: HomeSuggestion[];
  pendingPrompt: string | null;
}

function showHref(id: string, prompt?: string | null) {
  const base = `/promotor/shows/${id}/contra-rider`;
  return prompt ? `${base}?prompt=${encodeURIComponent(prompt)}` : base;
}

export function PromotorHomeClient({ shows, conversations: initialConversations, suggestions, progressQuestions, pendingPrompt }: PromotorHomeClientProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const featured = shows[0] ?? null;
  const rest = shows.slice(1);
  const featuredConversation = featured
    ? conversations.find((conversation) => conversation.showId === featured.id) ?? null
    : null;

  const handleDeleteConversation = async (sessionId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const confirmed = window.confirm('¿Seguro que deseas eliminar esta conversación?');
    if (!confirmed) return;
    const ok = await chatService.deleteSession(sessionId);
    if (ok) setConversations((prev) => prev.filter((conversation) => conversation.id !== sessionId));
  };
  const pending = featured && featured.total > featured.answered ? featured.total - featured.answered : 0;
  const percent = featured && featured.total ? Math.round((featured.answered / featured.total) * 100) : 0;

  return (
    <div className="min-h-dvh bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans antialiased pb-12 relative overflow-hidden">
      <div
        className="absolute top-0 inset-x-0 h-[520px] bg-[radial-gradient(ellipse_70%_60%_at_50%_-15%,rgba(139,92,246,0.14),rgba(248,249,250,0))] pointer-events-none -z-0"
        aria-hidden="true"
      />

      <Header pageType="promotor-home" />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-6">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">En revisión</h1>

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

        {featured ? (
          <section className="bg-white rounded-[28px] border border-slate-200/90 shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 truncate">
                  {featured.artistName}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {[featured.venue, featured.updatedLabel].filter(Boolean).join(' · ') || featured.title}
                </p>
              </div>
              <Link
                href={showHref(featured.id, pendingPrompt)}
                className="bg-violet-600 hover:bg-violet-700 text-white h-10 px-4 rounded-full text-xs font-bold inline-flex items-center shrink-0 shadow-md shadow-violet-500/25"
              >
                Continuar contra-rider
              </Link>
            </div>
            <ProgressMeter
              percent={percent}
              caption={`${featured.answered} de ${featured.total}`}
            />
            <p className="text-sm font-semibold text-slate-600">
              {pending > 0
                ? `Faltan ${pending} ${pending === 1 ? 'sección' : 'secciones'} para enviar.`
                : 'Todas las secciones tienen respuesta.'}
            </p>
            <WorkQuestions
              label="Sobre este show"
              items={progressQuestions.map((item) => ({
                label: item.label,
                href: showHref(featured.id, item.prompt),
              }))}
            />
            {featuredConversation ? (
              <Link
                href={showHref(featured.id)}
                className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 text-sm font-bold text-slate-700 hover:text-violet-700"
              >
                <span className="truncate">{featuredConversation.title}</span>
                <span className="text-violet-600 shrink-0">→</span>
              </Link>
            ) : null}
          </section>
        ) : (
          <section className="bg-white rounded-[28px] border border-slate-200/90 p-6 sm:p-8">
            <p className="text-sm font-semibold text-slate-600">
              Un rider compartido aparece aquí mientras el contra-rider no se ha enviado.
            </p>
          </section>
        )}

        {rest.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-black text-slate-900">Otros shows</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {rest.map((show) => {
                const showPercent = show.total ? Math.round((show.answered / show.total) * 100) : 0;
                const session = conversations.find((conversation) => conversation.showId === show.id) ?? null;
                const detail = [show.venue, show.tour, show.title !== show.artistName ? show.title : ''].filter(Boolean).join(' · ');
                return (
                  <div key={show.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${TYPE_PILL[show.type] || TYPE_PILL.tecnico}`}>
                        {TYPE_LABEL[show.type] || 'Rider'}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200">
                        {show.riderStatus === 'completed' ? 'Completado' : 'En curso'}
                      </span>
                    </div>
                    <Link href={showHref(show.id, pendingPrompt)} className="block space-y-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-extrabold text-slate-900 truncate">{show.artistName}</span>
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0">{show.updatedLabel}</span>
                      </div>
                      {detail ? (
                        <p className="text-xs font-medium text-slate-500 truncate">{detail}</p>
                      ) : null}
                      <ProgressMeter
                        percent={showPercent}
                        caption={`${show.answered} de ${show.total} secciones`}
                      />
                    </Link>
                    <Link
                      href={showHref(show.id)}
                      className={`flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs font-bold hover:text-violet-700 ${session ? 'text-slate-600' : 'text-slate-400'}`}
                    >
                      <span className="truncate">{session?.title || 'Iniciar conversación'}</span>
                      <span className={session ? 'text-violet-600 shrink-0' : 'shrink-0'}>→</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <StartConversation suggestions={suggestions} />

        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900">Historial</h2>
          {conversations.length === 0 ? (
            <p className="text-sm font-medium text-slate-500">Todavía no hay conversaciones.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {conversations.slice(0, 4).map((conversation) => {
                const detail = [conversation.date, conversation.artistName].filter(Boolean).join(' · ');
                const body = (
                  <>
                    <span className="block text-sm font-extrabold text-slate-900 truncate">{conversation.title}</span>
                    <span className="block text-xs font-medium text-slate-500 truncate">{detail || 'Sin show'}</span>
                  </>
                );
                return (
                  <div key={conversation.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-start gap-3">
                    {conversation.showId ? (
                      <Link href={showHref(conversation.showId)} className="min-w-0 flex-1 space-y-1">
                        {body}
                      </Link>
                    ) : (
                      <div className="min-w-0 flex-1 space-y-1">{body}</div>
                    )}
                    <button
                      type="button"
                      onClick={(event) => handleDeleteConversation(conversation.id, event)}
                      className="text-slate-300 hover:text-rose-600 p-1.5 cursor-pointer shrink-0"
                      title="Eliminar"
                    >
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {conversations.length > 4 ? (
            <Link
              href="/artista/chat"
              className="inline-flex items-center justify-center text-xs font-bold text-violet-700 hover:text-violet-900 bg-white hover:bg-violet-50 px-4 py-2.5 rounded-full border border-violet-200/70"
            >
              Ver más
            </Link>
          ) : null}
        </section>
      </main>
    </div>
  );
}
