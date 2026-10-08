import { createServerSupabaseClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/database.types';

export type DbRider = Database['public']['Tables']['riders']['Row'];
export type DbChatSession = Database['public']['Tables']['chat_sessions']['Row'];
export type DbChatMessage = Database['public']['Tables']['chat_messages']['Row'];

// In-memory fallback cache - empty by default (no hardcoded data)
let memoryRiders: DbRider[] = [];
let memorySessions: Record<string, DbChatSession> = {};
let memoryMessages: Record<string, DbChatMessage[]> = {};

/**
 * Obtener todos los riders
 */
export async function getRiders(): Promise<any[]> {
  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('riders')
        .select('*, chat_sessions(id, title, active_agent, updated_at)')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return (data as any[]).map(r => ({
          ...r,
          chat_sessions: Array.isArray(r.chat_sessions)
            ? r.chat_sessions.filter((cs: any) => cs.active_agent !== 'archived')
            : []
        }));
      }
    }
  }
  return memoryRiders;
}

/**
 * Obtener un rider por ID
 */
export async function getRiderById(id: string): Promise<any | null> {
  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('riders')
        .select('*, chat_sessions(id, title, active_agent, updated_at)')
        .eq('id', id)
        .single();

      if (!error && data) {
        return {
          ...(data as Record<string, any>),
          chat_sessions: Array.isArray((data as any).chat_sessions)
            ? (data as any).chat_sessions.filter((cs: any) => cs.active_agent !== 'archived')
            : []
        };
      }
    }
  }
  return memoryRiders.find(r => r.id === id) || null;
}

/**
 * Guardar o actualizar un rider
 */
export async function saveRider(rider: {
  id?: string;
  title: string;
  artist_name: string;
  rider_type?: string;
  venue_name?: string | null;
  event_date?: string | null;
  version?: string;
  status?: string;
  channels?: any[];
  sections?: any[];
  metadata?: Record<string, any>;
}): Promise<DbRider> {
  const now = new Date().toISOString();
  const id = rider.id || crypto.randomUUID();

  const record: DbRider = {
    id,
    title: rider.title,
    artist_name: rider.artist_name,
    rider_type: rider.rider_type || 'tecnico',
    venue_name: rider.venue_name || null,
    event_date: rider.event_date || null,
    version: rider.version || 'v1.0',
    status: rider.status || 'draft',
    channels: rider.channels || [],
    sections: rider.sections || [],
    metadata: rider.metadata || {},
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('riders')
        .upsert(record as any)
        .select()
        .single();

      if (!error && data) {
        return data as DbRider;
      }
      if (error) {
        console.warn('[Supabase saveRider error]', error);
      }
    }
  }

  // Memory fallback
  const existingIdx = memoryRiders.findIndex(r => r.id === id);
  if (existingIdx >= 0) {
    memoryRiders[existingIdx] = record;
  } else {
    memoryRiders.unshift(record);
  }
  return record;
}

/**
 * Eliminar un rider por ID
 */
export async function deleteRider(id: string): Promise<boolean> {
  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('riders')
        .delete()
        .eq('id', id);

      if (!error) return true;
    }
  }
  memoryRiders = memoryRiders.filter(r => r.id !== id);
  return true;
}

/**
 * Obtener todas las sesiones de chat (con riders asociados)
 */
export async function getChatSessions(): Promise<any[]> {
  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*, riders(id, title, artist_name, rider_type)')
        .neq('active_agent', 'archived')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return data as any[];
      }
    }
  }
  return Object.values(memorySessions).filter(s => s.active_agent !== 'archived');
}

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Actualizar una sesión de chat (vincular/desvincular rider, cambiar título, etc.)
 */
export async function updateChatSession(
  id: string,
  updates: {
    riderId?: string | null;
    title?: string;
    activeAgent?: string;
  }
): Promise<any | null> {
  const now = new Date().toISOString();
  const updatePayload: Record<string, any> = { updated_at: now };

  if (updates.riderId !== undefined) {
    updatePayload.rider_id = isValidUuid(updates.riderId) ? updates.riderId : null;
  }
  if (updates.title !== undefined) {
    updatePayload.title = updates.title;
  }
  if (updates.activeAgent !== undefined) {
    updatePayload.active_agent = updates.activeAgent;
  }

  if (isSupabaseServerConfigured() && isValidUuid(id)) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await (supabase
        .from('chat_sessions') as any)
        .update(updatePayload)
        .eq('id', id)
        .select('*, riders(id, title, artist_name, rider_type)')
        .single();

      if (!error && data) {
        return data;
      }
      if (error) {
        console.warn('[Supabase update chat_session error]', error);
      }
    }
  }

  if (memorySessions[id]) {
    memorySessions[id] = {
      ...memorySessions[id],
      ...updatePayload,
      updated_at: now
    };
    return memorySessions[id];
  }

  return null;
}

