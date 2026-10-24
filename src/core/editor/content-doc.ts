import { formatInputListPlainText, type InputListColumn, type InputListRow } from '@/core/constants/input-list';
import { formatWorkAreasPlainText, normalizeWorkAreas } from '@/core/constants/work-areas';
import { SECTION_FIELD_CONFIGS, findSectionConfig } from '@/core/constants/section-fields';
import { isWorkAreasSectionId } from '@/core/constants/work-areas';
import { formatRiderDate, riderKicker } from '@/core/constants/document-themes';
import { RiderContentDoc, RiderContentNode, RiderType, SectionItem } from '@/core/types/rider.types';
import { DocumentSuggestion } from '@/core/types/suggestion.types';

interface JsonNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
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
      for (const item of node.content || []) {
        for (const child of item.content || []) {
          if (child.type === 'bulletList') {
            for (const subItem of child.content || []) {
              lines.push(`  ◦ ${inlineText(subItem)}`);
            }
          } else {
            const t = inlineText(child).trim();
            if (t) lines.push(`• ${t}`);
          }
        }
      }
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
    if (node.type === 'riderCover') {
      const bits = ['kicker', 'artist', 'title', 'version', 'date']
        .map((key) => (typeof node.attrs?.[key] === 'string' ? node.attrs[key].trim() : ''))
        .filter(Boolean);
      if (bits.length) lines.push(bits.join(' · '));
      return;
    }
    if (node.type === 'requirement') {
      const label = typeof node.attrs?.label === 'string' ? node.attrs.label.trim() : 'Requisito';
      const body = inlineText(node).trim();
      lines.push(body ? `${label}: ${body}` : label);
      return;
    }
    if (node.type === 'notice') {
      const tone = node.attrs?.tone === 'required'
        ? 'Obligatorio'
        : node.attrs?.tone === 'rejected'
          ? 'No aceptado'
          : 'Nota';
      const body = inlineText(node).trim();
      lines.push(body ? `[${tone}] ${body}` : `[${tone}]`);
      return;
    }
    if (node.type === 'tiers') {
      lines.push(`Preferido: ${typeof node.attrs?.preferred === 'string' ? node.attrs.preferred : ''}`);
      lines.push(`Alternativa: ${typeof node.attrs?.alternative === 'string' ? node.attrs.alternative : ''}`);
      lines.push(`No aceptado: ${typeof node.attrs?.rejected === 'string' ? node.attrs.rejected : ''}`);
      return;
    }
    if (node.type === 'contacts') {
      const people = Array.isArray(node.attrs?.people) ? node.attrs.people : [];
      for (const person of people) {
        if (!person || typeof person !== 'object') continue;
        const row = person as Record<string, unknown>;
        const bits = ['role', 'name', 'phone', 'email']
          .map((key) => (typeof row[key] === 'string' ? row[key].trim() : ''))
          .filter(Boolean);
        if (bits.length) lines.push(bits.join(' · '));
      }
      return;
    }
    if (node.type === 'columns') {
      const left = typeof node.attrs?.left === 'string' ? node.attrs.left.trim() : '';
      const right = typeof node.attrs?.right === 'string' ? node.attrs.right.trim() : '';
      if (left) lines.push(left);
      if (right) lines.push(right);
      if (typeof node.attrs?.imageSrc === 'string' && node.attrs.imageSrc) lines.push('[imagen]');
      return;
    }
    if (node.type === 'inputList') {
      const rows = Array.isArray(node.attrs?.rows) ? (node.attrs.rows as InputListRow[]) : [];
      const columns = Array.isArray(node.attrs?.columns) ? (node.attrs.columns as InputListColumn[]) : undefined;
      const text = formatInputListPlainText(rows, columns);
      if (text) lines.push(text);
      return;
    }
    if (node.type === 'workAreas') {
      const text = formatWorkAreasPlainText(normalizeWorkAreas(node.attrs?.areas));
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

export const DOCUMENT_INTRO_ID = 'doc-intro';
export const DOCUMENT_COVER_ID = 'doc-cover';

export function isDocumentIntro(id: string) {
  return id === DOCUMENT_INTRO_ID || id.startsWith(`${DOCUMENT_INTRO_ID}-`);
}

export function buildCoverContentDoc(
  type: RiderType = 'tecnico',
  artistName = '',
  title = '',
  version = 'v1.0',
  imageSrc = ''
): RiderContentDoc {
  return {
    type: 'doc',
    content: [
      {
        type: 'riderCover',
        attrs: {
          kicker: riderKicker(type),
          artist: artistName.trim(),
          title: title.trim(),
          version: version.trim() || 'v1.0',
          date: formatRiderDate(),
          imageSrc,
          plate: Boolean(imageSrc),
        },
      },
    ],
  };
}

export function isDocumentCover(id: string) {
  return id === DOCUMENT_COVER_ID || id.startsWith(`${DOCUMENT_COVER_ID}-`);
}

export function coverIndexFromId(id: string) {
  if (id === DOCUMENT_COVER_ID) return 0;
  const match = new RegExp(`^${DOCUMENT_COVER_ID}-(\\d+)$`).exec(id);
  return match ? Number(match[1]) - 1 : -1;
}

export function sectionsForOutline(sections: SectionItem[]): SectionItem[] {
  const visible: SectionItem[] = [];
  let coverCount = 0;
  for (const section of sections) {
    if (isDocumentCover(section.id)) {
      visible.push({ ...section, title: section.title || 'Portada' });
      continue;
    }
    if (!isDocumentIntro(section.id)) {
      visible.push(section);
      continue;
    }
    for (const node of section.contentDoc?.content || []) {
      if (node.type !== 'riderCover') continue;
      coverCount += 1;
      visible.push({
        id: coverCount === 1 ? DOCUMENT_COVER_ID : `${DOCUMENT_COVER_ID}-${coverCount}`,
        num: '',
        title: 'Portada',
        subtitle: '',
        tag: 'Portada',
        tagColor: section.tagColor,
        iconName: 'fileText',
        contentDoc: { type: 'doc', content: [node] },
      });
    }
  }
  return visible.map((section, index) => ({
    ...section,
    num: String(index + 1).padStart(2, '0'),
  }));
}

export function documentStructureKey(doc: { content?: JsonNode[] }) {
  return (doc.content || []).flatMap((node) => {
    if (node.type === 'heading' && node.attrs?.level === 2 && typeof node.attrs.id === 'string') {
      return [`h:${node.attrs.id}`];
    }
    if (node.type === 'riderCover') return ['cover'];
    return [];
  }).join('|');
}

export function sectionStartsOnNewPage(section: SectionItem, index: number): boolean {
  if (typeof section.pageBreakBefore === 'boolean') return section.pageBreakBefore;
  if (index === 0) return false;
  if (section.id.startsWith('custom-') || section.id.startsWith('section-') || isDocumentIntro(section.id)) {
    return false;
  }
  return true;
}

function sectionHeadingNode(section: SectionItem): RiderContentNode | undefined {
  return (sectionToDoc(section).content || []).find(
    (node) => node.type === 'heading' && node.attrs?.id === section.id
  );
}

function sectionBody(section: SectionItem): RiderContentNode[] {
  return (sectionToDoc(section).content || []).filter((node) => {
    if (node.type !== 'heading') return true;
    return node.attrs?.id !== section.id;
  });
}

export function riderDocumentFromSections(
  sections: SectionItem[],
  header?: { artistName?: string; title?: string }
): RiderContentDoc {
  const content: RiderContentNode[] = [];
  const artist = header?.artistName?.trim();
  const title = header?.title?.trim();
  const hasCover = sections.some((section) => (
    isDocumentCover(section.id) || sectionBody(section).some((node) => node.type === 'riderCover')
  ));
  if (sections.length === 0 && !artist) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }
  if (sections.length === 0 && artist && !hasCover) {
    content.push({
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: artist }],
    });
    if (title) {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: title }],
      });
    }
  }

  let headedIndex = 0;
  let previousBreaksPage = false;
  for (const section of sections) {
    const body = sectionBody(section);
    if (isDocumentIntro(section.id) || isDocumentCover(section.id)) {
      if (body.length === 0) content.push({ type: 'paragraph' });
      else content.push(...body);
      previousBreaksPage = isDocumentCover(section.id);
      continue;
    }
    const existingHeading = sectionHeadingNode(section);
    content.push({
      type: 'heading',
      attrs: {
        ...(existingHeading?.attrs || {}),
        level: 2,
        id: section.id,
        pageBreakBefore: previousBreaksPage ? false : sectionStartsOnNewPage(section, headedIndex),
      },
      content:
        existingHeading?.content && existingHeading.content.length > 0
          ? existingHeading.content
          : [{ type: 'text', text: section.title || 'Sección' }],
    });
    previousBreaksPage = false;
    headedIndex += 1;
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
  pageBreakBefore?: boolean;
}

