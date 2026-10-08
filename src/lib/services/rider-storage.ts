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
export async function getRiders(): Promise<DbRider[]> {
  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return data as DbRider[];
      }
    }
  }
  return memoryRiders;
}

/**
 * Obtener un rider por ID
 */
export async function getRiderById(id: string): Promise<DbRider | null> {
  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return data as DbRider;
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
 * Obtener todas las sesiones de chat
 */
export async function getChatSessions(): Promise<DbChatSession[]> {
  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return data as DbChatSession[];
      }
    }
  }
  return Object.values(memorySessions);
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
  const sid = sessionId || crypto.randomUUID();

  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      if (sessionId) {
        const { data } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        if (data) return data as DbChatSession;
      }

      // Create new
      const newSession: any = {
        id: sid,
        rider_id: riderId || null,
        title: title || 'Consulta de Producción',
        active_agent: activeAgent || 'master',
        created_at: now,
        updated_at: now,
      };

      const { data } = await supabase
        .from('chat_sessions')
        .insert(newSession)
        .select()
        .single();

      if (data) return data as DbChatSession;
    }
  }

  if (sessionId && memorySessions[sessionId]) {
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
