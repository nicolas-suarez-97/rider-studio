import { createServerSupabaseClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { Database, Json } from '@/lib/supabase/database.types';
import { createShareToken } from '@/lib/share/token';

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

export interface ShareLink {
  token: string;
  enabled: boolean;
  sharedAt: string | null;
}

export interface IRiderRepository {
  getAll(): Promise<DbRiderWithSessions[]>;
  getById(id: string): Promise<DbRiderWithSessions | null>;
  getByShareToken(token: string): Promise<DbRider | null>;
  publishShare(id: string): Promise<ShareLink | null>;
  saveContraRider(id: string, contraRider: Json): Promise<DbRider | null>;
  save(rider: SaveRiderInput): Promise<DbRider>;
  delete(id: string): Promise<boolean>;
}

function asMetadataRecord(value: Json | undefined): Record<string, Json | undefined> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, Json | undefined>;
  }
  return null;
}

export function readShareLink(rider: Pick<DbRider, 'share_token' | 'share_enabled' | 'shared_at' | 'metadata'>): ShareLink | null {
  if (rider.share_token) {
    return {
      token: rider.share_token,
      enabled: rider.share_enabled === true,
      sharedAt: rider.shared_at ?? null,
    };
  }

  const share = asMetadataRecord(rider.metadata)?.share;
  const shareRecord = asMetadataRecord(share as Json | undefined);
  const token = typeof shareRecord?.token === 'string' ? shareRecord.token : '';
  if (!token) return null;

  return {
    token,
    enabled: shareRecord?.enabled === true,
    sharedAt: typeof shareRecord?.sharedAt === 'string' ? shareRecord.sharedAt : null,
  };
}

function metadataWithShare(metadata: Json, share: ShareLink): Json {
  const base = asMetadataRecord(metadata) ?? {};
  return {
    ...base,
    share: {
      token: share.token,
      enabled: share.enabled,
      sharedAt: share.sharedAt,
    },
  };
}

