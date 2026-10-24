import type { ContraAnswer, ContraResponse } from '../../core/types/contra-rider.types';
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

export type ArtistShareActionType = 'accept_alternative' | 'reply' | 'propose';

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
}

export interface ArtistShareSummary {
  answeredCount: number;
  needsActionCount: number;
  guestNames: string[];
}

export function organizerShareText(answer: Pick<ContraAnswer, 'response' | 'offer' | 'note'>): string {
  return answer.response === 'alternativa' ? answer.offer : answer.note;
}

export function needsArtistAction(answer: ContraAnswer): boolean {
  if (answer.response !== 'alternativa' && answer.response !== 'pregunta' && answer.response !== 'no_puedo') {
    return false;
  }
  if (answer.acceptedAlternative) return false;
  return !answer.artistResponse?.trim();
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

function persistAnswer(answer: ContraAnswer): ContraAnswer {
  const next: ContraAnswer = {
    response: answer.response,
    offer: answer.offer,
    note: answer.note,
  };
  if (answer.acceptedAlternative) next.acceptedAlternative = true;
  const artistResponse = answer.artistResponse?.trim().slice(0, 1000);
  if (artistResponse) next.artistResponse = artistResponse;
  return next;
}

export function applyArtistShareAction(
  confirms: Record<string, ShareGuestRecord>,
  guestKey: string,
  lineId: string,
  action: ArtistShareActionType,
  text = ''
): { error: string | null; confirms: Record<string, ShareGuestRecord> } {
  const guest = confirms[guestKey];
  const answer = guest?.answers[lineId];
  if (!guest || !answer) {
    return { error: 'Esa respuesta ya no está en el rider', confirms };
  }

  const trimmed = text.trim().slice(0, 1000);

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
            [lineId]: persistAnswer({ ...answer, acceptedAlternative: true }),
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
