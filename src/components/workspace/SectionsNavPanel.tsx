"use client";

import React from 'react';
import { Reorder } from 'motion/react';
import { Icon } from '../common/Icon';
import { SectionItem, RiderType } from '@/core/types/rider.types';

interface SectionsNavPanelProps {
  sections: SectionItem[];
  onReorderSections: (newSections: SectionItem[]) => void;
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  completedSectionIds: string[];
  onToggleComplete: (id: string, e?: React.MouseEvent) => void;
  onOpenAddSection: () => void;
  onResetBlank: () => void;
  progressPercent: number;
  masterProgress?: { completed: number; total: number; percent: number };
  moduleStats?: Record<RiderType, { completed: number; total: number; percent: number }>;
  onSaveRider?: () => void;
  isSaving?: boolean;
  dbSyncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  riderType?: RiderType;
  onSelectRiderType?: (type: RiderType) => void;
}

export function SectionsNavPanel({
  sections,
  onReorderSections,
  activeSectionId,
  onSelectSection,
  completedSectionIds,
  onToggleComplete,
  onOpenAddSection,
  onResetBlank,
  progressPercent,
  onSaveRider,
  isSaving = false,
  dbSyncStatus = 'idle'
}: SectionsNavPanelProps) {
  return (
    <aside className="w-full xl:w-80 xl:border-r border-slate-200/80 bg-white/70 backdrop-blur-md flex flex-col shrink-0 h-full overflow-hidden">
      {/* Header del Outline: Artista, Gira y Conteo de Secciones */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200/60 shrink-0">

        {/* Subheader de la lista de secciones activas */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Secciones ({completedSectionIds.length}/{sections.length})
          </span>
          <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            {progressPercent}% Módulo
          </span>
        </div>
      </div>

      {/* Lista de Secciones Reordenables */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 overscroll-contain">
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
                className={`group relative p-3 rounded-2xl border transition-colors cursor-pointer flex items-center gap-3 ${
                  isActive
                    ? 'bg-violet-50/70 border-violet-200 shadow-xs ring-1 ring-violet-200/60'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200/70'
                }`}
                onClick={() => onSelectSection(section.id)}
              >
                {/* Drag Handle con touch-none para permitir scroll natural en móvil */}
                <div 
                  className="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none p-1 shrink-0"
                  title="Arrastrar para reordenar"
                >
                  <Icon name="grip" className="w-3.5 h-3.5" />
                </div>

                {/* Número y Título */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 shrink-0">
                      {section.num}
                    </span>
                    <h4 className="text-xs sm:text-xs font-bold text-slate-800 truncate">
                      {section.title}
                    </h4>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {section.subtitle}
                  </p>
                </div>

                {/* Botón de Completado táctil (mínimo 32px para dedos) */}
                <button
                  type="button"
                  onClick={(e) => onToggleComplete(section.id, e)}
                  className={`w-8 h-8 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                  }`}
                  title={isCompleted ? 'Marcado como completo' : 'Marcar como completado'}
                >
                  <Icon name="check" className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </div>

      {/* Acciones Inferiores del Panel */}
      <div className="p-3 border-t border-slate-200/60 bg-white/50 space-y-2 shrink-0 pb-20 xl:pb-3">
        {onSaveRider && (
          <button
            onClick={onSaveRider}
            disabled={isSaving}
            className={`w-full py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer shadow-sm disabled:opacity-60 ${
              dbSyncStatus === 'saved'
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/20'
            }`}
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : dbSyncStatus === 'saved' ? (
              <>
                <Icon name="check" className="w-3.5 h-3.5" />
                <span>Rider Guardado</span>
              </>
            ) : (
              <>
                <Icon name="database" className="w-3.5 h-3.5" />
                <span>Guardar Rider</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onOpenAddSection}
          className="w-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
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
