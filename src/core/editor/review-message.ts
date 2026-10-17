import { findSectionConfig } from '@/core/constants/section-fields';
import { DocumentSuggestion } from '@/core/types/suggestion.types';

export const REVIEW_HEADING = 'Puntos de mejora';

export interface ReviewSectionInput {
  id: string;
  title: string;
  content?: string;
}

export interface ReviewPoint {
  sectionId: string;
  sectionTitle: string;
  rationale: string;
  proposedText: string;
}

export function localReviewPoints(sections: ReviewSectionInput[]): ReviewPoint[] {
  const filled: ReviewPoint[] = [];
  const empty: ReviewPoint[] = [];

  for (const section of sections) {
    if (section.id === 'doc-cover' || /^portada$/i.test(section.title.trim())) continue;
    const text = (section.content || '').trim();
    if (!text) {
      empty.push({
        sectionId: section.id,
        sectionTitle: section.title || 'Sección',
        rationale: `La sección «${section.title || 'sin título'}» está vacía y el promotor no tiene nada que cumplir ahí.`,
        proposedText: `Requerimientos de ${section.title || 'esta sección'} por confirmar con el promotor antes del montaje.`,
      });
      continue;
    }

    const config = findSectionConfig(section.id, section.title);
    if (!config) continue;
    const haystack = text.toLowerCase();
    for (const field of config.fields) {
      if (haystack.includes(field.prefix.toLowerCase())) continue;
      filled.push({
        sectionId: section.id,
        sectionTitle: section.title || 'Documento',
        rationale: `En «${section.title}» no aparece ${field.label}.`,
        proposedText: `${field.prefix}: por confirmar con el promotor antes del montaje.`,
      });
    }
  }

  return [...filled, ...empty].slice(0, 5);
}

export function mergeReviewPoints(primary: ReviewPoint[], extra: ReviewPoint[]): ReviewPoint[] {
  const merged = [...primary];
  for (const point of extra) {
    if (merged.length >= 5) break;
    const same = merged.some((item) => item.sectionId === point.sectionId && item.rationale === point.rationale);
    if (!same) merged.push(point);
  }
  return merged.slice(0, 5);
}

export function composeReviewMessage(params: {
  score: number;
  summary: string;
  points: ReviewPoint[];
}): string {
  const summary = params.summary.replace(/\s+/g, ' ').trim();
  const lines = [
    'Revisé el rider. Esto es lo que se puede cambiar o reforzar.',
    '',
    `Diagnóstico: ${params.score}/100. ${summary || 'El documento tiene una base usable y aún admite cláusulas más precisas.'}`,
    '',
    REVIEW_HEADING,
  ];

  if (params.points.length === 0) {
    lines.push('No encontré cláusulas concretas para agregar. El documento ya cubre los puntos que revisé.');
    return lines.join('\n');
  }

  params.points.forEach((point, index) => {
    const proposal = point.proposedText.replace(/\s+/g, ' ').trim().slice(0, 280);
    lines.push('');
    lines.push(`${index + 1}. ${point.sectionTitle}`);
    lines.push(point.rationale);
    if (proposal) lines.push(`Cambio propuesto: ${proposal}`);
  });

  lines.push('');
  lines.push('Puedes aplicar cada cambio desde esta conversación. El documento no se modifica hasta que lo confirmes.');
  return lines.join('\n').slice(0, 7900);
}

export function readReviewSuggestions(actions: unknown): DocumentSuggestion[] {
  if (!Array.isArray(actions)) return [];
  const suggestions: DocumentSuggestion[] = [];
  for (const action of actions) {
    if (!action || typeof action !== 'object') continue;
    const record = action as { kind?: unknown; suggestions?: unknown };
    if (record.kind !== 'rider-review' || !Array.isArray(record.suggestions)) continue;
    for (const item of record.suggestions) {
      if (!item || typeof item !== 'object') continue;
      const suggestion = item as Partial<DocumentSuggestion>;
      if (!suggestion.id || !suggestion.sectionId || !suggestion.proposedText || !suggestion.rationale) continue;
      suggestions.push({
        id: suggestion.id,
        sectionId: suggestion.sectionId,
        kind: suggestion.kind || 'insert',
        baseText: suggestion.baseText || '',
        proposedText: suggestion.proposedText,
        rationale: suggestion.rationale,
        status: suggestion.status || 'pending',
        source: 'agent',
        newSectionTitle: suggestion.newSectionTitle,
      });
    }
  }
  return suggestions;
}
