"use client";

import React from 'react';
import { Icon } from '../common/Icon';
import { InputListTable } from './InputListTable';
import { SectionItem, RiderType } from '@/core/types/rider.types';
import { ChannelInput } from '@/core/models/ChannelInput';

interface DocumentEditorPanelProps {
  riderTitle: string;
  artistName: string;
  season: string;
  riderType: RiderType;
  sections: SectionItem[];
  channels: ChannelInput[];
  completedSectionIds: string[];
  onToggleComplete: (id: string, e?: React.MouseEvent) => void;
  onEditSection: (section: SectionItem) => void;
  onUpdateChannel: (chId: string, field: 'name' | 'mic' | 'stand', val: string) => void;
  onAddChannel: () => void;
  onDeleteChannel: (chId: string) => void;
  onExport: () => void;
  onOpenStagePlot: () => void;
}

export function DocumentEditorPanel({
  riderTitle,
  artistName,
  season,
  riderType,
  sections,
  channels,
  completedSectionIds,
  onToggleComplete,
  onEditSection,
  onUpdateChannel,
  onAddChannel,
  onDeleteChannel,
  onExport,
  onOpenStagePlot
}: DocumentEditorPanelProps) {
  return (
    <main className="flex-1 h-full overflow-y-auto p-6 sm:p-10 space-y-6">
      {/* Encabezado del Documento Oficial */}
      <div className="bg-white rounded-[32px] p-8 border border-slate-200/80 shadow-[0_12px_36px_-10px_rgba(100,116,139,0.06)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-violet-100/50 via-transparent to-transparent -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-100">
                Documento de Gira Oficial
              </span>
              {season ? (
                <span className="text-[11px] font-semibold text-slate-400">
                  • {season}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-300 italic">
                  • Sin temporada asignada
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {artistName || (
                <span className="text-slate-300 font-bold italic">
                  Nombre del Artista / Banda
                </span>
              )}
            </h1>
            <p className="text-sm font-semibold text-slate-500">
              {riderTitle}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/60">
              Versión v1.0 • Oficial
            </span>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <Icon name="map" className="w-4 h-4 text-slate-400" />
            <span>Recinto: Escenario Principal / Venue</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="clock" className="w-4 h-4 text-slate-400" />
            <span>Última revisión: Hoy</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="shield" className="w-4 h-4 text-emerald-500" />
            <span className="text-emerald-700 font-semibold">Cláusula de Cumplimiento Contractual</span>
          </div>
        </div>
      </div>

      {/* Lista de Tarjetas de Sección */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isCompleted = completedSectionIds.includes(section.id);
          const isInputListSection = section.id === 'tech-inputlist';

          return (
            <div
              key={section.id}
              id={section.id}
              className={`bg-white rounded-[28px] p-6 border transition-all shadow-xs ${
                isCompleted 
                  ? 'border-emerald-200/80 bg-white/90' 
                  : 'border-slate-200/80 hover:border-violet-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/60">
                    <Icon name={section.iconName || 'fileText'} className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-400">
                        {section.num}
                      </span>
                      <h2 className="text-base font-extrabold text-slate-900 leading-snug">
                        {section.title}
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                        {section.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {section.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditSection(section)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                    title="Editar detalles y texto"
                  >
                    <Icon name="edit" className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onToggleComplete(section.id, e)}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      isCompleted
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                    }`}
                    title={isCompleted ? 'Sección completa' : 'Marcar completa'}
                  >
                    <Icon name="check" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contenido / Especificaciones de la sección */}
              {section.content && section.content.trim() !== '' ? (
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  {section.content}
                </div>
              ) : (
                <div
                  onClick={() => onEditSection(section)}
                  className="mt-4 pt-3 pb-3 border-t border-dashed border-slate-200 text-xs text-slate-400 font-medium italic flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50/40 hover:bg-violet-50/40 hover:border-violet-200 hover:text-slate-600 transition-all cursor-pointer group/placeholder"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover/placeholder:bg-violet-400" />
                    Sección sin contenido prellenado. Haz clic para redactar especificaciones...
                  </span>
                  <span className="text-[11px] font-bold text-violet-600 not-italic bg-white px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs group-hover/placeholder:border-violet-300">
                    + Redactar
                  </span>
                </div>
              )}

              {/* Render de Input List interactivo para sección técnica 05 */}
              {isInputListSection && riderType === 'tecnico' && (
                <InputListTable
                  channels={channels}
                  onUpdateChannel={onUpdateChannel}
                  onAddChannel={onAddChannel}
                  onDeleteChannel={onDeleteChannel}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Botones de Acción de Pie */}
      <div className="pt-4 pb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-400 font-medium">
          Rider Studio • Cumple con normativas internacionales de audio y seguridad.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenStagePlot}
            className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <Icon name="map" className="w-3.5 h-3.5 text-slate-500" />
            <span>Generar Stage Plot 2D</span>
          </button>
          <button
            type="button"
            onClick={onExport}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition-all shadow-md shadow-violet-500/25 cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <Icon name="download" className="w-3.5 h-3.5" />
            <span>Exportar Documento Oficial</span>
          </button>
        </div>
      </div>
    </main>
  );
}
