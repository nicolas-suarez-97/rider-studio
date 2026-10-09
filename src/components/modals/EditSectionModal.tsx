"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
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

interface EditSectionModalContentProps {
  section: SectionItem;
  onClose: () => void;
  onSave: (updatedSection: SectionItem) => void;
  onDelete: (sectionId: string, sectionTitle: string) => void;
}

interface CustomFieldItem {
  id: string;
  label: string;
  value: string;
}

function EditSectionModalContent({
  section,
  onClose,
  onSave,
  onDelete
}: EditSectionModalContentProps) {
  const sectionConfig: SectionConfig | undefined = useMemo(() => {
    return SECTION_FIELD_CONFIGS[section.id];
  }, [section.id]);

  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState<SectionItem>(() => ({ ...section }));
  const [editMode, setEditMode] = useState<'structured' | 'raw'>(() => {
    return SECTION_FIELD_CONFIGS[section.id] ? 'structured' : 'raw';
  });
  const [showPreview, setShowPreview] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Inicialización de campos estructurados predefinidos
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const config = SECTION_FIELD_CONFIGS[section.id];
    if (!config) return {};

    const contentLines = (section.content || '').split('\n');
    const initialVals: Record<string, string> = {};

    config.fields.forEach((f) => {
      const matchingLine = contentLines.find((line) => {
        const clean = line.replace(/^[•\-*]\s*/, '').trim();
        return clean.toLowerCase().startsWith(f.prefix.toLowerCase());
      });

      if (matchingLine) {
        const clean = matchingLine.replace(/^[•\-*]\s*/, '').trim();
        const parts = clean.split(/:\s*(.+)/);
        initialVals[f.key] = parts[1] ? parts[1].trim() : '';
      } else {
        initialVals[f.key] = '';
      }
    });

    return initialVals;
  });

  // Inicialización de campos personalizados (líneas no contempladas en la plantilla predefinida)
  const [customFields, setCustomFields] = useState<CustomFieldItem[]>(() => {
    const config = SECTION_FIELD_CONFIGS[section.id];
    const contentLines = (section.content || '').split('\n').filter(l => l.trim() !== '');
    if (!config) return [];

    const extraFields: CustomFieldItem[] = [];
    contentLines.forEach((line) => {
      const clean = line.replace(/^[•\-*]\s*/, '').trim();
      const matchesConfig = config.fields.some((f) =>
        clean.toLowerCase().startsWith(f.prefix.toLowerCase())
      );

      if (!matchesConfig && clean.length > 0) {
        const parts = clean.split(/:\s*(.+)/);
        if (parts.length >= 2 && parts[0].trim()) {
          extraFields.push({
            id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            label: parts[0].trim(),
            value: parts[1] ? parts[1].trim() : ''
          });
        } else {
          extraFields.push({
            id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            label: 'Requerimiento Extra',
            value: clean
          });
        }
      }
    });

    return extraFields;
  });

  // Atajos de teclado: Esc para cerrar, Cmd/Ctrl + Enter para guardar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onSave(formData);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, onClose, onSave]);

  // Sincroniza el contenido del documento en texto completo
  const syncFormDataContent = (
    currentFields: Record<string, string>,
    currentCustom: CustomFieldItem[]
  ) => {
    const lines: string[] = [];
    if (sectionConfig) {
      sectionConfig.fields.forEach((f) => {
        const val = currentFields[f.key];
        if (val && val.trim() !== '') {
          lines.push(`• ${f.prefix}: ${val.trim()}`);
        }
      });
    }
    currentCustom.forEach((c) => {
      if (c.value && c.value.trim() !== '') {
        const label = c.label.trim() || 'Requerimiento Extra';
        lines.push(`• ${label}: ${c.value.trim()}`);
      }
    });
    setFormData((prev) => ({ ...prev, content: lines.join('\n') }));
  };

  const handleStructuredFieldChange = (key: string, value: string) => {
    const updated = { ...fieldValues, [key]: value };
    setFieldValues(updated);
    syncFormDataContent(updated, customFields);
  };

  const handleAddCustomField = () => {
    const newField: CustomFieldItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: 'Nuevo Requerimiento',
      value: ''
    };
    const updated = [...customFields, newField];
    setCustomFields(updated);
    syncFormDataContent(fieldValues, updated);
  };

  const handleUpdateCustomField = (id: string, field: 'label' | 'value', text: string) => {
    const updated = customFields.map((c) => (c.id === id ? { ...c, [field]: text } : c));
    setCustomFields(updated);
    syncFormDataContent(fieldValues, updated);
  };

  const handleRemoveCustomField = (id: string) => {
    const updated = customFields.filter((c) => c.id !== id);
    setCustomFields(updated);
    syncFormDataContent(fieldValues, updated);
  };

  // Cambio de modo con sincronización bidireccional
  const handleSwitchMode = (mode: 'structured' | 'raw') => {
    if (mode === 'structured' && sectionConfig && formData.content) {
      // Re-analizar las líneas escritas libremente para llenar campos y campos personalizados
      const lines = formData.content.split('\n').filter((l) => l.trim() !== '');
      const newVals: Record<string, string> = {};
      const newCustom: CustomFieldItem[] = [];

      sectionConfig.fields.forEach((f) => {
        const match = lines.find((l) => {
          const clean = l.replace(/^[•\-*]\s*/, '').trim();
          return clean.toLowerCase().startsWith(f.prefix.toLowerCase());
        });
        if (match) {
          const clean = match.replace(/^[•\-*]\s*/, '').trim();
          const parts = clean.split(/:\s*(.+)/);
          newVals[f.key] = parts[1] ? parts[1].trim() : '';
        } else {
          newVals[f.key] = fieldValues[f.key] || '';
        }
      });

      lines.forEach((l) => {
        const clean = l.replace(/^[•\-*]\s*/, '').trim();
        const matchesPredefined = sectionConfig.fields.some((f) =>
          clean.toLowerCase().startsWith(f.prefix.toLowerCase())
        );
        if (!matchesPredefined && clean.length > 0) {
          const parts = clean.split(/:\s*(.+)/);
          if (parts.length >= 2 && parts[0].trim()) {
            newCustom.push({
              id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              label: parts[0].trim(),
              value: parts[1] ? parts[1].trim() : ''
            });
          } else {
            newCustom.push({
              id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              label: 'Requerimiento Extra',
              value: clean
            });
          }
        }
      });

      setFieldValues(newVals);
      setCustomFields(newCustom);
    }
    setEditMode(mode);
  };

  // Controles rápidos de formato para el Editor Libre
  const insertAtCursor = (prefix: string, suffix: string = '') => {
    const textarea = rawTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = `${prefix}${selectedText || ''}${suffix}`;

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setFormData((prev) => ({ ...prev, content: newText }));

    setTimeout(() => {
      textarea.focus();
      const newCursor = start + prefix.length + (selectedText ? selectedText.length : 0);
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  };

  const handleCleanEmptyLines = () => {
    if (!formData.content) return;
    const cleaned = formData.content
      .split('\n')
      .map((l) => l.trim())
      .filter((l, idx, arr) => !(l === '' && arr[idx - 1] === ''))
      .join('\n');
    setFormData((prev) => ({ ...prev, content: cleaned }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <motion.form 
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-t-[28px] sm:rounded-[32px] max-w-3xl w-full max-h-[92dvh] sm:max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
      >
        {/* Header del Modal */}
        <div className="px-5 sm:px-7 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center font-bold text-sm border border-violet-100/80 shadow-2xs shrink-0">
              <Icon name={formData.iconName || 'edit'} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200/60 shrink-0">
                  Sección {formData.num}
                </span>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight truncate">
                  {formData.title}
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                Personaliza los requerimientos de esta sección para el documento oficial
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all text-xs font-bold cursor-pointer shrink-0"
            title="Cerrar (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo del Formulario con Scroll */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-5 flex-1 overscroll-contain">
          {/* Metadatos Básicos de la Sección */}
          <div className="p-3.5 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Título de la Sección *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all shadow-2xs"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Subtítulo / Resumen
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all shadow-2xs"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Etiqueta / Tag
                </label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  className="w-full bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Selector de Modo: Segmented Control unificado */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
              <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 self-start">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('structured')}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    editMode === 'structured'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon name="list" className={`w-3.5 h-3.5 ${editMode === 'structured' ? 'text-violet-600' : 'text-slate-400'}`} />
                  <span>Campos Guiados</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchMode('raw')}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    editMode === 'raw'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon name="edit" className={`w-3.5 h-3.5 ${editMode === 'raw' ? 'text-violet-600' : 'text-slate-400'}`} />
                  <span>Editor Libre</span>
                </button>
              </div>

              <span className="text-[11px] font-medium text-slate-400">
                {editMode === 'structured' 
                  ? 'Formulario guiado con chips y opción de campos personalizados' 
                  : 'Editor de texto enriquecido con botones rápidos de formato'}
              </span>
            </div>

            {/* MODO 1: Campos Estructurados */}
            {editMode === 'structured' && (
              <div className="space-y-4">
                {sectionConfig ? (
                  <div className="space-y-4">
                    {/* Campos Base Predefinidos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {sectionConfig.fields.map((field) => (
                        <div key={field.key} className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 block">
                            {field.label}
                          </label>
                          <textarea
                            rows={2}
                            value={fieldValues[field.key] || ''}
                            onChange={(e) => handleStructuredFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-slate-50/60 hover:bg-slate-100/50 focus:bg-white border border-slate-200/90 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all resize-none font-medium leading-relaxed shadow-2xs"
                          />
                          {field.chips && field.chips.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {field.chips.map((chip) => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => {
                                    const current = fieldValues[field.key] || '';
                                    if (!current.trim()) {
                                      handleStructuredFieldChange(field.key, chip);
                                    } else if (!current.includes(chip)) {
                                      handleStructuredFieldChange(field.key, `${current}, ${chip}`);
                                    }
                                  }}
                                  className="text-[10px] font-semibold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200/70 px-2 py-0.5 rounded-md transition-all active:scale-95 cursor-pointer"
                                  title={`Insertar "${chip}"`}
                                >
                                  + {chip}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Campos Personalizados Dinámicos Añadidos por el Usuario */}
                    {customFields.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                            Campos Adicionales Personalizados ({customFields.length})
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {customFields.map((cField) => (
                            <div key={cField.id} className="space-y-1.5 p-3 rounded-xl bg-violet-50/40 border border-violet-100 relative group">
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={cField.label}
                                  onChange={(e) => handleUpdateCustomField(cField.id, 'label', e.target.value)}
                                  placeholder="Nombre del requerimiento..."
                                  className="text-xs font-bold text-violet-900 bg-white/80 px-2 py-0.5 rounded-md border border-violet-200/80 outline-none focus:border-violet-500 w-full"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomField(cField.id)}
                                  className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer shrink-0"
                                  title="Eliminar este campo"
                                >
                                  <Icon name="trash" className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <textarea
                                rows={2}
                                value={cField.value}
                                onChange={(e) => handleUpdateCustomField(cField.id, 'value', e.target.value)}
                                placeholder="Escribe el detalle o especificación técnica requerida..."
                                className="w-full bg-white border border-slate-200/90 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 rounded-xl p-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all resize-none font-medium leading-relaxed shadow-2xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Botón para Añadir Más Campos */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100/80 border border-dashed border-violet-300 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <Icon name="plus" className="w-3.5 h-3.5 text-violet-600" />
                        <span>+ Añadir Campo Adicional a esta Sección</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-500 text-center">
                    Esta sección personalizada no cuenta con plantilla predefinida. Utiliza el <strong>Editor Libre</strong> a continuación.
                  </div>
                )}

                {/* Acordeón de Previsualización Colapsable */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="w-full flex items-center justify-between py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors group cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-slate-400 group-hover:text-slate-600 font-extrabold">
                      <Icon name="fileText" className="w-3.5 h-3.5 text-slate-400" />
                      Previsualización en el documento
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      {showPreview ? 'Ocultar' : 'Ver resultado'}
                      <Icon name={showPreview ? 'chevronUp' : 'chevronDown'} className="w-3 h-3 text-slate-400" />
                    </span>
                  </button>
                  <AnimatePresence>
                    {showPreview && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden pt-1.5"
                      >
                        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-line max-h-36 overflow-y-auto">
                          {formData.content || '(Sin contenido especificado aún)'}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* MODO 2: Editor Libre con Barra de Herramientas Friendly */}
            {editMode === 'raw' && (
              <div className="space-y-2.5">
                {/* Barra de Herramientas de Formato Rápido */}
                <div className="bg-slate-100/90 p-2 rounded-2xl border border-slate-200/70 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1 hidden sm:inline">
                      Formato:
                    </span>
                    <button
                      type="button"
                      onClick={() => insertAtCursor('\n• ')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 transition-all flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                      title="Insertar viñeta con bullet"
                    >
                      <span>•</span>
                      <span>Viñeta</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertAtCursor('\n1. ')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 transition-all flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                      title="Insertar lista numerada"
                    >
                      <span>1.</span>
                      <span>Número</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertAtCursor('**', '**')}
                      className="px-2.5 py-1 rounded-lg text-xs font-black bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 transition-all shadow-2xs active:scale-95 cursor-pointer"
                      title="Texto en negrita"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertAtCursor('\n• ⚠️ NOTA TÉCNICA: ')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-all flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                      title="Insertar llamada de atención técnica"
                    >
                      <span>⚠️</span>
                      <span>Alerta</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertAtCursor('\n• Requerimiento: [Especificación homologada]')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200/80 transition-all flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                      title="Insertar plantilla de especificación"
                    >
                      <span>📋</span>
                      <span>Plantilla</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCleanEmptyLines}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
                    title="Eliminar líneas vacías repetidas"
                  >
                    <span>Limpiar espacios</span>
                  </button>
                </div>

                {/* Área de Texto Libre */}
                <textarea
                  ref={rawTextareaRef}
                  rows={10}
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="• Requerimiento 1: Detalle de equipamiento...&#10;• Requerimiento 2: Marca homologada..."
                  className="w-full bg-slate-50/60 hover:bg-slate-100/40 focus:bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all font-mono leading-relaxed min-h-[220px]"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Presiona las herramientas superiores para añadir viñetas o resaltar texto</span>
                  <span>{(formData.content || '').split('\n').filter(Boolean).length} líneas</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Acciones Inferiores del Modal con Confirmación de 2 pasos */}
        <div className="px-5 sm:px-7 py-3.5 sm:py-4 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div>
            {!isConfirmingDelete ? (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="px-3.5 py-2 rounded-full text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Icon name="trash" className="w-3.5 h-3.5" />
                <span>Eliminar Sección</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-full px-3 py-1 animate-scale-up">
                <span className="text-xs font-bold text-rose-700">¿Eliminar definitivamente?</span>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(formData.id, formData.title);
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  Sí, eliminar
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-2 py-1 rounded-full text-xs font-medium text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial bg-violet-600 hover:bg-violet-700 text-white px-5 sm:px-6 py-2 rounded-full text-xs font-bold shadow-md shadow-violet-600/25 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer text-center"
            >
              <Icon name="check" className="w-3.5 h-3.5" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
}

export function EditSectionModal({
  section,
  onClose,
  onSave,
  onDelete
}: EditSectionModalProps) {
  if (!section) return null;

  return (
    <EditSectionModalContent
      key={section.id}
      section={section}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
}
