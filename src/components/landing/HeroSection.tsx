"use client";

import React from 'react';

export type LandingRole = 'artista' | 'promotor';

export function HeroSection({ onEnter }: { onEnter: (role: LandingRole) => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-4 sm:space-y-5 max-w-3xl mx-auto py-12 sm:py-16 lg:py-20 px-1">
      <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.05]">
        Un show sin sorpresas
      </h1>

      <p className="text-base sm:text-lg text-slate-600 font-medium max-w-xl leading-relaxed">
        El artista pide, el organizador confirma y todo queda en el rider.
      </p>

      <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
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
