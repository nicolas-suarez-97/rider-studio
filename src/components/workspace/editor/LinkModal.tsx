"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/components/common/Icon';

interface LinkModalProps {
  isOpen: boolean;
  initialUrl?: string;
  initialText?: string;
  hasLink?: boolean;
  onApply: (url: string, text?: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}

export function LinkModal({
  isOpen,
  initialUrl = '',
  initialText = '',
  hasLink = false,
  onApply,
  onRemove,
  onClose,
}: LinkModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setText(initialText);
      // Small timeout to ensure DOM is rendered before focusing
      const timer = window.setTimeout(() => {
        if (urlInputRef.current) {
          urlInputRef.current.focus();
          urlInputRef.current.select();
        }
      }, 50);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, initialUrl, initialText]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!url.trim()) {
      if (hasLink) onRemove?.();
      else onClose();
      return;
    }
    onApply(url.trim(), text.trim());
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-[0_24px_64px_rgba(15,23,42,0.24)] border border-slate-100"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <Icon name="link" className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="link-modal-title" className="font-bold text-sm text-slate-900 leading-tight">
                    {hasLink ? 'Editar enlace' : 'Insertar enlace'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {hasLink ? 'Modifica o elimina el hipervínculo' : 'Añade una dirección web o hipervínculo'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {/* URL Field */}
              <div>
                <label htmlFor="link-modal-url" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Enlace / URL
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
                    <Icon name="link" className="w-3.5 h-3.5" />
                  </div>
                  <input
                    ref={urlInputRef}
                    id="link-modal-url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://ejemplo.com o www.ejemplo.com"
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/15 transition-all placeholder:text-slate-400"
                  />
                  {url && (
                    <button
                      type="button"
                      onClick={() => {
                        setUrl('');
                        urlInputRef.current?.focus();
                      }}
                      className="absolute right-2.5 w-4 h-4 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 flex items-center justify-center text-[10px] cursor-pointer"
                      aria-label="Borrar texto del enlace"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Text Field */}
              <div>
                <label htmlFor="link-modal-text" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Texto a mostrar <span className="font-normal text-slate-400 lowercase">(opcional)</span>
                </label>
                <input
                  id="link-modal-text"
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Texto descriptivo del enlace"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/15 transition-all placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Si se deja vacío, se mostrará el texto seleccionado o la misma URL.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div>
                  {hasLink && onRemove && (
                    <button
                      type="button"
                      onClick={onRemove}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                    >
                      <Icon name="trash" className="w-3.5 h-3.5" />
                      Quitar enlace
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!url.trim() && !hasLink}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {hasLink ? 'Guardar' : 'Aplicar'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
