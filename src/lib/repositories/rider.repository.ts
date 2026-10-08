import { createServerSupabaseClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { Database, Json } from '@/lib/supabase/database.types';

export type DbRider = Database['public']['Tables']['riders']['Row'];

export interface LinkedSessionItem {
  id: string;
  title: string;
  active_agent: string;
  updated_at: string;
}

export interface DbRiderWithSessions extends DbRider {
  chat_sessions?: LinkedSessionItem[];
}

export interface SaveRiderInput {
  id?: string;
  title: string;
  artist_name: string;
  rider_type?: string;
  venue_name?: string | null;
  event_date?: string | null;
  version?: string;
  status?: string;
  channels?: Json;
  sections?: Json;
  metadata?: Json;
}

export interface IRiderRepository {
  getAll(): Promise<DbRiderWithSessions[]>;
  getById(id: string): Promise<DbRiderWithSessions | null>;
  save(rider: SaveRiderInput): Promise<DbRider>;
  delete(id: string): Promise<boolean>;
}

// Almacenamiento seguro en memoria para modo demo / fallback
let memoryRiders: DbRider[] = [];

export class RiderRepository implements IRiderRepository {
  public async getAll(): Promise<DbRiderWithSessions[]> {
    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('riders')
          .select('*, chat_sessions(id, title, active_agent, updated_at)')
          .order('updated_at', { ascending: false });

        if (!error && data) {
          return (data as unknown as DbRiderWithSessions[]).map(r => ({
            ...r,
            chat_sessions: Array.isArray(r.chat_sessions)
              ? r.chat_sessions.filter((cs: LinkedSessionItem) => cs.active_agent !== 'archived')
              : []
          }));
        }
      }
    }
    return memoryRiders.map(r => ({ ...r, chat_sessions: [] }));
  }

  public async getById(id: string): Promise<DbRiderWithSessions | null> {
    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('riders')
          .select('*, chat_sessions(id, title, active_agent, updated_at)')
          .eq('id', id)
          .single();

        if (!error && data) {
          const raw = data as unknown as DbRiderWithSessions;
          return {
            ...raw,
            chat_sessions: Array.isArray(raw.chat_sessions)
              ? raw.chat_sessions.filter((cs: LinkedSessionItem) => cs.active_agent !== 'archived')
              : []
          };
        }
      }
    }
    const found = memoryRiders.find(r => r.id === id);
    return found ? { ...found, chat_sessions: [] } : null;
  }

  public async save(rider: SaveRiderInput): Promise<DbRider> {
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
      channels: rider.channels ?? [],
      sections: rider.sections ?? [],
      metadata: rider.metadata ?? {},
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('riders')
          .upsert(record)
          .select()
          .single();

        if (!error && data) {
          return data;
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

  public async delete(id: string): Promise<boolean> {
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
}

export const riderRepository = new RiderRepository();
