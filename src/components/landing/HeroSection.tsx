"use client";

import React, { useState } from 'react';
import { Icon } from '../common/Icon';

interface HeroSectionProps {
  onSubmitPrompt: (prompt: string) => void;
  onPromptChange?: (prompt: string) => void;
}

const QUICK_PROMPTS = [
  { label: '🎸 Rock 5 pax', query: 'Banda de rock alternativo con 5 músicos: batería acústica, bajo, 2 guitarras, teclados y 4 mezclas in-ear.' },
  { label: '🎧 DJ Set Festival', query: 'DJ Set principal para festival al aire libre con setup Pioneer DJ, visuales y requerimientos de potencia.' },
  { label: '🎷 Cuarteto Jazz', query: 'Cuarteto de jazz acústico: piano de cola, contrabajo acústico, batería con escobillas y saxo tenor.' },
  { label: '🛡️ Seguridad Masivo', query: 'Protocolo de seguridad, aforos, salidas de emergencia y ambulancias para festival de 5.000 personas.' },
];

export function HeroSection({ onSubmitPrompt, onPromptChange }: HeroSectionProps) {
  const [prompt, setPrompt] = useState('');

  const updatePrompt = (value: string) => {
    setPrompt(value);
    onPromptChange?.(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmitPrompt(prompt.trim());
  };

  const handleQuickPrompt = (query: string) => {
    updatePrompt(query);
    onSubmitPrompt(query);
  };

  return (
    <div className="flex flex-col items-center text-center space-y-3.5 sm:space-y-4 max-w-3xl mx-auto py-20 sm:py-32 lg:py-40 px-1">
      {/* Eyebrow badge */}
      <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold shadow-xs">
        <Icon name="sparkles" className="w-3.5 h-3.5 text-violet-600 shrink-0" />
        <span>Rider Studio 2026 • IA de Escenario y Eventos</span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.12]">
        Ingeniería de Producción para{' '}
        <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 bg-clip-text text-transparent">
          Eventos en Vivo
        </span>
      </h1>

      {/* Subtitle with improved contrast */}
      <p className="text-sm sm:text-base text-slate-600 font-medium max-w-2xl leading-relaxed">
        Crea, valida y estandariza riders técnicos, hospitality y protocolos de seguridad con agentes de producción especializados.
      </p>

      {/* AI Prompt Input Card */}
      <form onSubmit={handleSubmit} className="w-full pt-1 sm:pt-2">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 border border-slate-200/90 shadow-[0_12px_36px_-10px_rgba(99,102,241,0.12)] flex items-center gap-2 sm:gap-3 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-violet-100/90 text-violet-700 flex items-center justify-center ml-1 shrink-0" title="Generador IA">
            <Icon name="sparkles" className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-violet-600" />
          </div>
          <input
            type="text"
            value={prompt}
            onChange={(e) => updatePrompt(e.target.value)}
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

      {/* Quick Prompt Chips */}
      <div className="w-full flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap pt-0.5">
        <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">
          Prueba rápida:
        </span>
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.label}
            type="button"
            onClick={() => handleQuickPrompt(qp.query)}
            className="text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-full bg-slate-100/90 hover:bg-violet-50 text-slate-600 hover:text-violet-700 border border-slate-200/70 hover:border-violet-200 transition-all cursor-pointer active:scale-95 whitespace-nowrap shadow-2xs"
          >
            {qp.label}
          </button>
        ))}
      </div>
    </div>
  );
}
