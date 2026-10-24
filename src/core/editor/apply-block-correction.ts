import type { ChatSuggestionDraft } from './chat-document-sync';

export type BlockRevision = 'proposed' | 'confirmed';

const CORRECTION_RATIONALE =
  /modific|actualiz|cambi|reemplaz|correg|sustitu|ajust/i;

export function isInPlaceCorrection(draft: Pick<ChatSuggestionDraft, 'kind' | 'baseText' | 'rationale'>): boolean {
  if (draft.kind === 'replace' || draft.kind === 'delete') return true;
  if ((draft.baseText || '').trim()) return true;
  return CORRECTION_RATIONALE.test(draft.rationale || '');
}

export function alreadyHasProposedText(existing: string, proposed: string): boolean {
  const current = (existing || '').trim();
  const next = (proposed || '').trim();
  if (!next) return false;
  if (current === next) return true;
  if (!current.endsWith(next)) return false;
  const prefix = current.slice(0, current.length - next.length);
  return prefix.length === 0 || prefix.endsWith('\n');
}

export function nextSectionContent(existing: string, draft: ChatSuggestionDraft): string {
  const current = existing || '';
  const proposed = (draft.proposedText || '').trim();

  if (draft.kind === 'delete') {
    const base = (draft.baseText || '').trim();
    return base ? current.replace(base, '').trim() : current;
  }

  if (isInPlaceCorrection(draft)) {
    const base = (draft.baseText || '').trim();
    if (base && current.includes(base)) {
      return current.replace(base, draft.proposedText || '');
    }
    if (alreadyHasProposedText(current, proposed)) {
      return current.trim() === proposed ? proposed : current;
    }
    return proposed || current;
  }

  if (alreadyHasProposedText(current, proposed)) {
    return current;
  }
  const trimmed = current.trim();
  return trimmed ? `${trimmed}\n${proposed}` : proposed;
}

export function nextSectionRevision(
  current: BlockRevision | undefined,
  draft: ChatSuggestionDraft
): BlockRevision | undefined {
  if (isInPlaceCorrection(draft)) return 'proposed';
  return current;
}

export function mergeAppliedDocumentSuggestions<T extends { sectionId?: string }>(
  current: T[],
  incoming: T[]
): T[] {
  const incomingSectionIds = new Set(
    incoming.map((item) => (item.sectionId || '').trim()).filter(Boolean)
  );
  return [
    ...current.filter((item) => {
      const sectionId = (item.sectionId || '').trim();
      return !sectionId || !incomingSectionIds.has(sectionId);
    }),
    ...incoming,
  ];
}