export function splitDocumentToSections(doc: RiderContentDoc, _sectionIds?: string[]): SectionDocumentPatch[] {
  const patches: SectionDocumentPatch[] = [];
  let current: {
    id: string;
    title: string;
    headingNode?: RiderContentNode;
    nodes: RiderContentNode[];
    pageBreakBefore?: boolean;
  } | null = null;

  const flush = () => {
    if (!current) return;
    const intro = isDocumentIntro(current.id);
    const empty = current.nodes.every((node) => {
      if (node.type === 'paragraph' || node.type === 'heading') return !inlineText(node).trim();
      return false;
    });
    if (intro && (current.nodes.length === 0 || empty)) {
      current = null;
      return;
    }
    const bodyNodes = current.nodes.length ? current.nodes : [{ type: 'paragraph' }];
    const bodyDoc: RiderContentDoc = {
      type: 'doc',
      content: bodyNodes,
    };
    const fullNodes = current.headingNode ? [current.headingNode, ...bodyNodes] : bodyNodes;
    const contentDoc: RiderContentDoc = {
      type: 'doc',
      content: fullNodes,
    };
    patches.push({
      id: current.id,
      title: current.title,
      contentDoc,
      content: docToPlainText(bodyDoc) || current.title,
      pageBreakBefore: current.pageBreakBefore,
    });
    current = null;
  };

  let coverCount = 0;
  let introCount = 0;

  for (const node of doc.content || []) {
    const headingId = typeof node.attrs?.id === 'string' ? node.attrs.id : '';
    const level = node.attrs?.level;
    if (node.type === 'riderCover') {
      flush();
      coverCount += 1;
      const contentDoc: RiderContentDoc = { type: 'doc', content: [node] };
      patches.push({
        id: coverCount === 1 ? DOCUMENT_COVER_ID : `${DOCUMENT_COVER_ID}-${coverCount}`,
        title: 'Portada',
        contentDoc,
        content: docToPlainText(contentDoc),
      });
      continue;
    }
    if (node.type === 'heading' && level === 2 && headingId) {
      flush();
      current = {
        id: headingId,
        title: inlineText(node as JsonNode) || 'Sección',
        headingNode: node,
        nodes: [],
        pageBreakBefore: node.attrs?.pageBreakBefore === true,
      };
      continue;
    }
    if (!current) {
      introCount += 1;
      current = {
        id: introCount === 1 ? DOCUMENT_INTRO_ID : `${DOCUMENT_INTRO_ID}-${introCount}`,
        title: '',
        nodes: [],
      };
    }
    current.nodes.push(node);
  }
  flush();
  if (patches.length === 1 && patches[0].id === DOCUMENT_INTRO_ID) {
    const nodes = (patches[0].contentDoc.content || []) as JsonNode[];
    const hasBody = nodes.some((node) => {
      if (node.type === 'paragraph' || node.type === 'heading') return Boolean(inlineText(node).trim());
      return Boolean(node.type && node.type !== 'paragraph');
    });
    if (!hasBody && !(patches[0].content || '').trim()) return [];
  }
  return patches;
}

export function buildGapSuggestions(
  section: SectionItem,
  dismissed: Set<string>,
  active: boolean
): DocumentSuggestion[] {
  const text = section.content || '';
  const config = findSectionConfig(section.id, section.title);
  const suggestions: DocumentSuggestion[] = [];

  if (isDocumentIntro(section.id) || isDocumentCover(section.id) || isWorkAreasSectionId(section.id)) return suggestions;
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
