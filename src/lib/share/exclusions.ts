import type { AbsoluteExclusion } from '../../core/types/rider.types';
import type { Json } from '../supabase/database.types';

export type { AbsoluteExclusion };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeMatch(value: string): string {
  return value.trim().toLowerCase();
}

export function formatExclusionLabel(exclusion: AbsoluteExclusion): string {
  const brand = exclusion.brand.trim();
  const model = exclusion.model?.trim();
  return model ? `${brand} · ${model}` : brand;
}

export function readAbsoluteExclusions(metadata: Json | undefined): AbsoluteExclusion[] {
  const raw = asRecord(metadata)?.absoluteExclusions;
  if (!Array.isArray(raw)) return [];

  const exclusions: AbsoluteExclusion[] = [];
  raw.forEach((value, index) => {
    const row = asRecord(value);
    if (!row) return;
    const brand = typeof row.brand === 'string' ? row.brand.trim() : '';
    if (!brand) return;
    const model = typeof row.model === 'string' ? row.model.trim() : '';
    const id = typeof row.id === 'string' && row.id.trim() ? row.id.trim() : `ex-${index}`;
    exclusions.push(model ? { id, brand, model } : { id, brand });
  });
  return exclusions;
}

export function textIncludesExclusion(haystack: string, exclusion: AbsoluteExclusion): boolean {
  const text = normalizeMatch(haystack);
  const brand = normalizeMatch(exclusion.brand);
  if (!brand || !text.includes(brand)) return false;
  const model = normalizeMatch(exclusion.model || '');
  return !model || text.includes(model);
}

export function absoluteExclusionConflict(input: {
  exclusions: AbsoluteExclusion[];
  pedido: string;
  response: string;
  offer?: string;
}): string | null {
  const haystack = input.response === 'cubro'
    ? input.pedido
    : input.response === 'alternativa'
      ? (input.offer || '')
      : '';
  if (!haystack) return null;

  const hit = input.exclusions.find((exclusion) => textIncludesExclusion(haystack, exclusion));
  if (!hit) return null;

  const label = formatExclusionLabel(hit);
  if (input.response === 'cubro') {
    return `No aceptado: «${label}» choca con este pedido. No se puede guardar como Aprobado.`;
  }
  return `No aceptado: la alternativa incluye «${label}».`;
}
