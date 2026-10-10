"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { HeroSection, type LandingRole } from '@/components/landing/HeroSection';
import { LandingStory } from '@/components/landing/LandingStory';

export function LandingGate() {
  const router = useRouter();

  const enter = (role: LandingRole) => {
    router.push(role === 'artista' ? '/artista' : '/promotor');
  };

  return (
    <div className="min-h-dvh bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans antialiased pb-12 relative overflow-hidden">
      <div
        className="absolute top-0 inset-x-0 h-[520px] bg-[radial-gradient(ellipse_70%_60%_at_50%_-15%,rgba(139,92,246,0.14),rgba(248,249,250,0))] pointer-events-none -z-0"
        aria-hidden="true"
      />

      <Header pageType="gate" />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-6">
        <HeroSection onEnter={enter} />
        <LandingStory onEnter={enter} />
      </main>
    </div>
  );
}
