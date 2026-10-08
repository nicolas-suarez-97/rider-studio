"use client";

import React from 'react';
import { Icon } from '../common/Icon';
import { RiderType } from '@/core/types/rider.types';

interface TemplatePillsProps {
  onSelectType: (type: RiderType) => void;
}

export function TemplatePills({ onSelectType }: TemplatePillsProps) {
  return (
    <div className="flex flex-col items-center gap-2.5 sm:gap-3 w-full">
      <span className="text-[11px] sm:text-xs font-semibold text-slate-400 tracking-wide uppercase text-center">
        O salta directo al workspace con una plantilla:
      </span>

      <div className="w-full flex items-center justify-start sm:justify-center gap-2 sm:gap-4 overflow-x-auto py-1 px-1 sm:px-0 no-scrollbar overscroll-contain">
        {/* 1. Hospitality */}
        <button
          onClick={() => onSelectType('hospitality')}
          className="group bg-white/95 hover:bg-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full border border-slate-200/80 hover:border-sky-300 shadow-xs hover:shadow-md transition-all flex items-center gap-2 shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon name="coffee" className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-800">Rider Hospitality</span>
        </button>

        {/* 2. Técnico */}
        <button
          onClick={() => onSelectType('tecnico')}
          className="group bg-white/95 hover:bg-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full border border-slate-200/80 hover:border-zinc-400 shadow-xs hover:shadow-md transition-all flex items-center gap-2 shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-violet-50 text-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon name="speaker" className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-800">Rider Técnico</span>
        </button>

        {/* 3. Seguridad */}
        <button
          onClick={() => onSelectType('seguridad')}
          className="group bg-white/95 hover:bg-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full border border-slate-200/80 hover:border-amber-300 shadow-xs hover:shadow-md transition-all flex items-center gap-2 shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon name="shield" className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-800">Rider Seguridad</span>
        </button>
      </div>
    </div>
  );
}
