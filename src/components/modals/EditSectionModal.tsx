"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../common/Icon';
import { SectionItem } from '@/core/types/rider.types';
import { SECTION_FIELD_CONFIGS, SectionConfig } from '@/core/constants/section-fields';

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
  const [editMode, setEditMode] = useState<'structured' | 'raw'>('structured');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const sectionConfig: SectionConfig | undefined = useMemo(() => {
    if (!section) return undefined;
    return SECTION_FIELD_CONFIGS[section.id];
  }, [section]);

  useEffect(() => {
    if (section) {
      setFormData({ ...section });

      // Si existe configuración para esta sección, parsear los valores iniciales del contenido
      if (SECTION_FIELD_CONFIGS[section.id]) {
        const config = SECTION_FIELD_CONFIGS[section.id];
        const contentLines = (section.content || '').split('\n');
        const initialVals: Record<string, string> = {};

        config.fields.forEach((f) => {
          // Buscar una línea que empiece con el prefijo o viñeta
          const matchingLine = contentLines.find((line) => {
            const clean = line.replace(/^[•\-\*]\s*/, '').trim();
            return clean.toLowerCase().startsWith(f.prefix.toLowerCase());
          });

          if (matchingLine) {
            const clean = matchingLine.replace(/^[•\-\*]\s*/, '').trim();
            const parts = clean.split(/:\s*(.+)/);
            initialVals[f.key] = parts[1] ? parts[1].trim() : '';
          } else {
            initialVals[f.key] = '';
          }
        });

        setFieldValues(initialVals);
        setEditMode('structured');
      } else {
        setEditMode('raw');
      }
    } else {
      setFormData(null);
    }
  }, [section]);

  if (!section || !formData) return null;

  // Actualizar un campo estructurado específico y sincronizar con formData.content
  const handleStructuredFieldChange = (key: string, value: string) => {
    const updatedFields = { ...fieldValues, [key]: value };
    setFieldValues(updatedFields);

    if (sectionConfig) {
      const filledLines = sectionConfig.fields
        .filter((f) => Boolean(updatedFields[f.key] && updatedFields[f.key].trim() !== ''))
        .map((f) => `• ${f.prefix}: ${updatedFields[f.key].trim()}`);

      const newContent = filledLines.join('\n');
      setFormData(prev => prev ? { ...prev, content: newContent } : null);
    }
  };

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
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      >
        <motion.form 
          onSubmit={handleSubmit}
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
          className="bg-white rounded-[32px] max-w-4xl w-full max-h-[92vh] shadow-2xl border border-white flex flex-col overflow-hidden"
        >
          {/* Header del Modal */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm shadow-xs border border-violet-200/50">
                <Icon name={formData.iconName || 'edit'} className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                    Sección {formData.num}
                  </span>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                    {formData.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Personaliza los requerimientos de esta sección para el documento oficial
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Cuerpo del Formulario con Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Metadatos Generales (Título, Subtítulo y Etiqueta) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60">
              <div className="sm:col-span-1">
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1 uppercase tracking-wider">
                  Título de la Sección *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none focus:border-violet-500 transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1 uppercase tracking-wider">
                  Subtítulo / Resumen
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full bg-white border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium outline-none focus:border-violet-500 transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1 uppercase tracking-wider">
                  Etiqueta / Tag
                </label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  className="w-full bg-white border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium outline-none focus:border-violet-500 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Pestañas de Modo de Edición */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMode('structured')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      editMode === 'structured'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Icon name="list" className="w-3.5 h-3.5" />
                    <span>Campos Guiados de la Sección</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditMode('raw')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      editMode === 'raw'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Icon name="edit" className="w-3.5 h-3.5" />
                    <span>Editor de Texto Completo</span>
                  </button>
                </div>

                <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                  {editMode === 'structured' ? 'Formulario estructurado para esta sección' : 'Edición libre de texto'}
                </span>
              </div>

              {/* MODO 1: Campos Estructurados Específicos para esta Sección */}
              {editMode === 'structured' && (
                <div className="space-y-4">
                  {sectionConfig ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {sectionConfig.fields.map((field) => (
                        <div key={field.key} className="space-y-1 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-violet-300 transition-all">
                          <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-violet-500" />
                            <span>{field.label}</span>
                          </label>
                          <textarea
                            rows={2}
                            value={fieldValues[field.key] || ''}
                            onChange={(e) => handleStructuredFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-violet-500 focus:bg-white transition-all resize-none font-medium leading-relaxed"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-500 text-center">
                      Esta sección personalizada no cuenta con plantilla predefinida. Utiliza el <strong>Editor de Texto Completo</strong> a continuación.
                    </div>
                  )}

                  {/* Previsualización del documento resultante */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                      Previsualización en el Documento:
                    </span>
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-line max-h-40 overflow-y-auto">
                      {formData.content || '(Sin contenido especificado aún)'}
                    </div>
                  </div>
                </div>
              )}

              {/* MODO 2: Editor de Texto Completo Amplio y Espacioso */}
              {editMode === 'raw' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold uppercase tracking-wider text-[11px]">
                      Especificaciones Técnicas / Cláusulas
                    </span>
                    <span>Puedes redactar viñetas usando • o saltos de línea</span>
                  </div>
                  <textarea
                    rows={12}
                    value={formData.content || ''}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Escribe las especificaciones técnicas obligatorias para el rider..."
                    className="w-full bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-violet-500 focus:bg-white transition-all font-mono leading-relaxed min-h-[260px]"
                  />
                </div>
              )}
            </div>

          </div>

          {/* Acciones Inferiores del Modal */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => {
                onDelete(formData.id, formData.title);
                onClose();
              }}
              className="px-3.5 py-2 rounded-full text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Icon name="trash" className="w-3.5 h-3.5" />
              <span>Eliminar Sección</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-full text-xs font-bold shadow-md shadow-violet-600/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
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
