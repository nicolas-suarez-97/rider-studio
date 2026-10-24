import type { SectionItem } from '../types/rider.types';

export type ProposedDraft = {
  id?: string;
  sectionId?: string;
  kind?: string;
  status?: string;
  proposedText?: string;
  baseText?: string;
  newSectionTitle?: string;
  channel?: { name?: string };
};

export function proposalTargetKey(item: ProposedDraft): string {
  const kind = item.kind || 'insert';
  if (kind === 'switch_theme') return 'goal:theme';
  if (kind === 'switch_type') return 'goal:type';
  if (kind === 'add_channel') {
    return `goal:channel:${(item.channel?.name || item.sectionId || '').trim().toLowerCase()}`;
  }
  if (kind === 'add_section') {
    const title = (item.newSectionTitle || item.sectionId || '').trim().toLowerCase();
    return `goal:add-section:${title}`;
  }
  return `block:${(item.sectionId || '').trim()}`;
}

export function isActiveProposed(item: ProposedDraft): boolean {
  return item.status === 'applied' || item.status === 'pending' || item.status === 'proposed';
}

export function replaceActiveProposed<T extends ProposedDraft>(
  current: T[],
  incoming: T[],
): { next: T[]; superseded: T[] } {
  const incomingByTarget = new Map<string, T>();
  const incomingObsolete: T[] = [];
  for (const item of incoming) {
    const key = proposalTargetKey(item);
    const previous = incomingByTarget.get(key);
    if (previous) incomingObsolete.push(previous);
    incomingByTarget.set(key, item);
  }
  const uniqueIncoming = [...incomingByTarget.values()];

  const superseded: T[] = [];
  const kept: T[] = [];
  for (const item of current) {
    if (!isActiveProposed(item)) {
      kept.push(item);
      continue;
    }
    if (incomingByTarget.has(proposalTargetKey(item))) {
      superseded.push(item);
      continue;
    }
    kept.push(item);
  }

  return { next: [...kept, ...uniqueIncoming], superseded: [...superseded, ...incomingObsolete] };
}

function applyDraftToText(
  confirmed: string,
  draft: ProposedDraft,
): string {
  const proposed = (draft.proposedText || '').trim();
  if (draft.kind === 'replace') {
    const base = (draft.baseText || '').trim();
    if (base && confirmed.includes(base)) {
      return confirmed.replace(base, draft.proposedText || '');
    }
    return draft.proposedText || confirmed;
  }
  if (draft.kind === 'delete') {
    const base = (draft.baseText || '').trim();
    return base ? confirmed.replace(base, '').trim() : confirmed;
  }
  if (!proposed) return confirmed;
  const existing = confirmed.trim();
  return existing ? `${existing}\n${proposed}` : proposed;
}

export function applyProposedToConfirmedText(
  confirmed: string,
  draft: ProposedDraft,
  options?: { confirm?: boolean },
): string {
  if (!options?.confirm) return confirmed;
  return applyDraftToText(confirmed, draft);
}

export function previewSectionText(
  confirmed: string,
  proposed: ProposedDraft | null | undefined,
): string {
  if (!proposed) return confirmed;
  return applyDraftToText(confirmed, proposed);
}

function withContent(section: SectionItem, text: string): SectionItem {
  const lines = text.length > 0 ? text.split('\n') : [''];
  return {
    ...section,
    content: text,
    contentDoc: {
      type: 'doc',
      content: lines.map((line) => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : [],
      })),
    },
  };
}

export function overlayProposedOnSections(
  sections: SectionItem[],
  proposed: ProposedDraft[],
): SectionItem[] {
  const { next } = replaceActiveProposed([], proposed.filter(isActiveProposed));
  const bySection = new Map<string, ProposedDraft>();
  const extra: SectionItem[] = [];

  for (const draft of next) {
    if (
      draft.kind === 'switch_theme'
      || draft.kind === 'switch_type'
      || draft.kind === 'add_channel'
    ) {
      continue;
    }

    if (draft.kind === 'add_section') {
      const title = (draft.newSectionTitle || 'Requerimientos').trim();
      const id = (draft.sectionId || '').trim();
      const existing = id ? sections.find((section) => section.id === id) : undefined;
      if (existing) {
        bySection.set(existing.id, draft);
        continue;
      }
      extra.push({
        id: id || `preview-${title.toLowerCase().replace(/\s+/g, '-')}`,
        num: '',
        title,
        subtitle: '',
        tag: 'Custom',
        tagColor: '',
        iconName: 'fileText',
        content: previewSectionText('', draft),
      });
      continue;
    }

    const sectionId = (draft.sectionId || '').trim();
    if (sectionId) bySection.set(sectionId, draft);
  }

  const overlaid = sections.map((section) => {
    const draft = bySection.get(section.id);
    if (!draft) return section;
    return withContent(section, previewSectionText(section.content || '', draft));
  });

  return extra.length > 0 ? [...overlaid, ...extra] : overlaid;
}
