"use client";

import React, { useState } from 'react';
import { validateGuestName } from '@/lib/share/confirm';

interface GuestNameDialogProps {
  onEnter: (name: string) => void;
}

export function GuestNameDialog({ onEnter }: GuestNameDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextError = validateGuestName(name);
    if (nextError) {
      setError(nextError);
      return;
    }
    onEnter(name.trim());
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-name-title"
        onSubmit={submit}
        className="bg-white rounded-t-[28px] sm:rounded-[32px] max-w-md w-full p-5 sm:p-7 shadow-2xl border border-white"
      >
        <h2 id="guest-name-title" className="font-extrabold text-lg text-slate-900">¿Cómo te llamas?</h2>
        <p className="text-xs text-slate-500 mt-1">
          Entras sin cuenta. Guardamos tu nombre en este dispositivo para este enlace.
        </p>
        <label className="mt-4 block">
          <span className="sr-only">Nombre</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(null);
            }}
            placeholder="Tu nombre"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
          />
        </label>
        {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-4 w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2.5 rounded-2xl text-sm font-bold"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
