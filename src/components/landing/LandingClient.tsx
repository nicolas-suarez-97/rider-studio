"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { Toast } from '@/components/common/Toast';
import { HeroSection } from '@/components/landing/HeroSection';
import { TemplatePills } from '@/components/landing/TemplatePills';
import { RecentChatsCard } from '@/components/landing/RecentChatsCard';
import { SavedRidersGrid } from '@/components/landing/SavedRidersGrid';
import { riderService } from '@/core/services/rider.service';
import { chatService } from '@/core/services/chat.service';
import { SavedRiderSummary, RiderType } from '@/core/types/rider.types';
import { ChatSessionSummary } from '@/core/types/chat.types';

interface LandingClientProps {
  initialRiders: SavedRiderSummary[];
  initialConversations: ChatSessionSummary[];
}

export function LandingClient({ initialRiders, initialConversations }: LandingClientProps) {
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savedRiders, setSavedRiders] = useState<SavedRiderSummary[]>(initialRiders);
  const [conversations, setConversations] = useState<ChatSessionSummary[]>(initialConversations);

  const [prevRiders, setPrevRiders] = useState(initialRiders);
  const [prevConvs, setPrevConvs] = useState(initialConversations);

  // Sincronizar estado durante el render si cambiaron las props
  if (initialRiders !== prevRiders) {
    setPrevRiders(initialRiders);
    setSavedRiders(initialRiders);
  }

  if (initialConversations !== prevConvs) {
    setPrevConvs(initialConversations);
    setConversations(initialConversations);
  }

  // Recargar datos en caliente cuando la ventana vuelve a ser visible
  useEffect(() => {
    let isCancelled = false;

    async function fetchFreshData() {
      try {
        const [riders, sess] = await Promise.all([
          riderService.getAll(),
          chatService.getSessions()
        ]);
        if (!isCancelled) {
          if (Array.isArray(riders)) {
            setSavedRiders(riders.map(r => r.toSummary()));
          }
          if (Array.isArray(sess)) {
            setConversations(sess);
          }
        }
      } catch (err) {
        console.warn('[LandingClient] Error refrescando datos:', err);
      }
    }

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        fetchFreshData();
      }
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      isCancelled = true;
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectType = (type: RiderType) => {
    showToast(`✨ Abriendo plantilla en blanco de Rider ${type.toUpperCase()}...`);
    router.push(`/workspace?type=${type}`);
  };

  const handleOpenRider = (rider: SavedRiderSummary) => {
    showToast(`Cargando rider de "${rider.artist}"...`);
    router.push(`/workspace?id=${rider.id}`);
  };

  const handleDeleteRider = async (riderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm('¿Seguro que deseas eliminar este rider de la base de datos?');
    if (!confirmed) return;

    const ok = await riderService.delete(riderId);
    if (ok) {
      setSavedRiders(prev => prev.filter(r => r.id !== riderId));
      showToast('🗑️ Rider eliminado correctamente de Supabase');
    } else {
      showToast('⚠️ Error al eliminar el rider');
    }
  };

  const handleSelectConversation = (convId: string) => {
    router.push(`/chat?session=${convId}`);
  };

  const handleNewConversation = () => {
    router.push('/chat');
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = window.confirm('¿Seguro que deseas eliminar esta conversación?');
    if (!ok) return;

    const success = await chatService.deleteSession(convId);
    if (success) {
      setConversations(prev => prev.filter(c => c.id !== convId));
      setSavedRiders(prev => prev.map(r => ({
        ...r,
        linkedSessions: r.linkedSessions?.filter(s => s.id !== convId)
      })));
      showToast('🗑️ Conversación eliminada');
    } else {
      showToast('⚠️ No se pudo eliminar la conversación');
    }
  };

  const handleSubmitPrompt = (prompt: string) => {
    router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="min-h-dvh bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans antialiased pb-12 relative overflow-hidden">
      {/* Sutil halo de iluminación ambiental de escenario */}
      <div 
        className="absolute top-0 inset-x-0 h-[520px] bg-[radial-gradient(ellipse_70%_60%_at_50%_-15%,rgba(139,92,246,0.14),rgba(248,249,250,0))] pointer-events-none -z-0" 
        aria-hidden="true"
      />
      
      <Toast message={toastMessage} />
      
      <Header pageType="landing" />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-6 sm:space-y-8">
        <HeroSection onSubmitPrompt={handleSubmitPrompt} />
        
        <TemplatePills onSelectType={handleSelectType} />

        <RecentChatsCard
          conversations={conversations}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />

        <SavedRidersGrid
          riders={savedRiders}
          onOpenRider={handleOpenRider}
          onDeleteRider={handleDeleteRider}
          onNewRider={() => handleSelectType('tecnico')}
        />
      </main>
    </div>
  );
}
