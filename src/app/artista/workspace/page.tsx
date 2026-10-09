import { Suspense } from 'react';
import { connection } from 'next/server';
import { getRiderById, getChatSessions, getChatMessages } from '@/lib/services/rider-storage';
import { Rider } from '@/core/models/Rider';
import { RiderType } from '@/core/types/rider.types';
import { ChatMessageItem } from '@/core/types/chat.types';
import { WorkspaceClient } from '@/components/workspace/WorkspaceClient';

interface PageProps {
  searchParams: Promise<{
    id?: string;
    session?: string;
    type?: string;
  }>;
}

async function WorkspaceServer({ searchParams }: PageProps) {
  await connection();
  const { id: riderIdParam, session: sessionIdParam, type: riderTypeParam } = await searchParams;

  const validTypes: RiderType[] = ['tecnico', 'hospitality', 'seguridad'];
  const targetType: RiderType = validTypes.includes(riderTypeParam as RiderType)
    ? (riderTypeParam as RiderType)
    : 'tecnico';

  type RiderInitParams = ConstructorParameters<typeof Rider>[0];
  let initialRiderData: RiderInitParams | null = null;
  if (riderIdParam) {
    try {
      const row = await getRiderById(riderIdParam);
      if (row) {
        const domainRider = Rider.fromDatabase(row);
        initialRiderData = JSON.parse(JSON.stringify(domainRider));
      }
    } catch (e) {
      console.warn('[Workspace SSR] Error fetching rider by id:', e);
    }
  }

  if (!initialRiderData) {
    const blank = Rider.createBlank(targetType);
    initialRiderData = JSON.parse(JSON.stringify(blank));
  }

  // 2. Resolver sesión y mensajes asociados en el servidor
  let resolvedSessionId: string | null = sessionIdParam || null;
  let resolvedSessionTitle: string | null = null;
  let initialMessages: ChatMessageItem[] = [];

  try {
    const rawSessions = await getChatSessions();

    if (resolvedSessionId) {
      const found = rawSessions.find((s) => s.id === resolvedSessionId);
      if (found) {
        resolvedSessionTitle = found.title;
      }
    } else if (riderIdParam || initialRiderData?.id) {
      const targetId = riderIdParam || initialRiderData?.id;
      const associated = rawSessions.find((s) => s.rider_id === targetId);
      if (associated) {
        resolvedSessionId = associated.id;
        resolvedSessionTitle = associated.title;
      }
    }

    if (resolvedSessionId) {
      const rawMessages = await getChatMessages(resolvedSessionId);
      initialMessages = rawMessages.map((m) => ({
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
  } catch (err) {
    console.warn('[Workspace SSR] Error resolving session:', err);
  }

  return (
    <WorkspaceClient
      key={initialRiderData?.id || `${targetType}-${resolvedSessionId || 'new'}`}
      initialRiderData={initialRiderData!}
      initialSessionId={resolvedSessionId}
      initialSessionTitle={resolvedSessionTitle}
      initialMessages={initialMessages}
      initialType={targetType}
    />
  );
}

export default function WorkspacePage(props: PageProps) {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#f8f9fa] text-slate-500 font-bold text-sm">
        <span className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-3" />
        Cargando espacio de trabajo...
      </div>
    }>
      <WorkspaceServer {...props} />
    </Suspense>
  );
}
