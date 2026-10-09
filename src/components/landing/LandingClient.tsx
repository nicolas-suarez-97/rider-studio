"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { Icon } from '@/components/common/Icon';
import { Toast } from '@/components/common/Toast';
import { ProgressMeter, StartConversation, WorkQuestions } from '@/components/home/HomeSuggestions';
import { riderService } from '@/core/services/rider.service';
import { chatService } from '@/core/services/chat.service';
import { SavedRiderSummary, RiderType, LinkedChatSession } from '@/core/types/rider.types';
import { ChatSessionSummary } from '@/core/types/chat.types';
import type { HomeSuggestion } from '@/lib/home-suggestions';

interface LandingClientProps {
  initialRiders: SavedRiderSummary[];
  initialConversations: ChatSessionSummary[];
  suggestions: HomeSuggestion[];
  progressQuestions: HomeSuggestion[];
}

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

function byRecent(riders: SavedRiderSummary[]) {
  return [...riders].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

function formatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es', { month: 'short', day: 'numeric' });
}

function latestSession(rider: SavedRiderSummary): LinkedChatSession | null {
  const sessions = [...(rider.linkedSessions || [])].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return sessions[0] || null;
}

function progressHref(prompt: string, rider: SavedRiderSummary) {
  const params = new URLSearchParams({ prompt });
  const session = latestSession(rider);
  if (session) params.set('session', session.id);
  else params.set('riderId', rider.id);
  return `/artista/chat?${params}`;
}

