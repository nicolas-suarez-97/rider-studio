import React from 'react';
import { Icon } from './Icon';

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-sm animate-bounce font-medium">
      <Icon name="sparkles" className="w-4 h-4 text-zinc-300" />
      {message}
    </div>
  );
}
