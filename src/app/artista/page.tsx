import { Suspense } from 'react';
import { connection } from 'next/server';
import { getRiders, getChatSessions } from '@/lib/services/rider-storage';
import { Rider } from '@/core/models/Rider';
import { ChatSessionSummary } from '@/core/types/chat.types';
import { SavedRiderSummary } from '@/core/types/rider.types';
import { LandingClient } from '@/components/landing/LandingClient';

async function HomeServer() {
  await connection();
  const [rawRiders, rawSessions] = await Promise.all([
    getRiders(),
    getChatSessions()
  ]);

  const savedRiders: SavedRiderSummary[] = rawRiders.map((row) => {
    const rider = Rider.fromDatabase(row);
    return rider.toSummary();
  });

  const conversations: ChatSessionSummary[] = rawSessions.map((s, idx) => ({
    id: s.id,
    title: s.title || 'Consulta de Producción',
    date: (s.updated_at || s.created_at)
      ? new Date(s.updated_at || s.created_at).toLocaleDateString([], {
          month: 'short',
          day: 'numeric'
        })
      : '',
    active: idx === 0,
    riderId: s.rider_id || null,
    riderInfo: s.riders
      ? {
          id: s.riders.id,
          title: s.riders.title,
          artistName: s.riders.artist_name,
          riderType: s.riders.rider_type as 'tecnico' | 'hospitality' | 'seguridad'
        }
      : null
  }));

  return (
    <LandingClient
      initialRiders={savedRiders}
      initialConversations={conversations}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center text-slate-500 font-bold text-sm">
        <span className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-3" />
        Cargando Rider Studio...
      </div>
    }>
      <HomeServer />
    </Suspense>
  );
}
