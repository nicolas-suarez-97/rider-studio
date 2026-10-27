import type { ContraAnswer, ContraResponse, SharePreviousDecision } from '../../core/types/contra-rider.types';
import type { Json } from '../supabase/database.types';
import type { ShareGuestRecord } from './confirm';

export const SHARE_RESPONSE_LABEL: Record<Exclude<ContraResponse, ''>, string> = {
  cubro: 'Aprobado',
  alternativa: 'Alternativa',
  no_puedo: 'Rechazado',
  pregunta: 'Pregunta',
};

export const SHARE_RESPONSE_BADGE: Record<Exclude<ContraResponse, ''>, string> = {
  cubro: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  alternativa: 'bg-violet-50 text-violet-800 border-violet-200',
  no_puedo: 'bg-rose-50 text-rose-800 border-rose-200',
  pregunta: 'bg-amber-50 text-amber-800 border-amber-200',
};

export const REOPEN_BADGE = 'bg-orange-50 text-orange-800 border-orange-200';
export const REOPEN_LABEL = 'Reabierto';

export type ArtistShareActionType = 'accept_alternative' | 'reply' | 'propose' | 'reopen';

export interface ArtistShareActionContext {
  author?: string;
  now?: string;
}

export interface ArtistShareItem {
  guestKey: string;
  guestName: string;
  lineId: string;
  pedido: string;
  response: Exclude<ContraResponse, ''>;
  organizerText: string;
  artistResponse: string;
  acceptedAlternative: boolean;
  needsAction: boolean;
  approvalInForce: boolean;
  canReopen: boolean;
  reopened: boolean;
  reopenReason: string;
  reopenAuthor: string;
  reopenedAt: string;
  previousDecision?: SharePreviousDecision | null;
}

export interface ArtistShareSummary {
  answeredCount: number;
  needsActionCount: number;
  resolvedCount: number;
  approvedCount: number;
  acceptedAlternativeCount: number;
  showReady: boolean;
  guestNames: string[];
}

export type ShowReadyAudience = 'artist' | 'organizer';

export const EMPTY_ARTIST_SHARE_SUMMARY: ArtistShareSummary = {
  answeredCount: 0,
  needsActionCount: 0,
  resolvedCount: 0,
  approvedCount: 0,
  acceptedAlternativeCount: 0,
  showReady: false,
  guestNames: [],
};

export function artistShareSummaryFromUnknown(value: unknown): ArtistShareSummary {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  return {
    answeredCount: Number(raw.answeredCount) || 0,
    needsActionCount: Number(raw.needsActionCount) || 0,
    resolvedCount: Number(raw.resolvedCount) || 0,
    approvedCount: Number(raw.approvedCount) || 0,
    acceptedAlternativeCount: Number(raw.acceptedAlternativeCount) || 0,
    showReady: raw.showReady === true,
    guestNames: Array.isArray(raw.guestNames)
      ? raw.guestNames.filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      : [],
  };
}

export function organizerShareText(answer: Pick<ContraAnswer, 'response' | 'offer' | 'note'>): string {
  return answer.response === 'alternativa' ? answer.offer : answer.note;
}

export function isApprovalInForce(answer: ContraAnswer): boolean {
  if (answer.reopened) return false;
  return answer.response === 'cubro' || answer.acceptedAlternative === true;
}

export function canReopenShareAnswer(answer: ContraAnswer): boolean {
  return isApprovalInForce(answer);
}

export function needsArtistAction(answer: ContraAnswer): boolean {
  if (answer.reopened) return false;
  if (answer.response !== 'alternativa' && answer.response !== 'pregunta' && answer.response !== 'no_puedo') {
    return false;
  }
  if (answer.acceptedAlternative) return false;
  return !answer.artistResponse?.trim();
}

export function isShowReady(
  items: Pick<ArtistShareItem, 'needsAction' | 'reopened'>[]
): boolean {
  return items.length > 0 && items.every((item) => !item.needsAction && !item.reopened);
}

function metadataRecord(metadata: Json | Record<string, unknown> | undefined): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...(metadata as Record<string, unknown>) }
    : {};
}

export function clearShowReady(metadata: Json | Record<string, unknown> | undefined): Record<string, unknown> {
  return { ...metadataRecord(metadata), showReady: false };
}

export function withShowReady(
  metadata: Json | Record<string, unknown> | undefined,
  confirms: Record<string, ShareGuestRecord>
): Record<string, unknown> {
  return {
    ...metadataRecord(metadata),
    showReady: isShowReady(listArtistShareItems(confirms)),
  };
}

export function formatShowReadyLine(
  summary: Pick<
    ArtistShareSummary,
    'answeredCount' | 'resolvedCount' | 'approvedCount' | 'acceptedAlternativeCount' | 'needsActionCount'
  >,
  audience: ShowReadyAudience = 'artist'
): string {
  const pendingSide = audience === 'organizer' ? 'del artista' : 'de tu lado';
  const noun = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  const repliedCount = Math.max(
    0,
    summary.resolvedCount - summary.approvedCount - summary.acceptedAlternativeCount
  );
  const parts = [
    `${summary.resolvedCount} de ${summary.answeredCount} resueltos`,
    noun(summary.approvedCount, 'aprobado', 'aprobados'),
    noun(summary.acceptedAlternativeCount, 'alternativa aceptada', 'alternativas aceptadas'),
  ];
  if (repliedCount > 0) {
    parts.push(noun(repliedCount, 'respuesta a rechazo/pregunta', 'respuestas a rechazo/pregunta'));
  }
  parts.push(`${noun(summary.needsActionCount, 'pendiente', 'pendientes')} ${pendingSide}`);
  return parts.join(' · ');
}

