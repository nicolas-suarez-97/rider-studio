"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { Icon } from '@/components/common/Icon';
import { Toast } from '@/components/common/Toast';
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
    router.push(`/artista/workspace?type=${type}`);
  };

  const handleOpenRider = (rider: SavedRiderSummary) => {
    showToast(`Cargando rider de "${rider.artist}"...`);
    router.push(`/artista/workspace?id=${rider.id}`);
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
    router.push(`/artista/chat?session=${convId}`);
  };

  const handleNewConversation = () => {
    router.push('/artista/chat');
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">En curso</h1>
            <p className="text-sm text-slate-500 font-medium">
              Asistente, riders en progreso y conversaciones recientes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewConversation}
            className="bg-violet-600 hover:bg-violet-700 text-white h-9 px-4 rounded-full text-xs font-bold transition-all shadow-xs shadow-violet-500/25 flex items-center gap-1.5 active:scale-95 shrink-0 w-fit cursor-pointer"
          >
            <Icon name="sparkles" className="w-3.5 h-3.5" />
            Asistente
          </button>
        </div>

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
