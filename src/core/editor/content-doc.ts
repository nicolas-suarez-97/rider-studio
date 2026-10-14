import { SECTION_FIELD_CONFIGS } from '@/core/constants/section-fields';
import { RiderContentDoc, RiderContentNode, SectionItem } from '@/core/types/rider.types';
import { DocumentSuggestion } from '@/core/types/suggestion.types';

interface JsonNode {
  type?: string;
  text?: string;
  content?: JsonNode[];
}

export function plainTextToDoc(text: string): RiderContentDoc {
  const lines = text.length > 0 ? text.split('\n') : [''];
  return {
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  };
}

export function sectionToDoc(section: Pick<SectionItem, 'content' | 'contentDoc'>): RiderContentDoc {
  if (section.contentDoc?.type === 'doc') return section.contentDoc;
  return plainTextToDoc(section.content || '');
}

function inlineText(node: JsonNode): string {
  if (node.text) return node.text;
  return (node.content || []).map((child) => inlineText(child)).join('');
}

export function docToPlainText(doc: RiderContentDoc | JsonNode): string {
  const lines: string[] = [];

  const visit = (node: JsonNode) => {
    if (node.type === 'paragraph' || node.type === 'heading') {
      lines.push(inlineText(node));
      return;
    }
    if (node.type === 'bulletList') {
      for (const item of node.content || []) lines.push(`• ${inlineText(item)}`);
      return;
    }
    if (node.type === 'orderedList') {
      (node.content || []).forEach((item, index) => {
        lines.push(`${index + 1}. ${inlineText(item)}`);
      });
      return;
    }
    for (const child of node.content || []) visit(child);
  };

  visit(doc as JsonNode);
  return lines.join('\n');
}

export function riderDocumentFromSections(
  sections: SectionItem[],
  header?: { artistName?: string; title?: string }
): RiderContentDoc {
  const content: RiderContentNode[] = [];
  const artist = header?.artistName?.trim();
  const title = header?.title?.trim();
  if (artist || title) {
    content.push({
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: artist || 'Documento' }],
    });
    if (title) {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: title }],
      });
    }
  }

  for (const section of sections) {
    content.push({
      type: 'heading',
      attrs: { level: 2, id: section.id },
      content: [{ type: 'text', text: section.title || 'Sección' }],
    });
    const body = (sectionToDoc(section).content || []).filter((node) => {
      if (node.type !== 'heading') return true;
      return node.attrs?.id !== section.id;
    });
    if (body.length === 0) content.push({ type: 'paragraph' });
    else content.push(...body);
  }

  return { type: 'doc', content };
}

export interface SectionDocumentPatch {
  id: string;
  title: string;
  contentDoc: RiderContentDoc;
  content: string;
}

export function splitDocumentToSections(doc: RiderContentDoc, sectionIds: string[]): SectionDocumentPatch[] {
  const ids = new Set(sectionIds);
  const buckets = new Map<string, { title: string; nodes: RiderContentNode[] }>();
  for (const id of sectionIds) buckets.set(id, { title: '', nodes: [] });

  let currentId: string | null = null;
  let skipSubtitle = false;

  for (const node of doc.content || []) {
    const headingId = typeof node.attrs?.id === 'string' ? node.attrs.id : '';
    if (node.type === 'heading' && node.attrs?.level === 1 && !headingId) {
      skipSubtitle = true;
      continue;
    }
    if (skipSubtitle && node.type === 'paragraph') {
      skipSubtitle = false;
      continue;
    }
    skipSubtitle = false;
    if (node.type === 'heading' && headingId && ids.has(headingId)) {
      currentId = headingId;
      const bucket = buckets.get(headingId);
      if (bucket) bucket.title = inlineText(node as JsonNode) || bucket.title;
      continue;
    }
    if (!currentId) continue;
    const bucket = buckets.get(currentId);
    if (bucket) bucket.nodes.push(node);
  }

  return sectionIds.map((id) => {
    const bucket = buckets.get(id);
    const contentDoc: RiderContentDoc = {
      type: 'doc',
      content: bucket?.nodes?.length ? bucket.nodes : [{ type: 'paragraph' }],
    };
    return {
      id,
      title: bucket?.title || '',
      contentDoc,
      content: docToPlainText(contentDoc),
    };
  });
}

export function buildGapSuggestions(
  section: SectionItem,
  dismissed: Set<string>,
  active: boolean
): DocumentSuggestion[] {
  const text = section.content || '';
  const config = SECTION_FIELD_CONFIGS[section.id];
  const suggestions: DocumentSuggestion[] = [];

  if (!text.trim()) {
    const id = `gap:${section.id}:empty`;
    if (dismissed.has(id)) return suggestions;
    const proposed = config
      ? config.fields.map((field) => `${field.prefix}: `).join('\n')
      : section.subtitle || `Requerimientos de ${section.title}.`;
    suggestions.push({
      id,
      sectionId: section.id,
      kind: 'insert',
      baseText: '',
      proposedText: proposed,
      rationale: 'Esta sección no tiene contenido.',
      status: 'pending',
      source: 'gap',
    });
    return suggestions;
  }

  if (!active || !config) return suggestions;

  for (const field of config.fields) {
    const id = `gap:${section.id}:${field.key}`;
    if (dismissed.has(id)) continue;
    const present = text.toLowerCase().includes(field.prefix.toLowerCase());
    if (present) continue;
    suggestions.push({
      id,
      sectionId: section.id,
      kind: 'insert',
      baseText: '',
      proposedText: `${field.prefix}: `,
      rationale: `Falta ${field.label}.`,
      status: 'pending',
      source: 'gap',
    });
  }

  return suggestions;
}
