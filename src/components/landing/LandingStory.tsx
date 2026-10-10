"use client";

import { useState } from 'react';
import { Icon } from '@/components/common/Icon';
import type { LandingRole } from '@/components/landing/HeroSection';

const SURPRISES = [
  {
    title: 'El rider que llegó viejo',
    body: 'Cada fecha circula un PDF distinto y nadie sabe cuál es el último.',
  },
  {
    title: 'La respuesta que se quedó en un correo',
    body: 'Lo que se confirmó por mensaje no queda junto al rider. Después nadie lo encuentra.',
  },
  {
    title: 'El pedido que nadie revisó',
    body: 'El día del show aparece algo sin confirmar: el sonido, el camerino o la seguridad.',
  },
];

const STEPS = [
  {
    title: 'El artista pide',
    body: 'Arma su rider: sonido, camerino y seguridad, cada cosa en su sección.',
  },
  {
    title: 'Lo comparte',
    body: 'Envía un enlace. El organizador lo lee, pero no cambia lo que pidió el artista.',
  },
  {
    title: 'El organizador confirma',
    body: 'Revisa cada pedido y lo confirma o propone una alternativa. Todo queda en el rider.',
  },
];

const DEMO_LINES = [
  { id: 'sonido', tag: 'Rider técnico', title: 'Sonido', body: 'Bocinas que se oigan en todo el lugar' },
  { id: 'camerino', tag: 'Hospitality', title: 'Camerino', body: 'Agua, comida y un lugar para descansar' },
  { id: 'seguridad', tag: 'Seguridad', title: 'Seguridad', body: 'Entrada y salida seguras para el artista' },
];

const DEMO_CHOICES = [
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'alternativa', label: 'Alternativa' },
] as const;

const REASONS = [
  {
    icon: 'fileCheck',
    title: 'Un solo rider',
    body: 'El pedido y la confirmación están en el mismo lugar. No hay otra versión dando vueltas.',
  },
  {
    icon: 'send',
    title: 'Nada queda a medias',
    body: 'La confirmación no se envía hasta que cada pedido tenga respuesta.',
  },
  {
    icon: 'lock',
    title: 'Lo que pidió el artista no cambia',
    body: 'El organizador confirma o propone. El pedido original sigue igual.',
  },
];

function RiderDemo() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const reviewed = DEMO_LINES.filter((line) => answers[line.id]).length;
  const ready = reviewed === DEMO_LINES.length;

  return (
    <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] p-4 sm:p-6 space-y-3">
      {DEMO_LINES.map((line) => (
        <div
          key={line.id}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
        >
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-violet-700">{line.tag}</span>
            <p className="mt-1 text-sm font-black text-slate-900">{line.title}</p>
            <p className="text-sm font-medium text-slate-500">{line.body}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {DEMO_CHOICES.map((choice) => {
              const active = answers[line.id] === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAnswers((prev) => ({ ...prev, [line.id]: choice.value }))}
                  className={`h-8 px-3 rounded-full text-xs font-bold inline-flex items-center cursor-pointer active:scale-95 transition-colors ${
                    active
                      ? 'bg-violet-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700'
                  }`}
                >
                  {choice.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2" aria-live="polite">
        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${ready ? 'bg-emerald-500' : 'bg-violet-600'}`}
            style={{ width: `${(reviewed / DEMO_LINES.length) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-bold whitespace-nowrap ${ready ? 'text-emerald-700' : 'text-slate-700'}`}>
          {ready ? 'Sin sorpresas: todo revisado' : `${reviewed} de ${DEMO_LINES.length} revisados`}
        </span>
      </div>
    </div>
  );
}

export function LandingStory({ onEnter }: { onEnter: (role: LandingRole) => void }) {
  return (
    <div className="mt-6 sm:mt-10 space-y-14 sm:space-y-20">
      <section className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6 lg:gap-10 items-center">
        <img
          src="/landing/landing-mail.jpg"
          alt="Un documento pasando entre un computador y un teléfono"
          className="w-full aspect-[4/3] object-cover rounded-[28px] border border-slate-200/80 bg-slate-50"
        />
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Las sorpresas de siempre</h2>
          <p className="text-sm sm:text-base font-medium text-slate-600 leading-relaxed">
            El rider sale del artista y la confirmación vuelve por otro lado. Las sorpresas aparecen el día del show.
          </p>
          <div className="space-y-3">
            {SURPRISES.map((item) => (
              <div key={item.title}>
                <p className="text-sm font-black text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Cómo se evitan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STEPS.map((item, index) => (
            <div key={item.title} className="bg-white rounded-[28px] border border-slate-200/80 p-5 shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)]">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-[11px] font-black inline-flex items-center justify-center">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-black text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm font-medium text-slate-500 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Pruébalo como organizador</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Este es un rider de ejemplo. Revisa cada pedido.</p>
        </div>
        <RiderDemo />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Por qué no hay sorpresas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {REASONS.map((item) => (
            <div key={item.title} className="bg-white rounded-2xl border border-slate-200/80 px-4 py-4">
              <span className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 inline-flex items-center justify-center">
                <Icon name={item.icon} className="w-4 h-4" />
              </span>
              <p className="mt-3 text-sm font-black text-slate-900 leading-snug">{item.title}</p>
              <p className="mt-1 text-sm font-medium text-slate-500 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="text-center space-y-4 pb-4">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">El día del show, los dos ven el mismo rider</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onEnter('artista')}
            className="h-10 px-5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/25 cursor-pointer active:scale-95"
          >
            Soy el artista
          </button>
          <button
            type="button"
            onClick={() => onEnter('promotor')}
            className="h-10 px-5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-violet-300 hover:text-violet-700 cursor-pointer active:scale-95"
          >
            Soy el organizador
          </button>
        </div>
      </section>
    </div>
  );
}
