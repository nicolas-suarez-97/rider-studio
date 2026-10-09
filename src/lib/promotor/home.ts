import { Rider } from '@/core/models/Rider';
import { ReviewVerdict } from '@/core/types/contra-rider.types';
import { readStoredContra } from '@/lib/promotor/contra-rider';
import { readShareLink } from '@/lib/repositories/rider.repository';
import { getConsultSessions, getRiders } from '@/lib/services/rider-storage';

export interface PromotorShowCard {
  id: string;
  artistName: string;
  venue: string;
  title: string;
  version: number;
  verdict: ReviewVerdict | null;
  updatedLabel: string;
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
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export async function loadPromotorHome() {
  const [riders, sessions] = await Promise.all([getRiders(), getConsultSessions()]);
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const shows: PromotorShowCard[] = [];
  const conversations: PromotorConversationCard[] = [];

  for (const row of riders) {
    if (!readShareLink(row)?.enabled) continue;
    const stored = readStoredContra(row.metadata);
    if (stored.status === 'sent') continue;

    const rider = Rider.fromDatabase(row);
    const artistName = rider.artistName || rider.title || 'Show sin nombre';
    shows.push({
      id: row.id,
      artistName,
      venue: rider.venue,
      title: rider.title,
      version: stored.version,
      verdict: stored.review?.verdict ?? null,
      updatedLabel: formatDate(row.updated_at),
    });

    if (!stored.reviewSessionId) continue;
    const session = sessionById.get(stored.reviewSessionId);
    const rawTitle = (session?.title || '').replace(/^consulta:\s*/, '').trim();
    conversations.push({
      id: stored.reviewSessionId,
      showId: row.id,
      title: rawTitle || 'Consulta de revisión',
      artistName,
      venue: rider.venue,
      date: formatDate(session?.updated_at || session?.created_at || row.updated_at),
    });
  }

  return { shows, conversations };
}
