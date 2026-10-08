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

export default function HomePage() {
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savedRiders, setSavedRiders] = useState<SavedRiderSummary[]>([]);
  const [conversations, setConversations] = useState<ChatSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [ridersData, sessionsData] = await Promise.all([
          riderService.getAll(),
          chatService.getSessions()
        ]);
        setSavedRiders(ridersData.map(r => r.toSummary()));
        setConversations(sessionsData);
      } catch (err) {
        console.error('Error loading home data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

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
      showToast('🗑️ Conversación eliminada');
    } else {
      showToast('⚠️ No se pudo eliminar la conversación');
    }
  };

  const handleSubmitPrompt = (prompt: string) => {
    router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans select-none antialiased">
      <Toast message={toastMessage} />
      
      <Header pageType="landing" />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
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
