import React from 'react';
import { Icon } from './Icon';

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-[80] max-w-[calc(100vw-32px)] bg-slate-900/95 backdrop-blur-xs text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs sm:text-sm font-medium animate-fade-in-down pointer-events-none">
      <Icon name="sparkles" className="w-4 h-4 text-amber-400 shrink-0" />
      <span className="truncate sm:whitespace-normal">{message}</span>
    </div>
  );
}
