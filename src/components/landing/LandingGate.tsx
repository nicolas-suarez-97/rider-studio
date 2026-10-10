"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { HeroSection } from '@/components/landing/HeroSection';
import { LandingStory } from '@/components/landing/LandingStory';

export function LandingGate() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');

  const enter = (role: 'artista' | 'promotor') => {
    const text = prompt.trim();
    if (role === 'artista') {
      router.push(text ? `/artista/chat?prompt=${encodeURIComponent(text)}` : '/artista');
      return;
    }
    router.push(text ? `/promotor?prompt=${encodeURIComponent(text)}` : '/promotor');
  };

  return (
    <div className="min-h-dvh bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans antialiased pb-12 relative overflow-hidden">
      <div
        className="absolute top-0 inset-x-0 h-[520px] bg-[radial-gradient(ellipse_70%_60%_at_50%_-15%,rgba(139,92,246,0.14),rgba(248,249,250,0))] pointer-events-none -z-0"
        aria-hidden="true"
      />

      <Header pageType="gate" />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-6">
        <HeroSection
          onPromptChange={setPrompt}
          onSubmitPrompt={(text) => {
            router.push(`/artista/chat?prompt=${encodeURIComponent(text)}`);
          }}
        />

        <div className="max-w-3xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <button
            type="button"
            onClick={() => enter('artista')}
            className="text-left p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-violet-300 hover:bg-violet-50/50 shadow-xs transition-all cursor-pointer active:scale-[0.99]"
          >
            <span className="block text-sm font-black text-slate-900">Soy el artista</span>
            <span className="block text-xs text-slate-500 font-medium mt-1">Armar y cerrar el rider</span>
          </button>
          <button
            type="button"
            onClick={() => enter('promotor')}
            className="text-left p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-violet-300 hover:bg-violet-50/50 shadow-xs transition-all cursor-pointer active:scale-[0.99]"
          >
            <span className="block text-sm font-black text-slate-900">Soy el promotor</span>
            <span className="block text-xs text-slate-500 font-medium mt-1">Revisar el rider y armar el contra-rider</span>
          </button>
        </div>

        <LandingStory onEnter={enter} />
      </main>
    </div>
  );
}
