"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../common/Icon';

interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSection: (section: { title: string; subtitle: string; tag: string; content: string }) => void;
  currentRiderTitle: string;
  nextSectionNum: string;
}

export function AddSectionModal({
  isOpen,
  onClose,
  onAddSection,
  currentRiderTitle,
  nextSectionNum
}: AddSectionModalProps) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [tag, setTag] = useState('Personalizado');
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddSection({ title, subtitle, tag, content });
    setTitle('');
    setSubtitle('');
    setTag('Personalizado');
    setContent('');
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.form 
          onSubmit={handleSubmit}
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: "spring", stiffness: 450, damping: 30 }}
          className="bg-white rounded-t-[28px] sm:rounded-[32px] max-w-2xl sm:max-w-3xl w-full p-4 sm:p-7 shadow-2xl border border-white flex flex-col gap-3.5 sm:gap-4 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto"
        >
          {/* Header del modal */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold shrink-0">
                <Icon name="plus" className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight truncate">
                  Nueva Sección para el Rider
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
                  {currentRiderTitle} (Sección {nextSectionNum})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all text-sm font-bold cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Presets rápidos */}
          <div className="space-y-1.5 shrink-0">
            <label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Plantillas Rápidas:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { title: 'Pirotecnia, CO2 & FX', sub: 'Chispa fría, lanzallamas y extintores CO2', tag: 'Efectos', content: 'Uso de 4x máquinas de chispa fría Sparkular y 2x cañones de CO2. Se requiere técnico certificado con extintores de CO2 dedicados en cada extremo del escenario.' },
                { title: 'Transmisión & Broadcast', sub: 'Splitter de audio aislado & cámaras', tag: 'Streaming', content: 'Salida de audio estéreo o multitrack de 32 canales mediante split pasivo transformer-isolated dedicado para la unidad móvil de televisión/streaming.' },
                { title: 'Personal Local (Crew)', sub: '6 Stagehands sobrios + 1 Runner 24h', tag: 'Personal', content: 'Se requieren 6 cargadores (stagehands) con botas de seguridad para carga y descarga, más 1 runner local bilingüe con camioneta espaciosa disponible.' },
                { title: 'Protocolo Médico', sub: 'Ambulancia soporte vital y pruebas', tag: 'Salud', content: 'Ambulancia de soporte vital con paramédico en punto de acceso rápido detrás del escenario durante todo el show y prueba de sonido.' }
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTitle(preset.title);
                    setSubtitle(preset.sub);
                    setTag(preset.tag);
                    setContent(preset.content);
                  }}
                  className="text-[10px] sm:text-[11px] bg-slate-50 hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200/70 hover:border-zinc-400 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                >
                  + {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* Campos de Formulario con fuentes >= 16px en móvil para evitar zoom involuntario */}
          <div className="space-y-3 text-xs flex-1">
            <div>
              <label className="font-extrabold text-slate-700 block mb-1">
                Título de la Sección *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej. Requisitos de Pirotecnia & Efectos"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium text-base sm:text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Subtítulo / Breve resumen
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="ej. Permisos de seguridad y CO2"
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium text-base sm:text-xs"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Etiqueta / Tag
                </label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="ej. Efectos, Seguridad, Audio..."
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium text-base sm:text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-extrabold text-slate-700 block mb-1">
                Especificaciones Técnicas / Contenido del Documento
              </label>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe detalladamente los requisitos que el promotor o venue debe cumplir para esta sección..."
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium resize-none leading-relaxed text-base sm:text-xs"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 sm:py-2 rounded-full text-xs font-bold shadow-xs shadow-violet-600/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Icon name="check" className="w-3.5 h-3.5" />
              <span>Agregar al Rider</span>
            </button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
}
