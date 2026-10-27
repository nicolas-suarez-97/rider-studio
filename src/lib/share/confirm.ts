import type { ContraAnswer, ContraResponse } from '../../core/types/contra-rider.types';
import type { Json } from '../supabase/database.types';

const RESPONSES = new Set<Exclude<ContraResponse, ''>>(['cubro', 'alternativa', 'no_puedo', 'pregunta']);

export interface ShareGuestRecord {
  name: string;
  answers: Record<string, ContraAnswer>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function guestStorageKey(token: string): string {
  return `rider-share-guest:${token}`;
}

export function guestKey(name: string): string {
  return name.trim().toLowerCase();
}

export function validateGuestName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Escribe tu nombre para entrar';
  if (trimmed.length > 80) return 'El nombre es demasiado largo';
  return null;
}

export function validateShareConfirm(input: {
  lineId: string;
  response: string;
  text: string;
  allowedIds: Set<string>;
}): { error: string | null; answer: ContraAnswer | null } {
  if (!input.allowedIds.has(input.lineId)) {
    return { error: 'Ese pedido no está en este rider', answer: null };
  }
  if (!RESPONSES.has(input.response as Exclude<ContraResponse, ''>)) {
    return { error: 'Elige Aprobado, Alternativa, Rechazado o Pregunta', answer: null };
  }

  const response = input.response as Exclude<ContraResponse, ''>;
  const text = input.text.trim().slice(0, 1000);
  if (response !== 'cubro' && !text) {
    return { error: 'Escribe un texto antes de guardar', answer: null };
  }

  return {
    error: null,
    answer: {
      response,
      offer: response === 'alternativa' ? text : '',
      note: response === 'alternativa' ? '' : text,
    },
  };
}

export function readShareConfirms(metadata: Json | undefined): Record<string, ShareGuestRecord> {
  const raw = asRecord(asRecord(metadata)?.shareConfirms);
  if (!raw) return {};

  const guests: Record<string, ShareGuestRecord> = {};
  for (const [key, value] of Object.entries(raw)) {
    const guest = asRecord(value);
    if (!guest || typeof guest.name !== 'string') continue;
    const answers: Record<string, ContraAnswer> = {};
    const rawAnswers = asRecord(guest.answers);
    if (rawAnswers) {
      for (const [lineId, answerValue] of Object.entries(rawAnswers)) {
        const answer = asRecord(answerValue);
        if (!answer) continue;
        const response = typeof answer.response === 'string' && RESPONSES.has(answer.response as Exclude<ContraResponse, ''>)
          ? (answer.response as Exclude<ContraResponse, ''>)
          : '';
        if (!response) continue;
        answers[lineId] = {
          response,
          offer: typeof answer.offer === 'string' ? answer.offer : '',
          note: typeof answer.note === 'string' ? answer.note : '',
        };
      }
    }
    guests[key] = { name: guest.name, answers };
  }
  return guests;
}

export function readGuestAnswers(
  confirms: Record<string, ShareGuestRecord>,
  name: string
): Record<string, ContraAnswer> {
  return confirms[guestKey(name)]?.answers ?? {};
}

export function mergeShareConfirms(
  current: Record<string, ShareGuestRecord>,
  name: string,
  lineId: string,
  answer: ContraAnswer
): Record<string, ShareGuestRecord> {
  const key = guestKey(name);
  const existing = current[key];
  return {
    ...current,
    [key]: {
      name: name.trim(),
      answers: {
        ...(existing?.answers ?? {}),
        [lineId]: answer,
      },
    },
  };
}

export function confirmsToJson(confirms: Record<string, ShareGuestRecord>): Json {
  return confirms as unknown as Json;
}
