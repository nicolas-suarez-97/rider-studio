import { Rider } from '@/core/models/Rider';
import { ReviewVerdict } from '@/core/types/contra-rider.types';
import { RiderType } from '@/core/types/rider.types';
import { buildContraLines, readStoredContra } from '@/lib/promotor/contra-rider';
import { readShareLink } from '@/lib/repositories/rider.repository';
import { getConsultSessions, getRiders } from '@/lib/services/rider-storage';

export interface PromotorShowCard {
  id: string;
  artistName: string;
  venue: string;
  title: string;
  type: RiderType;
  tour: string;
  riderStatus: 'completed' | 'in_progress';
  version: number;
  verdict: ReviewVerdict | null;
  updatedAt: string;
  updatedLabel: string;
  answered: number;
  total: number;
}

export interface PromotorConversationCard {
  id: string;
  showId: string;
  title: string;
  artistName: string;
  venue: string;
  date: string;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es', { month: 'short', day: 'numeric' });
}

export async function loadPromotorHome() {
  const [riders, sessions] = await Promise.all([getRiders(), getConsultSessions()]);
  const shows: PromotorShowCard[] = [];
  const showById = new Map<string, { artistName: string; venue: string }>();

  for (const row of riders) {
    if (!readShareLink(row)?.enabled) continue;
    const stored = readStoredContra(row.metadata);
    if (stored.status === 'sent') continue;

    const rider = Rider.fromDatabase(row);
    const artistName = rider.artistName || rider.title || 'Show sin nombre';
    const lines = buildContraLines(rider, stored.answers);
    shows.push({
      id: row.id,
      artistName,
      venue: rider.venue,
      title: rider.title,
      type: rider.type,
      tour: rider.season,
      riderStatus: rider.status,
      version: stored.version,
      verdict: stored.review?.verdict ?? null,
      updatedAt: row.updated_at || '',
      updatedLabel: formatDate(row.updated_at),
      answered: lines.filter((line) => line.response).length,
      total: lines.length,
    });
    showById.set(row.id, { artistName, venue: rider.venue });
  }

  const conversations: PromotorConversationCard[] = sessions.map((session) => {
    const showId = session.rider_id || '';
    const known = showById.get(showId);
    const rawTitle = (session.title || '').replace(/^consulta:\s*/, '').trim();
    return {
      id: session.id,
      showId,
      title: rawTitle || 'Consulta de revisión',
      artistName: known?.artistName || session.riders?.artist_name || '',
      venue: known?.venue || '',
      date: formatDate(session.updated_at || session.created_at),
    };
  });

  shows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { shows, conversations };
}
