"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../common/Icon';
import { SectionItem } from '@/core/types/rider.types';

interface EditSectionModalProps {
  section: SectionItem | null;
  onClose: () => void;
  onSave: (updatedSection: SectionItem) => void;
  onDelete: (sectionId: string, sectionTitle: string) => void;
}

export function EditSectionModal({
  section,
  onClose,
  onSave,
  onDelete
}: EditSectionModalProps) {
  const [formData, setFormData] = useState<SectionItem | null>(null);

  useEffect(() => {
    if (section) {
      setFormData({ ...section });
    } else {
      setFormData(null);
    }
  }, [section]);

  if (!section || !formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <motion.form 
          onSubmit={handleSubmit}
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={{ type: "spring", stiffness: 450, damping: 30 }}
          className="bg-white rounded-[28px] max-w-lg w-full p-6 shadow-2xl border border-white flex flex-col gap-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-zinc-800 flex items-center justify-center font-bold">
                <Icon name="edit" className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                  Editar Sección {formData.num}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Modifica título, subtítulo, etiqueta y contenido técnico
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Form fields */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-extrabold text-slate-700 block mb-1">
                Título de la Sección *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Subtítulo / Resumen
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Etiqueta / Tag
                </label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="font-extrabold text-slate-700 block mb-1">
                Especificaciones Técnicas / Contenido del Rider
              </label>
              <textarea
                rows={4}
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Escribe las especificaciones técnicas obligatorias..."
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onDelete(formData.id, formData.title);
                onClose();
              }}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Icon name="trash" className="w-3.5 h-3.5" />
              <span>Eliminar Sección</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-full text-xs font-bold shadow-xs shadow-violet-600/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Icon name="check" className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
}
