import { Rider } from '@/core/models/Rider';
import { ContraRiderRecord } from '@/core/types/contra-rider.types';
import {
  answersFromLines,
  buildContraLines,
  readStoredContra,
  sanitizeAnswers,
  sendBlockReason,
} from '@/lib/promotor/contra-rider';
import { readShareLink } from '@/lib/repositories/rider.repository';
import { getRiderById, saveContraRider } from '@/lib/services/rider-storage';

export async function loadPromotorShow(showId: string) {
  const row = await getRiderById(showId);
  if (!row || !readShareLink(row)?.enabled) return null;

  const rider = Rider.fromDatabase(row);
  rider.linkedSessions = [];
  const stored = readStoredContra(row.metadata);
  const lines = buildContraLines(rider, stored.answers);

  return {
    showId: row.id,
    artistName: rider.artistName,
    title: rider.title,
    season: rider.season,
    venue: rider.venue,
    version: rider.version,
    rider: JSON.parse(JSON.stringify(rider)),
    contra: {
      status: stored.status,
      version: stored.version,
      sentAt: stored.sentAt,
      lines,
    },
  };
}

export async function persistContraRider(
  showId: string,
  intent: 'draft' | 'send',
  answersInput: unknown
) {
  const row = await getRiderById(showId);
  if (!row || !readShareLink(row)?.enabled) return { error: 'Show no encontrado', status: 404 as const };

  const rider = Rider.fromDatabase(row);
  const previous = readStoredContra(row.metadata);
  const allowedIds = new Set(buildContraLines(rider, {}).map((line) => line.id));
  const answers = sanitizeAnswers(answersInput, allowedIds);
  const lines = buildContraLines(rider, answers);

  if (intent === 'send') {
    const reason = sendBlockReason(lines);
    if (reason) return { error: reason, status: 400 as const };
  }

  const now = new Date().toISOString();
  const next: ContraRiderRecord = intent === 'send'
    ? {
        status: 'sent',
        version: previous.version + 1,
        sentAt: now,
        answers,
      }
    : {
        status: 'draft',
        version: previous.version,
        sentAt: previous.sentAt,
        answers: answersFromLines(lines),
      };

  const saved = await saveContraRider(showId, JSON.parse(JSON.stringify(next)));
  if (!saved) return { error: 'No se pudo guardar el contra-rider', status: 500 as const };

  return {
    status: 200 as const,
    contra: {
      status: next.status,
      version: next.version,
      sentAt: next.sentAt,
      lines: buildContraLines(rider, next.answers),
    },
  };
}
