"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { RiderThumb } from '@/components/common/RiderThumb';
import {
  confirmProgressLabel,
  countRiderHome,
  filterRiderHome,
  RIDER_HOME_FILTERS,
  RIDER_HOME_STATUS_LABEL,
  type RiderHomeCard,
  type RiderHomeFilter,
  type RiderHomeStatus,
} from '@/lib/artista/mis-riders';

const NEW_RIDER_HREF = '/artista/workspace?type=tecnico';

const STATUS_PILL: Record<RiderHomeStatus, string> = {
  draft: 'bg-slate-50 text-slate-600 border-slate-200',
  shared: 'bg-violet-50 text-violet-700 border-violet-200',
  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

interface MisRidersClientProps {
  cards: RiderHomeCard[];
}

function NewRiderLink({ className }: { className: string }) {
  return (
    <Link href={NEW_RIDER_HREF} className={className}>
      + Nuevo rider
    </Link>
  );
}

export function MisRidersClient({ cards }: MisRidersClientProps) {
  const [filter, setFilter] = useState<RiderHomeFilter>('all');
  const counts = useMemo(() => countRiderHome(cards), [cards]);
  const visible = useMemo(() => filterRiderHome(cards, filter), [cards, filter]);

  return (
    <div className="min-h-dvh bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans antialiased pb-12 relative overflow-hidden">
      <div
        className="absolute top-0 inset-x-0 h-[520px] bg-[radial-gradient(ellipse_70%_60%_at_50%_-15%,rgba(139,92,246,0.14),rgba(248,249,250,0))] pointer-events-none -z-0"
        aria-hidden="true"
      />

      <Header pageType="landing" />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Mis riders</h1>
          <NewRiderLink className="bg-violet-600 hover:bg-violet-700 text-white h-10 px-4 rounded-full text-xs font-bold inline-flex items-center shadow-md shadow-violet-500/25" />
        </div>

        {cards.length === 0 ? (
          <section className="bg-white rounded-[28px] border border-slate-200/90 p-6 sm:p-10 text-center space-y-4">
            <p className="text-sm font-semibold text-slate-600">
              Todavía no tienes riders. Crea el primero para tu próximo show.
            </p>
            <NewRiderLink className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-full text-xs font-bold inline-flex items-center" />
          </section>
        ) : (
          <>
            <div
              role="group"
              aria-label="Filtrar riders"
              className="flex flex-wrap items-center gap-2"
            >
              {RIDER_HOME_FILTERS.map((item) => {
                const selected = filter === item.id;
                const count = counts[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFilter(item.id)}
                    className={`h-9 px-3.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-700'
                    }`}
                  >
                    {`${item.label} ${count}`}
                  </button>
                );
              })}
            </div>

            {visible.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">No hay riders en este filtro.</p>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none p-0 m-0">
                {visible.map((card) => (
                  <li key={card.id}>
                    <RiderHomeCardView card={card} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function RiderHomeCardView({ card }: { card: RiderHomeCard }) {
  const detail = [card.venue, card.eventDateLabel].filter(Boolean).join(' · ');
  const primaryIsResponses = card.canViewResponses && card.status !== 'draft';

  return (
    <article className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-3 focus-within:ring-2 focus-within:ring-violet-400">
      <div className="flex items-start gap-3">
        <RiderThumb url={card.coverUrl} name={card.title} size={48} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 truncate">{card.title}</h2>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${STATUS_PILL[card.status]}`}
            >
              {RIDER_HOME_STATUS_LABEL[card.status]}
            </span>
          </div>
          {detail ? (
            <p className="text-xs font-medium text-slate-500 truncate">{detail}</p>
          ) : null}
          {card.confirmProgress ? (
            <p className="text-xs font-semibold text-slate-600">
              {confirmProgressLabel(card.confirmProgress)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={card.editHref}
          className={
            primaryIsResponses
              ? 'h-9 px-3.5 rounded-full text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700 inline-flex items-center'
              : 'h-9 px-3.5 rounded-full text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white inline-flex items-center'
          }
        >
          {card.status === 'draft' ? 'Seguir editando' : 'Editar'}
        </Link>
        {card.canViewResponses ? (
          <Link
            href={card.responsesHref}
            className={
              primaryIsResponses
                ? 'h-9 px-3.5 rounded-full text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white inline-flex items-center'
                : 'h-9 px-3.5 rounded-full text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700 inline-flex items-center'
            }
          >
            Ver respuestas
          </Link>
        ) : null}
      </div>
    </article>
  );
}
