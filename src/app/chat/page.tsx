import { Suspense } from 'react';
import { connection } from 'next/server';
import { getChatSessions, getRiders, getChatMessages } from '@/lib/services/rider-storage';
import { ChatSessionSummary, ChatMessageItem } from '@/core/types/chat.types';
import { ChatClient } from '@/components/chat/ChatClient';

interface PageProps {
  searchParams: Promise<{
    session?: string;
    riderId?: string;
    prompt?: string;
  }>;
}

async function ChatServer({ searchParams }: PageProps) {
  await connection();
  const { session: sessionIdParam, riderId: riderIdParam, prompt: promptParam } = await searchParams;

  const [rawSessions, rawRiders] = await Promise.all([
    getChatSessions(),
    getRiders()
  ]);

  const sessions: ChatSessionSummary[] = rawSessions.map((s, idx) => ({
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

  const availableRiders = rawRiders.map((r) => ({
    id: r.id,
    title: r.title,
    artist: r.artist_name,
    type: r.rider_type || 'tecnico'
  }));

  // Resolver sesión activa en el servidor
  let activeSessionId = sessionIdParam || '';

  if (!activeSessionId && riderIdParam) {
    const matching = sessions.find((s) => s.riderId === riderIdParam);
    if (matching) {
      activeSessionId = matching.id;
    }
  }

  if (!activeSessionId && sessions.length > 0) {
    activeSessionId = sessions[0].id;
  }

  let messages: ChatMessageItem[] = [];
  if (activeSessionId) {
    const rawMessages = await getChatMessages(activeSessionId);
    messages = rawMessages.map((m) => ({
      id: m.id,
      text: m.content || '',
      sender: (m.role === 'user' ? 'user' : 'ai') as 'user' | 'ai',
      time: m.created_at
        ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '',
      role: (m.agent_role as 'master' | 'audio_foh' | 'hospitality' | 'security') || 'master',
      roleName: m.role_name || 'Agente de Producción',
      roleAvatar: m.role_avatar || '🧠'
    }));
  }

  return (
    <ChatClient
      initialSessions={sessions}
      initialSessionId={activeSessionId}
      initialMessages={messages}
      initialAvailableRiders={availableRiders}
      initialPrompt={promptParam ? decodeURIComponent(promptParam) : null}
    />
  );
}

export default function ChatPage(props: PageProps) {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#f8f9fa] text-slate-500 font-bold text-sm">
        <span className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-3" />
        Cargando chat de producción...
      </div>
    }>
      <ChatServer {...props} />
    </Suspense>
  );
}
