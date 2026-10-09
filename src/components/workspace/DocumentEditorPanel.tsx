"use client";

import React from 'react';
import { Icon } from '../common/Icon';
import { InputListTable } from './InputListTable';
import { StagePlotView } from './StagePlotView';
import { SectionItem, RiderType, ChannelData, StagePlotConfig } from '@/core/types/rider.types';
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
  onDeleteSection?: (sectionId: string, title: string) => void;
  onUpdateChannel: (chId: string, field: keyof ChannelData, val: string | boolean) => void;
  onAddChannel: () => void;
  onDeleteChannel: (chId: string) => void;
  onExport: () => void;
  onOpenStagePlot: () => void;
  onSaveRider?: () => void;
  isSaving?: boolean;
  dbSyncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  onUpdateArtistName?: (val: string) => void;
  onUpdateSeason?: (val: string) => void;
  stagePlot: StagePlotConfig;
  onUpdateStagePlot?: (newConfig: StagePlotConfig) => void;
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
  onDeleteSection,
  onUpdateChannel,
  onAddChannel,
  onDeleteChannel,
  onExport,
  onOpenStagePlot,
  onSaveRider,
  isSaving = false,
  dbSyncStatus = 'idle',
  onUpdateArtistName,
  onUpdateSeason,
  stagePlot,
  onUpdateStagePlot
}: DocumentEditorPanelProps) {
  return (
    <main className="flex-1 h-full overflow-y-auto p-3.5 sm:p-6 md:p-10 space-y-4 sm:space-y-6 pb-28 xl:pb-10 overscroll-contain">
      {/* Encabezado del Documento Oficial */}
      <div className="bg-white rounded-2xl sm:rounded-[32px] p-4 sm:p-8 border border-slate-200/80 shadow-[0_12px_36px_-10px_rgba(100,116,139,0.06)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-violet-100/50 via-transparent to-transparent -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5 sm:pb-6">
          <div className="space-y-1.5 flex-1 min-w-0 w-full pr-0 lg:pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-100 shrink-0">
                Documento de Gira Oficial
              </span>
              {onUpdateSeason ? (
                <input
                  type="text"
                  value={season}
                  onChange={(e) => onUpdateSeason(e.target.value)}
                  placeholder="Temporada (ej: Gira 2026)"
                  className="text-xs sm:text-[11px] font-semibold text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-violet-500 outline-none px-1"
                />
              ) : season ? (
                <span className="text-xs sm:text-[11px] font-semibold text-slate-400">
                  • {season}
                </span>
              ) : (
                <span className="text-xs sm:text-[11px] font-medium text-slate-300 italic">
                  • Sin temporada asignada
                </span>
              )}
            </div>

            {onUpdateArtistName ? (
              <input
                type="text"
                value={artistName}
                onChange={(e) => onUpdateArtistName(e.target.value)}
                placeholder="Nombre del Artista / Banda..."
                className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight bg-transparent border-b border-transparent hover:border-slate-300 focus:border-violet-500 outline-none w-full transition-all pb-0.5 placeholder:text-slate-300 placeholder:italic placeholder:font-bold"
              />
            ) : (
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {artistName || (
                  <span className="text-slate-300 font-bold italic">
                    Nombre del Artista / Banda
                  </span>
                )}
              </h1>
            )}

            <p className="text-xs sm:text-sm font-semibold text-slate-500">
              {riderTitle}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
            {onSaveRider && (
              <button
                type="button"
                onClick={onSaveRider}
                disabled={isSaving}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                  dbSyncStatus === 'saved'
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/20'
                }`}
                title="Guardar Rider en base de datos"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : dbSyncStatus === 'saved' ? (
                  <>
                    <Icon name="check" className="w-3.5 h-3.5" />
                    <span>Guardado</span>
                  </>
                ) : (
                  <>
                    <Icon name="database" className="w-3.5 h-3.5" />
                    <span>Guardar Rider</span>
                  </>
                )}
              </button>
            )}
            <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/60 shrink-0">
              Versión v1.0 • Oficial
            </span>
          </div>
        </div>

        {/* Metadatos en formato adaptativo para móviles */}
        <div className="pt-4 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-6 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <Icon name="map" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Recinto: Escenario Principal / Venue</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="clock" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Última revisión: Hoy</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="shield" className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-emerald-700 font-semibold">Cláusula de Cumplimiento Contractual</span>
          </div>
        </div>
      </div>

      {/* Lista de Tarjetas de Sección */}
      <div className="space-y-3.5 sm:space-y-4">
        {sections.map((section) => {
          const isCompleted = completedSectionIds.includes(section.id);
          const isInputListSection = section.id === 'tech-inputlist';
          const isStagePlotSection = section.id === 'tech-stageplot' || section.iconName === 'map';

          return (
            <div
              key={section.id}
              id={section.id}
              className={`bg-white rounded-2xl sm:rounded-[28px] p-4 sm:p-6 border transition-all shadow-xs ${
                isCompleted 
                  ? 'border-emerald-200/80 bg-white/95' 
                  : 'border-slate-200/80 hover:border-violet-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/60">
                    <Icon name={section.iconName || 'fileText'} className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-black text-slate-400 shrink-0">
                        {section.num}
                      </span>
                      <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                        {section.title}
                      </h2>
                      <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 shrink-0">
                        {section.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {section.subtitle}
                    </p>
                  </div>
                </div>

                {/* Acciones de sección táctiles */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditSection(section)}
                    className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
                    title="Editar detalles y texto"
                  >
                    <Icon name="edit" className="w-4 h-4" />
                  </button>
                  {onDeleteSection && (
                    <button
                      type="button"
                      onClick={() => onDeleteSection(section.id, section.title)}
                      className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 flex items-center justify-center transition-all cursor-pointer"
                      title={`Eliminar sección "${section.title}"`}
                    >
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => onToggleComplete(section.id, e)}
                    className={`w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isCompleted
                        ? 'text-emerald-600 bg-emerald-50 active:bg-emerald-100'
                        : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 active:bg-slate-200'
                    }`}
                    title={isCompleted ? 'Sección completa' : 'Marcar completa'}
                  >
                    <Icon name="check" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contenido / Especificaciones de la sección */}
              {section.content && section.content.trim() !== '' ? (
                <div className="mt-3.5 sm:mt-4 pt-3.5 sm:pt-4 border-t border-slate-100 text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-line bg-slate-50/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100">
                  {section.content}
                </div>
              ) : (
                <div
                  onClick={() => onEditSection(section)}
                  className="mt-3.5 sm:mt-4 pt-3 pb-3 border-t border-dashed border-slate-200 text-xs text-slate-400 font-medium italic flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-50/40 hover:bg-violet-50/40 hover:border-violet-200 hover:text-slate-600 transition-all cursor-pointer group/placeholder"
                >
                  <span className="flex items-center gap-2 truncate pr-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover/placeholder:bg-violet-400 shrink-0" />
                    <span className="truncate">Sección sin contenido prellenado. Toca para redactar...</span>
                  </span>
                  <span className="text-[11px] font-bold text-violet-600 not-italic bg-white px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs group-hover/placeholder:border-violet-300 shrink-0">
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

              {/* Render del Stage Plot 2D interactivo para la sección de tarima */}
              {isStagePlotSection && riderType === 'tecnico' && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <StagePlotView
                    stagePlot={stagePlot}
                    onUpdateStagePlot={onUpdateStagePlot}
                    artistName={artistName}
                    riderTitle={riderTitle}
                    season={season}
                    channels={channels}
                    onOpenModal={onOpenStagePlot}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Botones de Acción de Pie adaptativos */}
      <div className="pt-3 pb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <p className="text-xs text-slate-400 font-medium text-center md:text-left">
          Rider Studio • Cumple con normativas internacionales de audio y seguridad.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {onSaveRider && (
            <button
              type="button"
              onClick={onSaveRider}
              disabled={isSaving}
              className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-60 ${
                dbSyncStatus === 'saved'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'bg-white hover:bg-violet-50 text-violet-700 border border-violet-200 hover:border-violet-300'
              }`}
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                  <span>Guardando cambios...</span>
                </>
              ) : dbSyncStatus === 'saved' ? (
                <>
                  <Icon name="check" className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Guardado en BD</span>
                </>
              ) : (
                <>
                  <Icon name="database" className="w-3.5 h-3.5 text-violet-600" />
                  <span>Guardar Rider</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenStagePlot}
            className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Icon name="map" className="w-3.5 h-3.5 text-slate-500" />
            <span>Generar Stage Plot 2D</span>
          </button>
          <button
            type="button"
            onClick={onExport}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition-all shadow-md shadow-violet-500/25 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Icon name="download" className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>
      </div>
    </main>
  );
}
