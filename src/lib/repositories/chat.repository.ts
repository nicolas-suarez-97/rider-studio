import { createServerSupabaseClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { Database, Json } from '@/lib/supabase/database.types';

export type DbChatSession = Database['public']['Tables']['chat_sessions']['Row'];
export type DbChatMessage = Database['public']['Tables']['chat_messages']['Row'];

export interface LinkedRiderSummary {
  id: string;
  title: string;
  artist_name: string;
  rider_type: string;
}

export interface DbChatSessionWithRider extends DbChatSession {
  riders?: LinkedRiderSummary | null;
}

export interface SaveChatMessageInput {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  agentRole?: string | null;
  roleName?: string | null;
  roleAvatar?: string | null;
  content: string;
  actions?: Json;
}

export interface UpdateChatSessionInput {
  riderId?: string | null;
  title?: string;
  activeAgent?: string;
}

export interface IChatRepository {
  getSessions(): Promise<DbChatSessionWithRider[]>;
  getConsultSessions(): Promise<DbChatSessionWithRider[]>;
  updateSession(id: string, updates: UpdateChatSessionInput): Promise<DbChatSessionWithRider | null>;
  getOrCreateSession(sessionId?: string, riderId?: string, title?: string, activeAgent?: string): Promise<DbChatSession>;
  openConsultSession(sessionId: string | undefined, riderId: string, title: string, activeAgent: string): Promise<DbChatSession>;
  deleteSession(id: string): Promise<boolean>;
  saveMessage(params: SaveChatMessageInput): Promise<DbChatMessage>;
  getMessages(sessionId: string): Promise<DbChatMessage[]>;
}

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function isOwnerChatSession(session: { title?: string | null; active_agent?: string | null }): boolean {
  if (session.active_agent === 'archived') return false;
  return !session.title?.startsWith('consulta:');
}

// Almacenamiento seguro en memoria para modo demo / fallback
const memorySessions: Record<string, DbChatSessionWithRider> = {};
const memoryMessages: Record<string, DbChatMessage[]> = {};

export class ChatRepository implements IChatRepository {
  public async getSessions(): Promise<DbChatSessionWithRider[]> {
    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*, riders(id, title, artist_name, rider_type)')
          .neq('active_agent', 'archived')
          .order('updated_at', { ascending: false });

        if (!error && data) {
          return (data as unknown as DbChatSessionWithRider[]).filter((session) => isOwnerChatSession(session));
        }
      }
    }
    return Object.values(memorySessions).filter((session) => isOwnerChatSession(session));
  }

  public async getConsultSessions(): Promise<DbChatSessionWithRider[]> {
    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*, riders(id, title, artist_name, rider_type)')
          .like('title', 'consulta:%')
          .neq('active_agent', 'archived')
          .order('updated_at', { ascending: false });

        if (!error && data) {
          return data as unknown as DbChatSessionWithRider[];
        }
      }
    }
    return Object.values(memorySessions).filter(
      (session) => session.title?.startsWith('consulta:') && session.active_agent !== 'archived'
    );
  }

  public async updateSession(
    id: string,
    updates: UpdateChatSessionInput
  ): Promise<DbChatSessionWithRider | null> {
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = { updated_at: now };

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
          .from('chat_sessions') as unknown as {
            update: (payload: Record<string, unknown>) => {
              eq: (col: string, val: string) => {
                select: (query: string) => {
                  single: () => Promise<{ data: DbChatSessionWithRider | null; error: unknown }>;
                };
              };
            };
          })
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
        ...(updatePayload as Partial<DbChatSessionWithRider>),
        updated_at: now
      };
      return memorySessions[id];
    }

    return null;
  }

  public async getOrCreateSession(
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
            const sessionData = data;
            const updatePayload: Record<string, unknown> = { updated_at: now };
            if (riderId && isValidUuid(riderId) && sessionData.rider_id !== riderId) {
              updatePayload.rider_id = riderId;
              sessionData.rider_id = riderId;
            }
            await (supabase.from('chat_sessions') as unknown as {
              update: (payload: Record<string, unknown>) => {
                eq: (col: string, val: string) => Promise<unknown>;
              };
            })
              .update(updatePayload)
              .eq('id', validProvidedId);
            return { ...sessionData, updated_at: now };
          }
        }

        const newSession: Database['public']['Tables']['chat_sessions']['Insert'] = {
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

        if (!error && data) return data;
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

    const sessionObj: DbChatSessionWithRider = {
      id: sid,
      rider_id: riderId || null,
      title: title || 'Consulta de Producción',
      active_agent: activeAgent || 'master',
      created_at: now,
      updated_at: now,
      riders: null
    };
    memorySessions[sid] = sessionObj;
    return sessionObj;
  }

  public async openConsultSession(
    sessionId: string | undefined,
    riderId: string,
    title: string,
    activeAgent: string
  ): Promise<DbChatSession> {
    const consultTitle = `consulta: ${title.replace(/^consulta:\s*/, '')}`.slice(0, 255);
    if (sessionId && isValidUuid(sessionId)) {
      const existing = await this.findSession(sessionId);
      if (existing && existing.rider_id === riderId && existing.title.startsWith('consulta:')) {
        return existing;
      }
    }
    return this.getOrCreateSession(undefined, riderId, consultTitle, activeAgent);
  }

  private async findSession(id: string): Promise<DbChatSession | null> {
    if (!isValidUuid(id)) return null;
    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (data) return data;
      }
    }
    return memorySessions[id] || null;
  }

  public async deleteSession(id: string): Promise<boolean> {
    if (isSupabaseServerConfigured() && isValidUuid(id)) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        // 1. Marcar como archivado
        await (supabase.from('chat_sessions') as unknown as {
          update: (payload: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<unknown>;
          };
        })
          .update({ active_agent: 'archived' })
          .eq('id', id);

        // 2. Intentar eliminación física de mensajes y sesión
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

  public async saveMessage(params: SaveChatMessageInput): Promise<DbChatMessage> {
    const now = new Date().toISOString();
    const msgRecord: DbChatMessage = {
      id: crypto.randomUUID(),
      session_id: params.sessionId,
      role: params.role,
      agent_role: params.agentRole || null,
      role_name: params.roleName || null,
      role_avatar: params.roleAvatar || null,
      content: params.content,
      actions: params.actions ?? [],
      created_at: now,
    };

    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert(msgRecord)
          .select()
          .single();

        if (!error && data) {
          return data;
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

  public async getMessages(sessionId: string): Promise<DbChatMessage[]> {
    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          return data;
        }
      }
    }

    return memoryMessages[sessionId] || [];
  }
}

export const chatRepository = new ChatRepository();
