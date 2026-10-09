"use client";

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface ShareLinkModalProps {
  url: string | null;
  onClose: () => void;
  onNotify?: (message: string) => void;
}

function copyWithCommand(text: string) {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.top = '0';
  field.style.left = '0';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.focus();
  field.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  field.remove();
  return copied;
}

async function writeToClipboard(text: string) {
  if (copyWithCommand(text)) return true;

  try {
    if (!navigator.clipboard?.writeText) return false;
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error('clipboard-timeout')), 700);
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export function ShareLinkModal({ url, onClose, onNotify }: ShareLinkModalProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const copyLink = async () => {
    if (!url) return;
    const copied = await writeToClipboard(url);
    setStatus(copied ? 'copied' : 'error');
    onNotify?.(copied ? 'Enlace copiado' : 'No se pudo copiar el enlace');
  };

  return (
    <AnimatePresence>
      {url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white rounded-t-[28px] sm:rounded-[32px] max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Enlace de visualización</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Quien lo abra puede ver el rider y consultar por chat. No puede editarlo.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar"
              >
                <span className="text-slate-400 text-base leading-none" aria-hidden>×</span>
              </button>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                value={url}
                className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-medium text-slate-700 outline-none"
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                type="button"
                onClick={copyLink}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0"
              >
                Copiar
              </button>
            </div>
            {status === 'copied' && (
              <p className="mt-3 text-xs font-semibold text-emerald-600">Enlace copiado</p>
            )}
            {status === 'error' && (
              <p className="mt-3 text-xs font-semibold text-rose-600">No se pudo copiar el enlace</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
