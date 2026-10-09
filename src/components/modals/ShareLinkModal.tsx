"use client";

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface ShareLinkModalProps {
  url: string | null;
  onClose: () => void;
}

export function ShareLinkModal({ url, onClose }: ShareLinkModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) return;
    let active = true;
    navigator.clipboard.writeText(url).then(() => {
      if (active) setCopied(true);
    }).catch(() => {
      if (active) setCopied(false);
    });
    return () => {
      active = false;
    };
  }, [url]);

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
                onClick={() => {
                  navigator.clipboard.writeText(url).then(() => setCopied(true)).catch(() => setCopied(false));
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0"
              >
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
