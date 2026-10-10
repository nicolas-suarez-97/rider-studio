"use client";

import React, { useState } from 'react';
import { Icon } from '../common/Icon';

export type LandingRole = 'artista' | 'promotor';

interface HeroSectionProps {
  onEnter: (role: LandingRole) => void;
  onSubmitPrompt: (prompt: string) => void;
  onPromptChange?: (prompt: string) => void;
}

const QUICK_PROMPTS = [
  { label: '🎸 Rock 5 pax', query: 'Banda de rock alternativo con 5 músicos: batería acústica, bajo, 2 guitarras, teclados y 4 mezclas in-ear.' },
  { label: '🎧 DJ Set Festival', query: 'DJ Set principal para festival al aire libre con setup Pioneer DJ, visuales y requerimientos de potencia.' },
  { label: '🎷 Cuarteto Jazz', query: 'Cuarteto de jazz acústico: piano de cola, contrabajo acústico, batería con escobillas y saxo tenor.' },
  { label: '🛡️ Seguridad Masivo', query: 'Protocolo de seguridad, aforos, salidas de emergencia y ambulancias para festival de 5.000 personas.' },
];

export function HeroSection({ onEnter, onSubmitPrompt, onPromptChange }: HeroSectionProps) {
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
    <div className="flex flex-col items-center text-center space-y-4 sm:space-y-5 max-w-3xl mx-auto py-12 sm:py-16 lg:py-20 px-1">
      <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.05]">
        Un show <span className="text-violet-600">sin sorpresas</span>
      </h1>

      <p className="text-base sm:text-lg text-slate-600 font-medium max-w-xl leading-relaxed">
        El artista pide, el organizador confirma y todo queda en el rider.
      </p>

      <div className="w-full flex flex-col items-center gap-3 py-6 sm:py-8">
      <form onSubmit={handleSubmit} className="w-full">
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

      <div className="w-full flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
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

      <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onEnter('artista')}
          className="text-left p-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/25 transition-all cursor-pointer active:scale-[0.99]"
        >
          <span className="block text-sm font-black">Soy el artista</span>
          <span className="block text-xs text-violet-100 font-medium mt-1">Armo mi rider y lo comparto</span>
        </button>
        <button
          type="button"
          onClick={() => onEnter('promotor')}
          className="text-left p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-violet-300 hover:bg-violet-50/50 shadow-xs transition-all cursor-pointer active:scale-[0.99]"
        >
          <span className="block text-sm font-black text-slate-900">Soy el organizador</span>
          <span className="block text-xs text-slate-500 font-medium mt-1">Reviso el rider y confirmo cada pedido</span>
        </button>
      </div>
    </div>
  );
}
