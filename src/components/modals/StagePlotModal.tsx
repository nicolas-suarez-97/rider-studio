"use client";

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../common/Icon';
import { ChannelData, StagePlotConfig } from '@/core/types/rider.types';
import { StagePlotView } from '../workspace/StagePlotView';

interface StagePlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistName: string;
  channels: ChannelData[];
  riderTitle?: string;
  season?: string;
  stagePlot: StagePlotConfig;
  onUpdateStagePlot?: (newConfig: StagePlotConfig) => void;
}

export function StagePlotModal({
  isOpen,
  onClose,
  artistName,
  channels,
  riderTitle = 'Rider de Producción',
  season = 'Gira Oficial',
  stagePlot,
  onUpdateStagePlot
}: StagePlotModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-xs">
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden text-slate-800"
        >
          {/* Header del Modal */}
          <div className="px-6 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/90 no-print shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Icon name="map" className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                    Editor de Stage Plot 2D (Plano de Escenario)
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                    Interactiva
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Edita la distribución espacial de instrumentos, acometidas, monitoreo y risers
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/25 active:scale-95 cursor-pointer"
              >
                <Icon name="printer" className="w-4 h-4" />
                <span>Imprimir Plano</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all flex items-center justify-center cursor-pointer ml-auto sm:ml-1"
                title="Cerrar modal"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenido Visual del Stage Plot (Imprimible y editable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/50">
            <div className="printable-dossier max-w-4xl mx-auto bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-md border border-slate-200/80 font-sans space-y-6">
              
              {/* Encabezado del Plano */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 block">
                    STAGE PLOT & TECHNICAL DISTRIBUTION
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {artistName || 'Artista / Banda'}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {riderTitle} • {season}
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs">
                  <span className="font-bold text-slate-700 block">Dimensiones de Tarima Requeridas</span>
                  <span className="font-mono text-indigo-600 font-bold">
                    {stagePlot?.stageWidth || 12}m (Ancho) × {stagePlot?.stageDepth || 10}m (Fondo) × {stagePlot?.stageHeight || 1.5}m (Alto)
                  </span>
                </div>
              </div>

              {/* Vista Interactiva con Edición */}
              <StagePlotView
                stagePlot={stagePlot}
                onUpdateStagePlot={onUpdateStagePlot}
                artistName={artistName}
                riderTitle={riderTitle}
                season={season}
                channels={channels}
              />

            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-200/80 bg-slate-50/90 flex items-center justify-between no-print shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              💡 Tip: Puedes arrastrar los elementos por el escenario o presionar &quot;Editar Plano 2D&quot; para personalizar cualquier posición.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