export function LandingClient({ initialRiders, initialConversations, suggestions, progressQuestions }: LandingClientProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savedRiders, setSavedRiders] = useState<SavedRiderSummary[]>(initialRiders);
  const [conversations, setConversations] = useState<ChatSessionSummary[]>(initialConversations);

  const [prevRiders, setPrevRiders] = useState(initialRiders);
  const [prevConvs, setPrevConvs] = useState(initialConversations);

  if (initialRiders !== prevRiders) {
    setPrevRiders(initialRiders);
    setSavedRiders(initialRiders);
  }

  if (initialConversations !== prevConvs) {
    setPrevConvs(initialConversations);
    setConversations(initialConversations);
  }

  useEffect(() => {
    let isCancelled = false;

    async function fetchFreshData() {
      try {
        const [riders, sess] = await Promise.all([
          riderService.getAll(),
          chatService.getSessions()
        ]);
        if (!isCancelled) {
          if (Array.isArray(riders)) {
            setSavedRiders(riders.map(r => r.toSummary()));
          }
          if (Array.isArray(sess)) {
            setConversations(sess);
          }
        }
      } catch (err) {
        console.warn('[LandingClient] Error refrescando datos:', err);
      }
    }

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        fetchFreshData();
      }
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      isCancelled = true;
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteRider = async (riderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm('¿Seguro que deseas eliminar este rider de la base de datos?');
    if (!confirmed) return;

    const ok = await riderService.delete(riderId);
    if (ok) {
      setSavedRiders(prev => prev.filter(r => r.id !== riderId));
      showToast('Rider eliminado');
    } else {
      showToast('No se pudo eliminar el rider');
    }
  };

  const handleDeleteConversation = async (sessionId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const confirmed = window.confirm('¿Seguro que deseas eliminar esta conversación?');
    if (!confirmed) return;

    const ok = await chatService.deleteSession(sessionId);
    if (ok) {
      setConversations((prev) => prev.filter((conversation) => conversation.id !== sessionId));
      setSavedRiders((prev) => prev.map((rider) => ({
        ...rider,
        linkedSessions: (rider.linkedSessions || []).filter((session) => session.id !== sessionId),
      })));
      showToast('Conversación eliminada');
    } else {
      showToast('No se pudo eliminar la conversación');
    }
  };

  const ordered = byRecent(savedRiders);
  const featured = ordered.find((rider) => rider.status === 'in_progress') ?? ordered[0] ?? null;
  const rest = featured ? ordered.filter((rider) => rider.id !== featured.id) : [];
  const featuredSession = featured ? latestSession(featured) : null;
  const featuredChat = featuredSession
    || conversations.find((conversation) => conversation.riderId === featured?.id)
    || null;

  return (
    <div className="min-h-dvh bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans antialiased pb-12 relative overflow-hidden">
      <div
        className="absolute top-0 inset-x-0 h-[520px] bg-[radial-gradient(ellipse_70%_60%_at_50%_-15%,rgba(139,92,246,0.14),rgba(248,249,250,0))] pointer-events-none -z-0"
        aria-hidden="true"
      />

      <Toast message={toastMessage} />
      <Header pageType="landing" />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">En curso</h1>
          <Link
            href="/artista/workspace?type=tecnico"
            className="text-xs font-bold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-3.5 py-1.5 rounded-full border border-violet-200/60"
          >
            Nuevo rider
          </Link>
        </div>

        {featured ? (
          <section className="bg-white rounded-[28px] border border-slate-200/90 shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 truncate">
                  {featured.artist || featured.title}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {[TYPE_LABEL[featured.type] || 'Rider', featured.tour, formatDay(featured.updatedAt)].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(event) => handleDeleteRider(featured.id, event)}
                  className="h-10 px-3 rounded-full text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  Eliminar
                </button>
                <Link
                  href={`/artista/workspace?id=${featured.id}`}
                  className="bg-violet-600 hover:bg-violet-700 text-white h-10 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-violet-500/25"
                >
                  Continuar rider
                </Link>
              </div>
            </div>
            <ProgressMeter
              percent={featured.progress}
              caption={`${featured.sectionsCompleted} de ${featured.totalSections} secciones`}
            />
            <WorkQuestions
              label="Sobre este rider"
              items={progressQuestions.map((item) => ({
                label: item.label,
                href: progressHref(item.prompt, featured),
              }))}
            />
            <Link
              href={featuredChat
                ? `/artista/chat?session=${featuredChat.id}`
                : `/artista/chat?riderId=${featured.id}`}
              className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 text-sm font-bold text-slate-700 hover:text-violet-700"
            >
              <span className="truncate">{featuredChat?.title || 'Iniciar conversación'}</span>
              <span className="text-violet-600 shrink-0">→</span>
            </Link>
          </section>
        ) : (
          <section className="bg-white rounded-[28px] border border-slate-200/90 p-6 sm:p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-600">Todavía no hay un rider en curso.</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Link href="/artista/workspace?type=tecnico" className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-full text-xs font-bold">Técnico</Link>
              <Link href="/artista/workspace?type=hospitality" className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 px-3.5 py-2 rounded-full text-xs font-bold">Hospitality</Link>
              <Link href="/artista/workspace?type=seguridad" className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3.5 py-2 rounded-full text-xs font-bold">Seguridad</Link>
            </div>
          </section>
        )}

        {rest.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-black text-slate-900">Otros riders</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {rest.map((rider) => {
                const session = latestSession(rider);
                const detail = [rider.tour, rider.title !== rider.artist ? rider.title : ''].filter(Boolean).join(' · ');
                return (
                  <div key={rider.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${TYPE_PILL[rider.type] || TYPE_PILL.tecnico}`}>
                          {TYPE_LABEL[rider.type] || 'Rider'}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200">
                          {rider.status === 'completed' ? 'Completado' : 'En curso'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => handleDeleteRider(rider.id, event)}
                        className="text-slate-300 hover:text-rose-600 p-1.5 cursor-pointer shrink-0"
                        title="Eliminar"
                      >
                        <Icon name="trash" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Link href={`/artista/workspace?id=${rider.id}`} className="block space-y-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-extrabold text-slate-900 truncate">{rider.artist || rider.title}</span>
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0">{formatDay(rider.updatedAt)}</span>
                      </div>
                      {detail ? (
                        <p className="text-xs font-medium text-slate-500 truncate">{detail}</p>
                      ) : null}
                      <ProgressMeter
                        percent={rider.progress}
                        caption={`${rider.sectionsCompleted} de ${rider.totalSections} secciones`}
                      />
                    </Link>
                    {session ? (
                      <Link
                        href={`/artista/chat?session=${session.id}`}
                        className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs font-bold text-slate-600 hover:text-violet-700"
                      >
                        <span className="truncate">{session.title}</span>
                        <span className="text-violet-600 shrink-0">→</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/artista/chat?riderId=${rider.id}`}
                        className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs font-bold text-slate-400 hover:text-violet-700"
                      >
                        <span>Iniciar conversación</span>
                        <span className="shrink-0">→</span>
                      </Link>
                    )}
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
              {conversations.slice(0, 4).map((conversation) => (
                <div key={conversation.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-start gap-3">
                  <Link href={`/artista/chat?session=${conversation.id}`} className="min-w-0 flex-1 space-y-1">
                    <span className="block text-sm font-extrabold text-slate-900 truncate">{conversation.title}</span>
                    <span className="block text-xs font-medium text-slate-500 truncate">
                      {[conversation.date, conversation.riderInfo?.artistName].filter(Boolean).join(' · ') || 'Sin rider'}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={(event) => handleDeleteConversation(conversation.id, event)}
                    className="text-slate-300 hover:text-rose-600 p-1.5 cursor-pointer shrink-0"
                    title="Eliminar"
                  >
                    <Icon name="trash" className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
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
