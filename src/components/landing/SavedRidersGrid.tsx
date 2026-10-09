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
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('in_progress');

  const filteredRiders = riders.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/90 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0">
            <Icon name="database" className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">
            Riders Guardados
          </h2>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
            {riders.length}
          </span>
        </div>

        {/* Filtros de Estado */}
        <div className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-1 bg-slate-100 p-1 rounded-full border border-slate-200/80 text-xs">
          {(['all', 'in_progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 sm:flex-initial px-3.5 py-1 rounded-full font-bold transition-all cursor-pointer text-center ${
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
        <div className="bg-white/90 rounded-3xl p-8 sm:p-10 border border-slate-200/90 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center mx-auto text-2xl shadow-2xs">
            📋
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-800">
              No hay riders en esta categoría
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto font-medium">
              Comienza seleccionando una plantilla en blanco o describe los requisitos de tu banda con el asistente IA.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={onNewRider}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs shadow-violet-500/20 cursor-pointer active:scale-95"
            >
              + Crear Rider Técnico
            </button>
            <Link
              href="/artista/workspace?type=hospitality"
              className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              + Hospitality
            </Link>
            <Link
              href="/artista/workspace?type=seguridad"
              className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              + Seguridad
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRiders.map((rider) => {
            const typeLabels: Record<RiderType, { label: string; color: string }> = {
              tecnico: { label: 'Técnico', color: 'bg-violet-50 text-violet-700 border-violet-200' },
              hospitality: { label: 'Hospitality', color: 'bg-sky-50 text-sky-700 border-sky-200' },
              seguridad: { label: 'Seguridad', color: 'bg-amber-50 text-amber-700 border-amber-200' }
            };
            const meta = typeLabels[rider.type] || typeLabels.tecnico;

            return (
              <div
                key={rider.id}
                onClick={() => onOpenRider(rider)}
                className="group bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-violet-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 relative"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${meta.color}`}>
                      {meta.label}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => onDeleteRider(rider.id, e)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 p-1.5 rounded-xl transition-all cursor-pointer"
                      title="Eliminar de la base de datos"
                    >
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-violet-600 transition-colors mt-2.5 leading-snug">
                    {rider.artist}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {rider.tour || 'Gira o producción activa'}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">Progreso</span>
                    <span className="text-slate-800 font-bold">{rider.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${rider.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-0.5 text-xs text-slate-500 font-medium">
                    <span>{rider.sectionsCompleted} de {rider.totalSections} secciones</span>
                    <span>{rider.lastEdited}</span>
                  </div>

                  {/* Vínculo de Chat */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    {rider.linkedSessions && rider.linkedSessions.length > 0 ? (
                      <Link
                        href={`/artista/chat?session=${rider.linkedSessions[0].id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-bold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer border border-violet-200/50"
                        title="Ver conversación asociada"
                      >
                        <Icon name="messageSquare" className="w-3 h-3" />
                        <span>{rider.linkedSessions.length} chat{rider.linkedSessions.length > 1 ? 's' : ''}</span>
                        <span className="text-xs">↗</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/artista/chat?riderId=${rider.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-bold text-slate-500 hover:text-violet-600 hover:bg-violet-50 px-2 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                        title="Iniciar nueva consulta sobre este rider"
                      >
                        <Icon name="plus" className="w-3 h-3" />
                        <span>Iniciar Chat</span>
                      </Link>
                    )}
                    <span className="text-violet-600 group-hover:translate-x-0.5 transition-transform font-bold text-xs flex items-center gap-1">
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
