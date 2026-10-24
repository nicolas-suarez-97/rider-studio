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
  guestNames: string[];
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

export function isShowReady(items: Pick<ArtistShareItem, 'approvalInForce' | 'needsAction'>[]): boolean {
  return items.length > 0 && items.every((item) => item.approvalInForce && !item.needsAction);
}

export function clearShowReady(metadata: Json | Record<string, unknown> | undefined): Record<string, unknown> {
  const base = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...(metadata as Record<string, unknown>) }
    : {};
  return { ...base, showReady: false };
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
  for (const item of items) {
    if (item.guestName.trim()) names.add(item.guestName.trim());
    if (item.needsAction) needsActionCount += 1;
  }
  return {
    answeredCount: items.length,
    needsActionCount,
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
