import type { RiderContentDoc, RiderContentNode, SectionItem } from '../types/rider.types';
import {
  nextSectionContent,
  nextSectionRevision,
} from './apply-block-correction';
import {
  type ChatSuggestionDraft,
  type RiderBlockRef,
  planChatDocumentApply,
} from './chat-document-sync';
import { riderMarkupToContent } from './rider-markup';

export const CHAT_TRANSFER_PERSIST_FAIL =
  'No pude guardar el contenido en el rider. El documento no se modificó.';

export const CHAT_TRANSFER_RIDER_MISSING =
  'No pude guardar el contenido en el rider: no hay un rider vinculado a esta conversación. El documento no se modificó.';

export interface PersistChatTransferResult {
  ok: boolean;
  sections?: SectionItem[];
  error?: string;
}

export interface PersistRiderRow {
  id?: string;
  title?: string;
  artist_name?: string;
  rider_type?: string;
  venue_name?: string | null;
  event_date?: string | null;
  version?: string;
  status?: string;
  channels?: unknown;
  sections?: unknown;
  metadata?: unknown;
  media?: unknown;
}

export interface PersistRiderSaveInput {
  id?: string;
  title: string;
  artist_name: string;
  rider_type?: string;
  venue_name?: string | null;
  event_date?: string | null;
  version?: string;
  status?: string;
  channels?: unknown;
  sections?: unknown;
  metadata?: unknown;
  media?: unknown;
}

function isCoverOrIntro(id: string): boolean {
  return id === 'doc-cover'
    || id.startsWith('doc-cover-')
    || id === 'doc-intro'
    || id.startsWith('doc-intro-');
}

function asSections(value: unknown): SectionItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SectionItem => (
    Boolean(item)
    && typeof item === 'object'
    && typeof (item as SectionItem).id === 'string'
  ));
}

function proposedNodes(text: string): RiderContentNode[] {
  const blocks = riderMarkupToContent(text);
  if (blocks && blocks.length > 0) return blocks as RiderContentNode[];
  const lines = text.length > 0 ? text.split('\n') : [''];
  return lines.map((line) => ({
    type: 'paragraph',
    content: line ? [{ type: 'text', text: line }] : [],
  }));
}

function withContent(section: SectionItem, text: string): SectionItem {
  const contentDoc: RiderContentDoc = { type: 'doc', content: proposedNodes(text) };
  return { ...section, content: text, contentDoc };
}

function buildSection(id: string, title: string, text: string): SectionItem {
  return withContent({
    id,
    num: '',
    title,
    subtitle: '',
    tag: 'Custom',
    tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
    iconName: 'fileText',
    pageBreakBefore: false,
  }, text);
}

function applyDraftToSection(section: SectionItem, draft: ChatSuggestionDraft): SectionItem {
  const next = nextSectionContent(section.content || '', draft);
  return {
    ...withContent(section, next),
    revision: nextSectionRevision(section.revision, draft) ?? section.revision,
  };
}

export function shouldPersistChatTransferOnServer(editorContext?: {
  sectionId?: string;
  sectionText?: string;
  allSections?: unknown[];
}): boolean {
  return editorContext == null;
}

export function applyChatSuggestionsToRiderSections(input: {
  sections: SectionItem[];
  suggestions: ChatSuggestionDraft[];
}): PersistChatTransferResult {
  if (!(input.suggestions || []).length) {
    return { ok: false, error: CHAT_TRANSFER_PERSIST_FAIL };
  }

  const sections = input.sections.map((section) => ({ ...section }));
  const refs: RiderBlockRef[] = sections.map((section) => ({ id: section.id, title: section.title }));
  let changed = false;

  for (const draft of input.suggestions || []) {
    if (draft.kind === 'switch_theme' || draft.kind === 'switch_type' || draft.kind === 'add_channel') {
      continue;
    }

    const plan = planChatDocumentApply({
      draft,
      sections: refs,
    });

    if (plan.action === 'fail') {
      return { ok: false, error: plan.error || CHAT_TRANSFER_PERSIST_FAIL };
    }

    if (plan.action === 'create_section') {
      const title = plan.newSectionTitle || draft.newSectionTitle || 'Requerimientos';
      const created = buildSection(plan.sectionId, title, (draft.proposedText || '').trim());
      sections.push(created);
      refs.push({ id: created.id, title: created.title });
      changed = true;
      continue;
    }

    const index = sections.findIndex((section) => section.id === plan.sectionId);
    if (index < 0) {
      return { ok: false, error: CHAT_TRANSFER_PERSIST_FAIL };
    }
    sections[index] = applyDraftToSection(sections[index], plan.draft);
    changed = true;
  }

  if (!changed) {
    return { ok: false, error: CHAT_TRANSFER_PERSIST_FAIL };
  }

  return { ok: true, sections };
}

export async function loadRiderTransferContext(
  riderId: string,
  loadRider?: (id: string) => Promise<PersistRiderRow | null>
): Promise<{ sections: RiderBlockRef[]; activeSectionId?: string } | null> {
  const load = loadRider ?? defaultLoadRider;
  const row = await load(riderId);
  if (!row) return null;
  const sections = asSections(row.sections)
    .filter((section) => !isCoverOrIntro(section.id))
    .map((section) => ({ id: section.id, title: section.title || 'Sección' }));
  return {
    sections,
    activeSectionId: sections[0]?.id,
  };
}

export async function persistChatTransferToRider(input: {
  riderId?: string;
  suggestions: ChatSuggestionDraft[];
  loadRider?: (id: string) => Promise<PersistRiderRow | null>;
  saveRider?: (payload: PersistRiderSaveInput) => Promise<unknown>;
}): Promise<PersistChatTransferResult> {
  const riderId = (input.riderId || '').trim();
  if (!riderId) {
    return { ok: false, error: CHAT_TRANSFER_RIDER_MISSING };
  }
  if (!(input.suggestions || []).length) {
    return { ok: false, error: CHAT_TRANSFER_PERSIST_FAIL };
  }

  try {
    const load = input.loadRider ?? defaultLoadRider;
    const save = input.saveRider ?? defaultSaveRider;
    const row = await load(riderId);
    if (!row) {
      return { ok: false, error: CHAT_TRANSFER_PERSIST_FAIL };
    }

    const applied = applyChatSuggestionsToRiderSections({
      sections: asSections(row.sections),
      suggestions: input.suggestions,
    });
    if (!applied.ok || !applied.sections) return applied;

    await save({
      id: row.id || riderId,
      title: row.title || 'Rider de Producción',
      artist_name: row.artist_name || 'Nuevo Artista / Banda',
      rider_type: row.rider_type,
      venue_name: row.venue_name,
      event_date: row.event_date,
      version: row.version,
      status: row.status,
      channels: row.channels,
      sections: applied.sections,
      metadata: row.metadata,
      media: row.media,
    });

    return { ok: true, sections: applied.sections };
  } catch {
    return { ok: false, error: CHAT_TRANSFER_PERSIST_FAIL };
  }
}

async function defaultLoadRider(id: string): Promise<PersistRiderRow | null> {
  const { getRiderById } = await import('../../lib/services/rider-storage');
  return getRiderById(id);
}

async function defaultSaveRider(payload: PersistRiderSaveInput): Promise<unknown> {
  const { saveRider } = await import('../../lib/services/rider-storage');
  return saveRider({
    ...payload,
    channels: payload.channels as never,
    sections: payload.sections as never,
    metadata: payload.metadata as never,
    media: payload.media as never,
  });
}
