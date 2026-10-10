"use client";

import { useState } from 'react';
import { Icon } from '@/components/common/Icon';
import type { LandingRole } from '@/components/landing/HeroSection';

const SURPRISES = [
  {
    icon: 'fileText',
    title: 'El rider que llegó viejo',
    body: 'Cada fecha circula un PDF distinto y nadie sabe cuál es el último.',
  },
  {
    icon: 'messageSquare',
    title: 'La respuesta que se quedó en un correo',
    body: 'Lo que se confirmó por mensaje no queda junto al rider. Después nadie lo encuentra.',
  },
  {
    icon: 'clock',
    title: 'El pedido que nadie revisó',
    body: 'El día del show aparece algo sin confirmar: el sonido, el camerino o la seguridad.',
  },
];

const STEPS = [
  {
    title: 'El artista pide',
    body: 'Describe el show. El rider queda armado en secciones: sonido, camerino y seguridad.',
  },
  {
    title: 'Lo comparte',
    body: 'El organizador abre el mismo rider. Lo que pidió el artista sigue escrito igual.',
  },
  {
    title: 'El organizador confirma',
    body: 'Cada pedido se confirma o lleva una alternativa escrita. Si falta uno, el show no está listo.',
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
    title: 'Se acaba el rider viejo',
    body: 'Hay uno solo. El pedido del artista y la confirmación del organizador viven ahí.',
  },
  {
    icon: 'send',
    title: 'Se acaba el correo perdido',
    body: 'La confirmación queda junto al pedido, no en un mensaje que después nadie encuentra.',
  },
  {
    icon: 'lock',
    title: 'Se acaba lo que nadie revisó',
    body: 'No se da por listo hasta que cada pedido está confirmado o tiene una alternativa escrita.',
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
            <p className="text-sm font-black text-slate-900">{line.title}</p>
            <p className="text-sm font-medium text-slate-500">{line.body}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{line.tag}</p>
            {answers[line.id] === 'alternativa' ? (
              <p className="mt-1 text-xs font-medium text-violet-700">La alternativa queda escrita junto al pedido.</p>
            ) : null}
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
      <section className="space-y-4">
        <div className="max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Las sorpresas de siempre</h2>
          <p className="mt-1 text-sm sm:text-base font-medium text-slate-600 leading-relaxed">
            El rider es lo que el artista necesita para su show. Hoy el pedido sale por un lado y la confirmación vuelve por otro.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 bg-white rounded-[28px] border border-slate-200/80 shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] overflow-hidden">
          {SURPRISES.map((item) => (
            <div key={item.title} className="p-5 sm:p-6 border-b md:border-b-0 md:border-r border-slate-100 last:border-0">
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 inline-flex items-center justify-center">
                <Icon name={item.icon} className="w-4 h-4" />
              </span>
              <p className="mt-4 text-sm font-black text-slate-900 leading-snug">{item.title}</p>
              <p className="mt-1 text-sm font-medium text-slate-500 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Cómo se evitan</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">El artista pide, el organizador confirma y todo queda en el rider.</p>
        </div>
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
          <p className="mt-1 text-sm font-medium text-slate-500">El pedido del artista a un lado. Tu confirmación, al lado. Revisa los tres.</p>
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
