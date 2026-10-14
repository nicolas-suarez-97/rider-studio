import { formatInputListPlainText, type InputListRow } from '@/core/constants/input-list';
import { SECTION_FIELD_CONFIGS } from '@/core/constants/section-fields';
import { RiderContentDoc, RiderContentNode, SectionItem } from '@/core/types/rider.types';
import { DocumentSuggestion } from '@/core/types/suggestion.types';

interface JsonNode {
  type?: string;
  text?: string;
  attrs?: { id?: unknown; level?: unknown; src?: unknown; alt?: unknown; title?: unknown; width?: unknown; height?: unknown; checked?: unknown; rows?: unknown };
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
    if (node.type === 'image') {
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt.trim() : '';
      lines.push(alt ? `[imagen: ${alt}]` : '[imagen]');
      return;
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      const text = inlineText(node);
      if (text) lines.push(text);
      const images = (node.content || []).filter((child) => child.type === 'image');
      for (const image of images) visit(image);
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
    if (node.type === 'taskList') {
      for (const item of node.content || []) {
        const checked = item.attrs?.checked === true ? 'x' : ' ';
        lines.push(`[${checked}] ${inlineText(item)}`);
      }
      return;
    }
    if (node.type === 'table') {
      for (const row of node.content || []) {
        const cells = (row.content || []).map((cell) => inlineText(cell).replace(/\s+/g, ' ').trim());
        lines.push(cells.join(' | '));
      }
      return;
    }
    if (node.type === 'blockquote') {
      for (const child of node.content || []) visit(child);
      return;
    }
    if (node.type === 'horizontalRule') {
      lines.push('---');
      return;
    }
    if (node.type === 'inputList') {
      const rows = Array.isArray(node.attrs?.rows) ? (node.attrs.rows as InputListRow[]) : [];
      const text = formatInputListPlainText(rows);
      if (text) lines.push(text);
      return;
    }
    for (const child of node.content || []) visit(child);
  };

  visit(doc as JsonNode);
  return lines.join('\n');
}

export function newSectionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `section-${crypto.randomUUID()}`;
  }
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function headingIdsFromDoc(doc: RiderContentDoc | JsonNode): string[] {
  const ids: string[] = [];
  for (const node of (doc.content || []) as JsonNode[]) {
    const id = typeof node.attrs?.id === 'string' ? node.attrs.id : '';
    const level = node.attrs?.level;
    if (node.type === 'heading' && level === 2 && id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function sectionStartsOnNewPage(section: SectionItem, index: number): boolean {
  if (typeof section.pageBreakBefore === 'boolean') return section.pageBreakBefore;
  if (index === 0) return false;
  if (section.id.startsWith('custom-') || section.id.startsWith('section-') || section.id === 'doc-intro') {
    return false;
  }
  return true;
}

export function riderDocumentFromSections(
  sections: SectionItem[],
  header?: { artistName?: string; title?: string }
): RiderContentDoc {
  const content: RiderContentNode[] = [];
  const artist = header?.artistName?.trim();
  const title = header?.title?.trim();
  if (sections.length === 0 && !artist) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }
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

  sections.forEach((section, index) => {
    content.push({
      type: 'heading',
      attrs: {
        level: 2,
        id: section.id,
        pageBreakBefore: sectionStartsOnNewPage(section, index),
      },
      content: [{ type: 'text', text: section.title || 'Sección' }],
    });
    const body = (sectionToDoc(section).content || []).filter((node) => {
      if (node.type !== 'heading') return true;
      return node.attrs?.id !== section.id;
    });
    if (body.length === 0) content.push({ type: 'paragraph' });
    else content.push(...body);
  });

  return { type: 'doc', content };
}

export interface SectionDocumentPatch {
  id: string;
  title: string;
  contentDoc: RiderContentDoc;
  content: string;
  pageBreakBefore?: boolean;
}

export function splitDocumentToSections(doc: RiderContentDoc, _sectionIds?: string[]): SectionDocumentPatch[] {
  const patches: SectionDocumentPatch[] = [];
  let current: { id: string; title: string; nodes: RiderContentNode[]; pageBreakBefore?: boolean } | null = null;
  let skipSubtitle = false;

  const flush = () => {
    if (!current) return;
    const contentDoc: RiderContentDoc = {
      type: 'doc',
      content: current.nodes.length ? current.nodes : [{ type: 'paragraph' }],
    };
    patches.push({
      id: current.id,
      title: current.title,
      contentDoc,
      content: docToPlainText(contentDoc),
      pageBreakBefore: current.pageBreakBefore,
    });
  };

  for (const node of doc.content || []) {
    const headingId = typeof node.attrs?.id === 'string' ? node.attrs.id : '';
    const level = node.attrs?.level;
    if (node.type === 'heading' && level === 1 && !headingId) {
      skipSubtitle = true;
      continue;
    }
    if (skipSubtitle && node.type === 'paragraph') {
      skipSubtitle = false;
      continue;
    }
    skipSubtitle = false;
    if (node.type === 'heading' && level === 2 && headingId) {
      flush();
      current = {
        id: headingId,
        title: inlineText(node as JsonNode) || 'Sección',
        nodes: [],
        pageBreakBefore: node.attrs?.pageBreakBefore === true,
      };
      continue;
    }
    if (!current) {
      current = { id: 'doc-intro', title: 'Documento', nodes: [] };
    }
    current.nodes.push(node);
  }
  flush();
  if (
    patches.length === 1
    && patches[0].id === 'doc-intro'
    && !(patches[0].content || '').trim()
  ) {
    return [];
  }
  return patches;
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
