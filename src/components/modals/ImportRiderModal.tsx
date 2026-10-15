"use client";

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@/components/common/Icon';
import { Rider } from '@/core/models/Rider';
import { DocumentSuggestion } from '@/core/types/suggestion.types';

interface ImportRiderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (result: {
    riderData: ConstructorParameters<typeof Rider>[0];
    welcomeMessage: string;
    suggestions: DocumentSuggestion[];
  }) => void;
}

type ImportPhase = 'idle' | 'uploading' | 'parsing' | 'auditing' | 'success' | 'error';

export function ImportRiderModal({ isOpen, onClose, onImportSuccess }: ImportRiderModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setErrorMessage(null);
    setPhase('uploading');
    setProgressMsg('Subiendo y extrayendo texto del documento…');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const stepTimer1 = setTimeout(() => {
        setPhase('parsing');
        setProgressMsg('Estructurando secciones e Input List con Inteligencia Artificial…');
      }, 1500);

      const stepTimer2 = setTimeout(() => {
        setPhase('auditing');
        setProgressMsg('Auditando requerimientos técnicos y preparando diagnóstico…');
      }, 4000);

      const response = await fetch('/api/riders/import', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo procesar el archivo.');
      }

      setPhase('success');
      setProgressMsg('¡Rider estructurado con éxito!');

      setTimeout(() => {
        onImportSuccess({
          riderData: data.riderData,
          welcomeMessage: data.welcomeMessage,
          suggestions: data.suggestions || [],
        });
        onClose();
        setPhase('idle');
      }, 800);
    } catch (err) {
      console.error('[ImportRiderModal] Error al procesar archivo:', err);
      setPhase('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al leer el rider. Por favor intenta de nuevo.'
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (phase !== 'idle' && phase !== 'error') return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const isWorking = phase === 'uploading' || phase === 'parsing' || phase === 'auditing';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-600/10 text-violet-600 flex items-center justify-center">
                <Icon name="upload" className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Importar Rider Existente</h3>
                <p className="text-xs text-slate-500">Sube tu PDF o Word y la IA lo estructurará en el editor</p>
              </div>
            </div>
            {!isWorking && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6 flex flex-col gap-5">
            {isWorking ? (
              <div className="py-8 flex flex-col items-center text-center gap-4">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-violet-100 animate-pulse" />
                  <div className="w-12 h-12 rounded-full border-3 border-violet-600 border-t-transparent animate-spin" />
                  <Icon name="sparkles" className="w-5 h-5 text-violet-600 absolute" />
                </div>
                <div className="max-w-xs">
                  <p className="text-sm font-bold text-slate-800 animate-pulse">{progressMsg}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Esto puede tomar entre 5 y 12 segundos según la extensión de tu documento.
                  </p>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full bg-violet-600 transition-all duration-700 ${
                      phase === 'uploading' ? 'w-1/3' : phase === 'parsing' ? 'w-2/3' : 'w-11/12'
                    }`}
                  />
                </div>
              </div>
            ) : phase === 'success' ? (
              <div className="py-8 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Icon name="check" className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">¡Rider estructurado y analizado!</p>
                <p className="text-xs text-slate-500">Abriendo en el editor y cargando diagnóstico…</p>
              </div>
            ) : (
              <>
                {/* Zona de Drop */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all ${
                    isDragging
                      ? 'border-violet-500 bg-violet-50/50 scale-[0.99]'
                      : 'border-slate-200 hover:border-violet-400 hover:bg-slate-50/80 bg-slate-50/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProcessFile(file);
                      e.target.value = '';
                    }}
                  />

                  <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-600">
                    <Icon name="fileText" className="w-6 h-6 text-violet-600" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Arrastra tu archivo aquí o <span className="text-violet-600 font-bold underline">examina</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Compatible con PDF, Word (.docx) o texto (máx. 15 MB)</p>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                      PDF
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      Word .DOCX
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      TXT / MD
                    </span>
                  </div>
                </div>

                {/* Mensaje de error si hubo fallo */}
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                    <span className="text-base shrink-0">⚠️</span>
                    <div className="flex-1">
                      <p className="font-bold">No se pudo procesar el rider</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Lo que hace el agente */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60 flex flex-col gap-2 text-xs text-slate-600">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <Icon name="sparkles" className="w-3.5 h-3.5 text-violet-600" />
                    ¿Qué hace el Agente Copilot al importar?
                  </span>
                  <ul className="space-y-1.5 text-[11px] text-slate-500 pl-4 list-disc marker:text-violet-400">
                    <li>Reconoce al artista, título de gira y separa las secciones reglamentarias.</li>
                    <li>Convierte tablas de canales en el <strong>Input List interactivo</strong> de la app.</li>
                    <li>Audita requerimientos técnicos de FOH, monitores, tarima y seguridad.</li>
                    <li>Genera sugerencias en el chat con botones para aplicarlas con un clic.</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