function isOwnerSession(session: LinkedSessionItem): boolean {
  return session.active_agent !== 'archived' && !session.title?.startsWith('consulta:');
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
              ? r.chat_sessions.filter((cs: LinkedSessionItem) => isOwnerSession(cs))
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
              ? raw.chat_sessions.filter((cs: LinkedSessionItem) => isOwnerSession(cs))
              : []
          };
        }
      }
    }
    const found = memoryRiders.find(r => r.id === id);
    return found ? { ...found, chat_sessions: [] } : null;
  }

  public async getByShareToken(token: string): Promise<DbRider | null> {
    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('riders')
          .select('*')
          .eq('share_token', token)
          .eq('share_enabled', true)
          .maybeSingle();

        if (!error && data && readShareLink(data)?.enabled) {
          return data;
        }

        const { data: rows, error: scanError } = await supabase
          .from('riders')
          .select('*');

        if (!scanError && rows) {
          const found = rows.find((row) => {
            const share = readShareLink(row);
            return share?.token === token && share.enabled;
          });
          if (found) return found;
        }
      }
    }

    return memoryRiders.find((row) => {
      const share = readShareLink(row);
      return share?.token === token && share.enabled;
    }) ?? null;
  }

  public async publishShare(id: string): Promise<ShareLink | null> {
    const rider = await this.getById(id);
    if (!rider) return null;

    const current = readShareLink(rider);
    const now = new Date().toISOString();
    const share: ShareLink = current?.enabled && current.token
      ? current
      : { token: createShareToken(), enabled: true, sharedAt: now };
    const enabledShare: ShareLink = { ...share, enabled: true, sharedAt: share.sharedAt || now };
    const metadata = metadataWithShare(rider.metadata, enabledShare);

    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const columnWrite = await supabase
          .from('riders')
          .update({
            share_token: enabledShare.token,
            share_enabled: true,
            shared_at: enabledShare.sharedAt,
            metadata,
            updated_at: now,
          })
          .eq('id', id)
          .select('*')
          .maybeSingle();

        if (!columnWrite.error && columnWrite.data) {
          this.rememberShare(id, enabledShare, metadata);
          return enabledShare;
        }

        if (columnWrite.error) {
          console.warn('[Supabase publishShare columns]', columnWrite.error);
        }

        const metadataWrite = await supabase
          .from('riders')
          .update({ metadata, updated_at: now })
          .eq('id', id)
          .select('*')
          .maybeSingle();

        if (!metadataWrite.error && metadataWrite.data) {
          this.rememberShare(id, enabledShare, metadata);
          return enabledShare;
        }

        if (metadataWrite.error) {
          console.warn('[Supabase publishShare metadata]', metadataWrite.error);
        }
      }
    }

    const existingIdx = memoryRiders.findIndex((row) => row.id === id);
    if (existingIdx < 0) return null;
    memoryRiders[existingIdx] = {
      ...memoryRiders[existingIdx],
      metadata,
      share_token: enabledShare.token,
      share_enabled: true,
      shared_at: enabledShare.sharedAt,
      updated_at: now,
    };
    return enabledShare;
  }

  private rememberShare(id: string, share: ShareLink, metadata: Json) {
    const existingIdx = memoryRiders.findIndex((row) => row.id === id);
    if (existingIdx < 0) return;
    memoryRiders[existingIdx] = {
      ...memoryRiders[existingIdx],
      metadata,
      share_token: share.token,
      share_enabled: share.enabled,
      shared_at: share.sharedAt,
    };
  }

  public async saveContraRider(id: string, contraRider: Json): Promise<DbRider | null> {
    const rider = await this.getById(id);
    if (!rider || !readShareLink(rider)?.enabled) return null;

    const now = new Date().toISOString();
    const base = asMetadataRecord(rider.metadata) ?? {};
    const current = asMetadataRecord(base.contraRider) ?? {};
    const incoming = asMetadataRecord(contraRider) ?? {};
    const metadata: Json = { ...base, contraRider: { ...current, ...incoming } };
    const next: DbRider = { ...rider, metadata, updated_at: now };

    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('riders')
          .update({ metadata, updated_at: now })
          .eq('id', id)
          .select('*')
          .maybeSingle();

        if (!error && data) {
          const existingIdx = memoryRiders.findIndex((row) => row.id === id);
          if (existingIdx >= 0) memoryRiders[existingIdx] = data;
          return data;
        }
        if (error) console.warn('[Supabase saveContraRider]', error);
      }
    }

    const existingIdx = memoryRiders.findIndex((row) => row.id === id);
    if (existingIdx < 0) return null;
    memoryRiders[existingIdx] = next;
    return next;
  }

  public async save(rider: SaveRiderInput): Promise<DbRider> {
    const now = new Date().toISOString();
    const id = rider.id || crypto.randomUUID();
    const existing = rider.id ? await this.getById(rider.id) : null;
    const existingShare = existing ? readShareLink(existing) : null;
    const previousMeta = asMetadataRecord(existing?.metadata);
    const incomingMeta = asMetadataRecord(rider.metadata ?? {}) ?? {};
    const metadataBase: Json = previousMeta?.contraRider
      ? { ...incomingMeta, contraRider: previousMeta.contraRider }
      : (rider.metadata ?? {});
    const metadata = existingShare
      ? metadataWithShare(metadataBase, existingShare)
      : metadataBase;

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
      metadata,
      share_token: existing?.share_token,
      share_enabled: existing?.share_enabled,
      shared_at: existing?.shared_at,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const persist: Database['public']['Tables']['riders']['Insert'] = {
          id: record.id,
          title: record.title,
          artist_name: record.artist_name,
          rider_type: record.rider_type,
          venue_name: record.venue_name,
          event_date: record.event_date,
          version: record.version,
          status: record.status,
          channels: record.channels,
          sections: record.sections,
          metadata: record.metadata,
          created_at: record.created_at,
          updated_at: record.updated_at,
        };
        const { data, error } = await supabase
          .from('riders')
          .upsert(persist)
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
