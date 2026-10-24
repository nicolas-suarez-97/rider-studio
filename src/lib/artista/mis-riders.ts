export type RiderHomeStatus = 'draft' | 'shared' | 'ready';
export type RiderHomeFilter = 'all' | 'draft' | 'shared' | 'ready';

export const RIDER_HOME_STATUS_LABEL: Record<RiderHomeStatus, string> = {
  draft: 'Borrador',
  shared: 'Compartido',
  ready: 'Listo',
};

export const RIDER_HOME_FILTERS: Array<{ id: RiderHomeFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'draft', label: 'Borradores' },
  { id: 'shared', label: 'Compartidos' },
  { id: 'ready', label: 'Listos' },
];

export interface RiderHomeSource {
  id: string;
  title?: string | null;
  artist_name?: string | null;
  venue_name?: string | null;
  event_date?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  share_token?: string | null;
  share_enabled?: boolean | null;
  shared_at?: string | null;
  metadata?: unknown;
  media?: unknown;
}

export interface ShareConfirmProgress {
  confirmed: number;
  total: number;
}

export interface RiderHomeCard {
  id: string;
  title: string;
  venue: string;
  eventDateLabel: string;
  status: RiderHomeStatus;
  confirmProgress: ShareConfirmProgress | null;
  canViewResponses: boolean;
  editHref: string;
  responsesHref: string;
  coverUrl?: string;
  updatedAt: string;
}

export interface RiderHomeCounts {
  all: number;
  draft: number;
  shared: number;
  ready: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    const parsed = Number(value);
    return parsed >= 0 ? Math.floor(parsed) : null;
  }
  return null;
}

function readCoverUrl(source: RiderHomeSource): string | undefined {
  const fromColumn = Array.isArray(source.media) ? source.media : [];
  const fromMeta = asRecord(source.metadata)?.media;
  const list = fromColumn.length > 0 ? fromColumn : (Array.isArray(fromMeta) ? fromMeta : []);
  const preferred = list.find((item) => asRecord(item)?.cover === true) ?? list[0];
  const url = asNonEmptyString(asRecord(preferred)?.url);
  return url || undefined;
}

export function hasPublishedShare(source: RiderHomeSource): boolean {
  if (asNonEmptyString(source.share_token)) return true;
  if (source.share_enabled === true) return true;
  const share = asRecord(asRecord(source.metadata)?.share);
  return Boolean(asNonEmptyString(share?.token));
}

export function readShowReady(metadata: unknown): boolean {
  return asRecord(metadata)?.showReady === true;
}

export function readShareConfirms(metadata: unknown): ShareConfirmProgress | null {
  const raw = asRecord(metadata)?.shareConfirms;
  if (raw == null) return null;

  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    const confirmed = raw.filter((item) => {
      if (item === true) return true;
      const record = asRecord(item);
      if (!record) return false;
      if (record.confirmed === true) return true;
      return record.status === 'confirmed';
    }).length;
    return { confirmed, total: raw.length };
  }

  const record = asRecord(raw);
  if (!record) return null;

  const confirmed = asCount(record.confirmed ?? record.n);
  const total = asCount(record.total ?? record.requested ?? record.m);
  if (confirmed == null || total == null || total <= 0) return null;
  return { confirmed, total };
}

export function riderHomeStatus(source: RiderHomeSource): RiderHomeStatus {
  if (readShowReady(source.metadata)) return 'ready';
  if (hasPublishedShare(source)) return 'shared';
  return 'draft';
}

export function showGroupKey(source: RiderHomeSource): string {
  const meta = asRecord(source.metadata);
  const showId = asNonEmptyString(meta?.showId);
  if (showId) return `show:${showId}`;

  const artist = asNonEmptyString(source.artist_name).toLowerCase();
  const venue = asNonEmptyString(source.venue_name).toLowerCase();
  const date = asNonEmptyString(source.event_date);
  const placeholderArtist = artist === 'nuevo artista / banda';
  if (artist && !placeholderArtist && venue && date) {
    return `place:${artist}|${venue}|${date}`;
  }
  return `id:${source.id}`;
}

function formatDay(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es', { month: 'short', day: 'numeric' });
}

function rankStatus(status: RiderHomeStatus): number {
  if (status === 'ready') return 2;
  if (status === 'shared') return 1;
  return 0;
}

function mergeStatus(left: RiderHomeStatus, right: RiderHomeStatus): RiderHomeStatus {
  return rankStatus(left) >= rankStatus(right) ? left : right;
}

function cardTitle(source: RiderHomeSource): string {
  const artist = asNonEmptyString(source.artist_name);
  if (artist && artist.toLowerCase() !== 'nuevo artista / banda') return artist;
  const title = asNonEmptyString(source.title);
  return title || 'Show sin nombre';
}

function toCard(source: RiderHomeSource): RiderHomeCard {
  const status = riderHomeStatus(source);
  const confirmProgress = readShareConfirms(source.metadata);
  const shared = hasPublishedShare(source);
  return {
    id: source.id,
    title: cardTitle(source),
    venue: asNonEmptyString(source.venue_name),
    eventDateLabel: formatDay(source.event_date) || asNonEmptyString(asRecord(source.metadata)?.season),
    status,
    confirmProgress,
    canViewResponses: shared || confirmProgress != null,
    editHref: `/artista/workspace?id=${encodeURIComponent(source.id)}`,
    responsesHref: `/artista/riders/${encodeURIComponent(source.id)}/respuestas`,
    coverUrl: readCoverUrl(source),
    updatedAt: source.updated_at || source.created_at || '',
  };
}

function mergeCards(primary: RiderHomeCard, next: RiderHomeCard): RiderHomeCard {
  const newer = (next.updatedAt || '') > (primary.updatedAt || '') ? next : primary;
  const older = newer === next ? primary : next;
  return {
    ...newer,
    status: mergeStatus(primary.status, next.status),
    confirmProgress: newer.confirmProgress ?? older.confirmProgress,
    canViewResponses: primary.canViewResponses || next.canViewResponses,
    venue: newer.venue || older.venue,
    eventDateLabel: newer.eventDateLabel || older.eventDateLabel,
    coverUrl: newer.coverUrl || older.coverUrl,
  };
}

export function buildRiderHomeCards(sources: RiderHomeSource[]): RiderHomeCard[] {
  const grouped = new Map<string, RiderHomeCard>();

  for (const source of sources) {
    const card = toCard(source);
    const key = showGroupKey(source);
    const existing = grouped.get(key);
    grouped.set(key, existing ? mergeCards(existing, card) : card);
  }

  return [...grouped.values()].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export function countRiderHome(cards: RiderHomeCard[]): RiderHomeCounts {
  return cards.reduce<RiderHomeCounts>(
    (counts, card) => {
      counts.all += 1;
      counts[card.status] += 1;
      return counts;
    },
    { all: 0, draft: 0, shared: 0, ready: 0 },
  );
}

export function filterRiderHome(cards: RiderHomeCard[], filter: RiderHomeFilter): RiderHomeCard[] {
  if (filter === 'all') return cards;
  return cards.filter((card) => card.status === filter);
}

export function confirmProgressLabel(progress: ShareConfirmProgress): string {
  return `${progress.confirmed} de ${progress.total} pedidos confirmados`;
}
