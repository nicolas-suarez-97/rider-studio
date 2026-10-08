"use client";

import React, { useState } from 'react';
import { Icon } from '../common/Icon';

interface HeroSectionProps {
  onSubmitPrompt: (prompt: string) => void;
}

export function HeroSection({ onSubmitPrompt }: HeroSectionProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmitPrompt(prompt.trim());
  };

  return (
    <div className="flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto pt-6 sm:pt-10">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200/70 text-violet-700 text-xs font-bold shadow-xs">
        <Icon name="sparkles" className="w-3.5 h-3.5 text-violet-600" />
        <span>Rider Studio 2026 • IA de Escenario y Eventos</span>
      </div>

      <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
        Ingeniería de Producción para <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">Eventos en Vivo</span>
      </h1>

      <p className="text-sm sm:text-base text-slate-500 font-medium max-w-xl leading-relaxed">
        Crea, valida y estandariza riders técnicos, hospitality y protocolos de seguridad con agentes de producción especializados.
      </p>

      {/* Caja de Prompt / Búsqueda */}
      <form onSubmit={handleSubmit} className="w-full pt-2">
        <div className="bg-white/95 rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 border border-slate-200/80 shadow-[0_12px_36px_-10px_rgba(100,116,139,0.12)] flex items-center gap-2 sm:gap-3 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 ml-1 shrink-0">
            <Icon name="search" className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe tu banda, rider o pega especificaciones técnicas..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none font-medium"
          />
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-violet-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <span>Generar</span>
            <Icon name="sparkles" className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