/**
 * Obtener o crear una sesión de chat
 */
export async function getOrCreateChatSession(
  sessionId?: string,
  riderId?: string,
  title?: string,
  activeAgent?: string
): Promise<DbChatSession> {
  const now = new Date().toISOString();
  const validProvidedId = isValidUuid(sessionId) ? sessionId : null;
  const sid = validProvidedId || crypto.randomUUID();

  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      if (validProvidedId) {
        const { data } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', validProvidedId)
          .single();
        if (data) {
          const sessionData = data as DbChatSession;
          const updatePayload: any = { updated_at: now };
          if (riderId && isValidUuid(riderId) && sessionData.rider_id !== riderId) {
            updatePayload.rider_id = riderId;
            sessionData.rider_id = riderId;
          }
          await (supabase.from('chat_sessions') as any)
            .update(updatePayload)
            .eq('id', validProvidedId);
          return { ...sessionData, updated_at: now };
        }
      }

      // Create new
      const newSession: any = {
        id: sid,
        rider_id: isValidUuid(riderId) ? riderId : null,
        title: title || 'Consulta de Producción',
        active_agent: activeAgent || 'master',
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert(newSession)
        .select()
        .single();

      if (!error && data) return data as DbChatSession;
      if (error) {
        console.warn('[Supabase create chat_session error]', error);
      }
    }
  }

  if (sessionId && memorySessions[sessionId]) {
    if (riderId && isValidUuid(riderId)) {
      memorySessions[sessionId].rider_id = riderId;
    }
    return memorySessions[sessionId];
  }

  const sessionObj: DbChatSession = {
    id: sid,
    rider_id: riderId || null,
    title: title || 'Consulta de Producción',
    active_agent: activeAgent || 'master',
    created_at: now,
    updated_at: now,
  };
  memorySessions[sid] = sessionObj;
  return sessionObj;
}

/**
 * Eliminar una sesión de chat y sus mensajes asociados.
 * Utiliza eliminación de doble capa: marca como 'archived' (garantizado con política UPDATE)
 * e intenta el borrado físico (DELETE) tanto de mensajes como de la sesión.
 */
export async function deleteChatSession(id: string): Promise<boolean> {
  if (isSupabaseServerConfigured() && isValidUuid(id)) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      // 1. Marcar como archivado para exclusión inmediata en consultas
      await (supabase.from('chat_sessions') as any).update({ active_agent: 'archived' }).eq('id', id);

      // 2. Intentar hard delete de mensajes y sesión
      await supabase.from('chat_messages').delete().eq('session_id', id);
      const { error } = await supabase.from('chat_sessions').delete().eq('id', id);
      if (error) {
        console.warn('[Supabase delete chat_session notice]', error);
      }
    }
  }
  delete memorySessions[id];
  delete memoryMessages[id];
  return true;
}


/**
 * Guardar mensaje en el historial
 */
export async function saveChatMessage(params: {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  agentRole?: string;
  roleName?: string;
  roleAvatar?: string;
  content: string;
  actions?: any[];
}): Promise<DbChatMessage> {
  const now = new Date().toISOString();
  const msgRecord: DbChatMessage = {
    id: crypto.randomUUID(),
    session_id: params.sessionId,
    role: params.role,
    agent_role: params.agentRole || null,
    role_name: params.roleName || null,
    role_avatar: params.roleAvatar || null,
    content: params.content,
    actions: params.actions || [],
    created_at: now,
  };

  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(msgRecord as any)
        .select()
        .single();

      if (!error && data) {
        return data as DbChatMessage;
      }
      if (error) {
        console.warn('[Supabase saveChatMessage error]', error);
      }
    }
  }

  if (!memoryMessages[params.sessionId]) {
    memoryMessages[params.sessionId] = [];
  }
  memoryMessages[params.sessionId].push(msgRecord);
  return msgRecord;
}

/**
 * Obtener historial de mensajes de una sesión
 */
export async function getChatMessages(sessionId: string): Promise<DbChatMessage[]> {
  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as DbChatMessage[];
      }
    }
  }

  return memoryMessages[sessionId] || [];
}
