import type { Json } from '../supabase/database.types';

export interface SnapshotRider {
  title: string;
  artist_name: string;
  rider_type: string;
  venue_name: string | null;
  event_date: string | null;
  version: string;
  status: string;
  channels: Json;
  sections: Json;
  metadata: Json;
  media?: Json;
}

export interface PublishedSnapshot {
  capturedAt: string;
  title: string;
  artist_name: string;
  rider_type: string;
  venue_name: string | null;
  event_date: string | null;
  version: string;
  status: string;
  channels: Json;
  sections: Json;
  media: Json | null;
  metadata: Json;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asJson(value: unknown): Json {
  return value as Json;
}

function contentMetadata(metadata: Json | undefined): Json {
  const meta = asRecord(metadata) ?? {};
  return asJson({
    season: typeof meta.season === 'string' ? meta.season : '',
    documentTheme: meta.documentTheme ?? null,
    completedSectionIds: Array.isArray(meta.completedSectionIds) ? meta.completedSectionIds : [],
    modules: asRecord(meta.modules) ?? {},
    stagePlot: meta.stagePlot ?? null,
    media: meta.media ?? null,
  });
}

export function readPublishedSnapshot(metadata: Json | undefined): PublishedSnapshot | null {
  const published = asRecord(asRecord(metadata)?.published);
  if (!published || typeof published.title !== 'string') return null;
  return {
    capturedAt: typeof published.capturedAt === 'string' ? published.capturedAt : '',
    title: published.title,
    artist_name: typeof published.artist_name === 'string' ? published.artist_name : '',
    rider_type: typeof published.rider_type === 'string' ? published.rider_type : 'tecnico',
    venue_name: typeof published.venue_name === 'string' ? published.venue_name : null,
    event_date: typeof published.event_date === 'string' ? published.event_date : null,
    version: typeof published.version === 'string' ? published.version : 'v1.0',
    status: typeof published.status === 'string' ? published.status : 'in_progress',
    channels: (published.channels as Json) ?? [],
    sections: (published.sections as Json) ?? [],
    media: (published.media as Json | null) ?? null,
    metadata: (published.metadata as Json) ?? {},
  };
}

export function hasPublishedSnapshot(metadata: Json | undefined): boolean {
  return readPublishedSnapshot(metadata) !== null;
}

export function capturePublishedSnapshot(
  row: SnapshotRider,
  capturedAt: string
): Json {
  return {
    capturedAt,
    title: row.title,
    artist_name: row.artist_name,
    rider_type: row.rider_type,
    venue_name: row.venue_name,
    event_date: row.event_date,
    version: row.version,
    status: row.status,
    channels: row.channels,
    sections: row.sections,
    media: row.media ?? null,
    metadata: contentMetadata(row.metadata),
  };
}

export function applyPublishedSnapshot<T extends SnapshotRider & { metadata: Json }>(row: T): T {
  const snapshot = readPublishedSnapshot(row.metadata);
  if (!snapshot) return row;

  const liveMeta = asRecord(row.metadata) ?? {};
  const publishedMeta = asRecord(snapshot.metadata) ?? {};

  return {
    ...row,
    title: snapshot.title,
    artist_name: snapshot.artist_name,
    rider_type: snapshot.rider_type,
    venue_name: snapshot.venue_name,
    event_date: snapshot.event_date,
    version: snapshot.version,
    status: snapshot.status,
    channels: snapshot.channels,
    sections: snapshot.sections,
    media: snapshot.media ?? row.media,
    metadata: asJson({
      ...publishedMeta,
      share: liveMeta.share ?? null,
      shareConfirms: liveMeta.shareConfirms ?? {},
      contraRider: liveMeta.contraRider ?? null,
      published: liveMeta.published ?? null,
      ...(liveMeta.showReady !== undefined ? { showReady: liveMeta.showReady } : {}),
    }),
  };
}
