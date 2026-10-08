"use client";

import React from 'react';
import { motion, Reorder } from 'motion/react';
import { Icon } from '../common/Icon';
import { SectionItem } from '@/core/types/rider.types';

interface SectionsNavPanelProps {
  docHeaderTitle: string;
  setDocHeaderTitle: (val: string) => void;
  docHeaderSeason: string;
  setDocHeaderSeason: (val: string) => void;
  sections: SectionItem[];
  onReorderSections: (newSections: SectionItem[]) => void;
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  completedSectionIds: string[];
  onToggleComplete: (id: string, e?: React.MouseEvent) => void;
  onOpenAddSection: () => void;
  onResetBlank: () => void;
  progressPercent: number;
}

export function SectionsNavPanel({
  docHeaderTitle,
  setDocHeaderTitle,
  docHeaderSeason,
  setDocHeaderSeason,
  sections,
  onReorderSections,
  activeSectionId,
  onSelectSection,
  completedSectionIds,
  onToggleComplete,
  onOpenAddSection,
  onResetBlank,
  progressPercent
}: SectionsNavPanelProps) {
  return (
    <aside className="w-80 border-r border-slate-200/80 bg-white/70 backdrop-blur-md flex flex-col shrink-0 select-none">
      {/* Header del Outline */}
      <div className="p-4 border-b border-slate-200/60">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Índice de Secciones
          </span>
          <span className="text-[11px] font-extrabold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
            {progressPercent}% Completado
          </span>
        </div>

        {/* Artista y Temporada Editables */}
        <div className="space-y-1 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/60">
          <input
            type="text"
            value={docHeaderTitle}
            onChange={(e) => setDocHeaderTitle(e.target.value)}
            className="w-full bg-transparent text-sm font-black text-slate-800 outline-none hover:bg-white focus:bg-white px-2 py-1 rounded-xl transition-all"
            placeholder="Nombre del Artista / Banda"
          />
          <input
            type="text"
            value={docHeaderSeason}
            onChange={(e) => setDocHeaderSeason(e.target.value)}
            className="w-full bg-transparent text-xs font-semibold text-slate-400 outline-none hover:bg-white focus:bg-white px-2 py-1 rounded-xl transition-all"
            placeholder="Temporada o Gira"
          />
        </div>
      </div>

      {/* Lista de Secciones Reordenables */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <Reorder.Group 
          axis="y" 
          values={sections} 
          onReorder={onReorderSections}
          className="space-y-1.5"
        >
          {sections.map((section) => {
            const isActive = activeSectionId === section.id;
            const isCompleted = completedSectionIds.includes(section.id);

            return (
              <Reorder.Item
                key={section.id}
                value={section}
                className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                  isActive
                    ? 'bg-violet-50/70 border-violet-200 shadow-xs'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200/70'
                }`}
                onClick={() => onSelectSection(section.id)}
              >
                {/* Drag Handle Icon */}
                <div className="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing">
                  <Icon name="grip" className="w-3.5 h-3.5" />
                </div>

                {/* Número y Título */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400">
                      {section.num}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 truncate">
                      {section.title}
                    </h4>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {section.subtitle}
                  </p>
                </div>

                {/* Botón de Completado */}
                <button
                  type="button"
                  onClick={(e) => onToggleComplete(section.id, e)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                  }`}
                  title={isCompleted ? 'Marcado como completo' : 'Marcar como completado'}
                >
                  <Icon name="check" className="w-3.5 h-3.5" />
                </button>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </div>

      {/* Acciones Inferiores del Panel */}
      <div className="p-3 border-t border-slate-200/60 bg-white/50 space-y-2">
        <button
          onClick={onOpenAddSection}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
        >
          <Icon name="plus" className="w-3.5 h-3.5" />
          <span>Añadir Nueva Sección</span>
        </button>

        <button
          onClick={onResetBlank}
          className="w-full bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200/80 py-2 rounded-2xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Icon name="trash" className="w-3 h-3" />
          <span>Empezar de Ceros</span>
        </button>
      </div>
    </aside>
  );
}
