"use client";

import React from 'react';
import { Icon } from '../common/Icon';
import { RiderType } from '@/core/types/rider.types';

interface TemplatePillsProps {
  onSelectType: (type: RiderType) => void;
}

const TEMPLATES: Array<{
  type: RiderType;
  title: string;
  badge: string;
  badgeColor: string;
  desc: string;
  icon: string;
  iconBg: string;
  hoverBorder: string;
}> = [
  {
    type: 'tecnico',
    title: 'Rider Técnico',
    badge: 'Stage & Audio',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200/80',
    desc: 'Stage plot 2D interactivo, input list de canales, microfonía y backline.',
    icon: 'speaker',
    iconBg: 'bg-violet-100 text-violet-700',
    hoverBorder: 'hover:border-violet-300 hover:shadow-violet-500/10'
  },
  {
    type: 'hospitality',
    title: 'Rider Hospitality',
    badge: 'Catering & Confort',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200/80',
    desc: 'Camerinos, catering de gira, alérgenos, alojamiento y transporte.',
    icon: 'coffee',
    iconBg: 'bg-sky-100 text-sky-700',
    hoverBorder: 'hover:border-sky-300 hover:shadow-sky-500/10'
  },
  {
    type: 'seguridad',
    title: 'Rider Seguridad',
    badge: 'Protocolos & Aforo',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200/80',
    desc: 'Aforos, plan de evacuación, contingencias médicas y personal de control.',
    icon: 'shield',
    iconBg: 'bg-amber-100 text-amber-700',
    hoverBorder: 'hover:border-amber-300 hover:shadow-amber-500/10'
  }
];

export function TemplatePills({ onSelectType }: TemplatePillsProps) {
  return (
    <div className="w-full space-y-3 pt-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          O salta directo al workspace con una plantilla
        </span>
        <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
          Selecciona un tipo para iniciar en blanco
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.type}
            type="button"
            onClick={() => onSelectType(tmpl.type)}
            className={`group text-left bg-white/90 hover:bg-white p-4 rounded-2xl border border-slate-200/90 ${tmpl.hoverBorder} shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 active:scale-[0.99]`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className={`w-9 h-9 rounded-xl ${tmpl.iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                <Icon name={tmpl.icon} className="w-4.5 h-4.5" />
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${tmpl.badgeColor}`}>
                {tmpl.badge}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-800 group-hover:text-violet-600 transition-colors">
                  {tmpl.title}
                </h3>
                <span className="text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all text-xs font-bold">
                  →
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                {tmpl.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