export function listArtistShareItems(
  confirms: Record<string, ShareGuestRecord>,
  pedidoByLineId: Record<string, string> = {}
): ArtistShareItem[] {
  const items: ArtistShareItem[] = [];
  for (const [key, guest] of Object.entries(confirms)) {
    for (const [lineId, answer] of Object.entries(guest.answers)) {
      if (!answer.response) continue;
      items.push({
        guestKey: key,
        guestName: guest.name,
        lineId,
        pedido: pedidoByLineId[lineId]?.trim() || lineId,
        response: answer.response,
        organizerText: organizerShareText(answer),
        artistResponse: answer.artistResponse?.trim() || '',
        acceptedAlternative: answer.acceptedAlternative === true,
        needsAction: needsArtistAction(answer),
        approvalInForce: isApprovalInForce(answer),
        canReopen: canReopenShareAnswer(answer),
        reopened: answer.reopened === true,
        reopenReason: answer.reopenReason?.trim() || '',
        reopenAuthor: answer.reopenAuthor?.trim() || '',
        reopenedAt: answer.reopenedAt || '',
        previousDecision: answer.previousDecision ?? null,
      });
    }
  }
  return items;
}

export function summarizeArtistShareItems(items: ArtistShareItem[]): ArtistShareSummary {
  const names = new Set<string>();
  let needsActionCount = 0;
  let resolvedCount = 0;
  let approvedCount = 0;
  let acceptedAlternativeCount = 0;
  for (const item of items) {
    if (item.guestName.trim()) names.add(item.guestName.trim());
    if (item.needsAction || item.reopened) needsActionCount += 1;
    if (!item.needsAction && !item.reopened) resolvedCount += 1;
    if (item.approvalInForce && item.response === 'cubro') approvedCount += 1;
    if (item.approvalInForce && item.acceptedAlternative) acceptedAlternativeCount += 1;
  }
  return {
    answeredCount: items.length,
    needsActionCount,
    resolvedCount,
    approvedCount,
    acceptedAlternativeCount,
    showReady: isShowReady(items),
    guestNames: [...names],
  };
}

function snapshotDecision(answer: ContraAnswer): SharePreviousDecision {
  return {
    response: answer.response,
    offer: answer.offer,
    note: answer.note,
    ...(answer.artistResponse ? { artistResponse: answer.artistResponse } : {}),
    ...(answer.acceptedAlternative ? { acceptedAlternative: true } : {}),
  };
}

function persistAnswer(answer: ContraAnswer): ContraAnswer {
  const next: ContraAnswer = {
    response: answer.response,
    offer: answer.offer,
    note: answer.note,
  };
  if (answer.acceptedAlternative) next.acceptedAlternative = true;
  const artistResponse = answer.artistResponse?.trim().slice(0, 1000);
  if (artistResponse) next.artistResponse = artistResponse;
  if (answer.reopened) next.reopened = true;
  const reopenReason = answer.reopenReason?.trim().slice(0, 1000);
  if (reopenReason) next.reopenReason = reopenReason;
  const reopenAuthor = answer.reopenAuthor?.trim().slice(0, 160);
  if (reopenAuthor) next.reopenAuthor = reopenAuthor;
  if (answer.reopenedAt) next.reopenedAt = answer.reopenedAt;
  if (answer.previousDecision) next.previousDecision = answer.previousDecision;
  return next;
}

export function applyArtistShareAction(
  confirms: Record<string, ShareGuestRecord>,
  guestKey: string,
  lineId: string,
  action: ArtistShareActionType,
  text = '',
  context: ArtistShareActionContext = {}
): { error: string | null; confirms: Record<string, ShareGuestRecord> } {
  const guest = confirms[guestKey];
  const answer = guest?.answers[lineId];
  if (!guest || !answer) {
    return { error: 'Esa respuesta ya no está en el rider', confirms };
  }

  const trimmed = text.trim().slice(0, 1000);

  if (action === 'reopen') {
    if (!canReopenShareAnswer(answer)) {
      return { error: 'Solo puedes reabrir un pedido aprobado o con aceptación vigente', confirms };
    }
    if (!trimmed) {
      return { error: 'Escribe un motivo para reabrir', confirms };
    }
    const author = context.author?.trim().slice(0, 160) || 'artista';
    const now = context.now || new Date().toISOString();
    return {
      error: null,
      confirms: {
        ...confirms,
        [guestKey]: {
          ...guest,
          answers: {
            ...guest.answers,
            [lineId]: persistAnswer({
              ...answer,
              reopened: true,
              reopenReason: trimmed,
              reopenAuthor: author,
              reopenedAt: now,
              previousDecision: snapshotDecision(answer),
            }),
          },
        },
      },
    };
  }

  if (action === 'accept_alternative') {
    if (answer.response !== 'alternativa') {
      return { error: 'Solo puedes aceptar una alternativa', confirms };
    }
    return {
      error: null,
      confirms: {
        ...confirms,
        [guestKey]: {
          ...guest,
          answers: {
            ...guest.answers,
            [lineId]: persistAnswer({ ...answer, acceptedAlternative: true, reopened: false }),
          },
        },
      },
    };
  }

  if (!trimmed) {
    return { error: 'Escribe un texto antes de guardar', confirms };
  }

  if (action === 'reply' && answer.response !== 'pregunta' && answer.response !== 'alternativa') {
    return { error: 'Esta respuesta no admite un comentario', confirms };
  }
  if (action === 'propose' && answer.response !== 'no_puedo') {
    return { error: 'Solo puedes proponer otra opción ante un rechazo', confirms };
  }

  return {
    error: null,
    confirms: {
      ...confirms,
      [guestKey]: {
        ...guest,
        answers: {
          ...guest.answers,
          [lineId]: persistAnswer({ ...answer, artistResponse: trimmed }),
        },
      },
    },
  };
}
