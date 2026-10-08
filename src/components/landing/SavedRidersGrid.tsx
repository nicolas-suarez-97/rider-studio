"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '../common/Icon';
import { SavedRiderSummary, RiderType } from '@/core/types/rider.types';

interface SavedRidersGridProps {
  riders: SavedRiderSummary[];
  onOpenRider: (rider: SavedRiderSummary) => void;
  onDeleteRider: (riderId: string, e?: React.MouseEvent) => void;
  onNewRider: () => void;
}

export function SavedRidersGrid({
  riders,
  onOpenRider,
  onDeleteRider,
  onNewRider
}: SavedRidersGridProps) {
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  const filteredRiders = riders.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs">
            <Icon name="database" className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-800">
            Riders Guardados
          </h2>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {riders.length}
          </span>
        </div>

        {/* Filtros de Estado */}
        <div className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200/60 text-xs">
          {(['all', 'in_progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-full font-bold transition-all cursor-pointer text-center ${
                filter === f
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'in_progress' ? 'En Progreso' : 'Completados'}
            </button>
          ))}
        </div>
      </div>

      {filteredRiders.length === 0 ? (
        <div className="bg-white/80 rounded-3xl p-10 border border-slate-200/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
            📋
          </div>
          <h3 className="text-sm font-bold text-slate-700">
            No hay riders en esta categoría
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Selecciona una de las plantillas superiores o crea un nuevo rider técnico para comenzar.
          </p>
          <button
            onClick={onNewRider}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            + Crear Nuevo Rider
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRiders.map((rider) => {
            const typeLabels: Record<RiderType, { label: string; color: string }> = {
              tecnico: { label: 'Técnico', color: 'bg-violet-50 text-violet-700 border-violet-100' },
              hospitality: { label: 'Hospitality', color: 'bg-sky-50 text-sky-700 border-sky-100' },
              seguridad: { label: 'Seguridad', color: 'bg-amber-50 text-amber-700 border-amber-100' }
            };
            const meta = typeLabels[rider.type] || typeLabels.tecnico;

            return (
              <div
                key={rider.id}
                onClick={() => onOpenRider(rider)}
                className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 hover:border-violet-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3.5 sm:space-y-4 relative"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${meta.color}`}>
                      {meta.label}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => onDeleteRider(rider.id, e)}
                      className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 active:bg-rose-100 p-2 sm:p-1.5 rounded-xl transition-all cursor-pointer"
                      title="Eliminar de la base de datos"
                    >
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-violet-600 transition-colors mt-2 leading-snug">
                    {rider.artist}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {rider.tour}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">Progreso</span>
                    <span className="text-slate-700 font-bold">{rider.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${rider.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                    <span>{rider.sectionsCompleted} de {rider.totalSections} secciones</span>
                    <span>{rider.lastEdited}</span>
                  </div>

                  {/* Vínculo de Chat */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    {rider.linkedSessions && rider.linkedSessions.length > 0 ? (
                      <Link
                        href={`/chat?session=${rider.linkedSessions[0].id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-bold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        title="Ver conversación asociada"
                      >
                        <Icon name="messageSquare" className="w-3 h-3" />
                        <span>{rider.linkedSessions.length} chat{rider.linkedSessions.length > 1 ? 's' : ''}</span>
                        <span className="text-[10px]">↗</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/chat?riderId=${rider.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-bold text-slate-400 hover:text-violet-600 hover:bg-violet-50 px-2 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                        title="Iniciar nueva consulta sobre este rider"
                      >
                        <Icon name="plus" className="w-3 h-3" />
                        <span>Iniciar Chat</span>
                      </Link>
                    )}
                    <span className="text-violet-600 group-hover:translate-x-0.5 transition-transform font-bold text-xs flex items-center gap-0.5">
                      Editar <span>→</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
