import crypto from 'crypto';
import zlib from 'zlib';
import { extractImages, extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';
import { buildCoverContentDoc, DOCUMENT_COVER_ID, docToPlainText } from '@/core/editor/content-doc';
import {
  collectPageGraphics,
  containsPoint,
  coversPage,
  editorPx,
  renderPageRegion,
  type PdfCallout,
  type PdfRect,
} from '@/lib/importer/pdf-visuals';
import { RiderContentDoc, RiderContentNode, RiderMediaItem, RiderType, SectionItem } from '@/core/types/rider.types';
import { ChannelInput } from '@/core/models/ChannelInput';
import { encodePngBuffer, saveImportedImageBuffer } from '@/lib/media/image-store';
import { htmlToInline, inlinePlain, readDocxPackage } from '@/lib/importer/docx-inline';

export interface ParsedRiderDocument {
  artistName: string;
  riderTitle: string;
  riderType: RiderType;
  season: string;
  version: string;
  date: string;
  rawText: string;
  sections: SectionItem[];
  modules: {
    tecnico: SectionItem[];
    hospitality: SectionItem[];
    seguridad: SectionItem[];
  };
  channels: ChannelInput[];
  media: RiderMediaItem[];
  stagePlotImageUrl?: string;
  stagePlotImagePath?: string;
}

interface PdfTextSpan {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  bold: boolean;
  italic: boolean;
  color?: string;
}

interface PdfLine {
  y: number;
  xMin: number;
  xMax: number;
  height: number;
  spans: PdfTextSpan[];
  text: string;
  allBold: boolean;
  allItalic: boolean;
  isCentered: boolean;
  inCalloutBox: number; // -1 if not in a callout box, or box index >= 0
}

interface PageImageItem {
  url: string;
  pathname: string;
  x: number;
  y: number;
  width: number;
  height: number;
  yCenter: number;
  page: number;
  role: 'figure' | 'logo' | 'background' | 'diagram';
}

function sanitizeNodes(nodes: RiderContentNode[]): RiderContentNode[] {
  const clean = (node: RiderContentNode): RiderContentNode | null => {
    if (node.type === 'text') return node.text ? node : null;
    if (!Array.isArray(node.content)) return node;
    const content = node.content
      .map((child) => clean(child))
      .filter((child): child is RiderContentNode => Boolean(child));
    const next: RiderContentNode = { ...node };
    if (content.length > 0) next.content = content;
    else delete next.content;
    if ((next.type === 'paragraph' || next.type === 'heading') && !next.content) return next;
    if (next.type === 'pageFrame' && !next.content) return null;
    return next;
  };
  return nodes
    .map((node) => clean(node))
    .filter((node): node is RiderContentNode => Boolean(node));
}

interface CalloutBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  color?: string;
}

const INPUT_LIST_BOUNDS = [0, 47, 82, 215, 308, 352, 395, 458, 505, 9999];
const INPUT_LIST_HEADERS = ['CH', 'RACK', 'INSTRUMENT', 'MIC', 'STAND', 'WIRELESS', 'TYPE', 'WL #', 'NOTES'];

const MIX_LIST_BOUNDS = [0, 70, 150, 260, 350, 430, 510, 9999];
const MIX_LIST_HEADERS = ['MIXES', 'NAME', 'TYPE', 'IEM/WIRED', 'IEM #', 'OUTPUT', 'NOTES'];

function colIndexForX(x: number, bounds: number[]): number {
  for (let i = 0; i < bounds.length - 1; i++) {
    if (x >= bounds[i] && x < bounds[i + 1]) return i;
  }
  return bounds.length - 2;
}

function cleanUploadedFileName(fileName: string): string {
  return fileName.replace(/\.(?:pdf|docx|doc|txt|md)$/i, '').trim() || fileName.trim() || 'Rider Importado';
}

function slugify(value: string, fallback: string): string {
  const s = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return s || fallback;
}

function normalizeTextColor(color?: string): string | undefined {
  if (!color) return undefined;
  const hex = color.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(hex)) return undefined;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Ignore near-black (default ink) and near-white (invisible on white sheet)
  if (r < 38 && g < 38 && b < 38) return undefined;
  if (r > 235 && g > 235 && b > 235) return undefined;
  return hex;
}

/**
 * Extracts TrueType/OpenType bold & italic flags from embedded /FontFile2 streams in the PDF.
 * Handles PDFs exported by Google Docs, Skia, or Canva where font names are obfuscated
 * (e.g., AAAAAC+font000000002f4d07da) and only `head.macStyle` / `OS/2.usWeightClass` preserve weight.
 */
function extractEmbeddedPdfFontStyles(bytes: Uint8Array): Map<string, { bold: boolean; italic: boolean }> {
  const map = new Map<string, { bold: boolean; italic: boolean }>();
  try {
    const rawPdf = Buffer.from(bytes).toString('latin1');
    const fontRegex = /\/FontName\s*\/([^\s\/]+)[\s\S]{1,420}?stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m: RegExpExecArray | null;
    while ((m = fontRegex.exec(rawPdf)) !== null) {
      const fullFontName = m[1];
      const compressed = Buffer.from(m[2], 'latin1');
      try {
        const ttf = zlib.inflateSync(compressed);
        if (ttf.length < 12) continue;
        const numTables = ttf.readUInt16BE(4);
        let bold = /(bold|heavy|black|demi|semibold|extrabold)/i.test(fullFontName);
        let italic = /(italic|oblique|slanted)/i.test(fullFontName);

        for (let i = 0; i < numTables; i++) {
          const entryOffset = 12 + i * 16;
          if (entryOffset + 16 > ttf.length) break;
          const tag = ttf.toString('ascii', entryOffset, entryOffset + 4);
          const offset = ttf.readUInt32BE(entryOffset + 8);
          if (tag === 'head' && offset + 46 <= ttf.length) {
            const macStyle = ttf.readUInt16BE(offset + 44);
            if ((macStyle & 1) !== 0) bold = true;
            if ((macStyle & 2) !== 0) italic = true;
          } else if (tag === 'OS/2' && offset + 64 <= ttf.length) {
            const weightClass = ttf.readUInt16BE(offset + 4);
            const fsSelection = ttf.readUInt16BE(offset + 62);
            if (weightClass >= 600 || (fsSelection & 32) !== 0) bold = true;
            if ((fsSelection & 1) !== 0) italic = true;
          }
        }

        map.set(fullFontName, { bold, italic });
        const stripped = fullFontName.replace(/^[A-Z]{6}\+/, '');
        if (stripped !== fullFontName) {
          map.set(stripped, { bold, italic });
        }
      } catch {
        // Ignore non-deflate or non-TTF streams
      }
    }
  } catch {
    // Ignore binary scan errors
  }
  return map;
}

function buildTextNode(
  text: string,
  bold = false,
  italic = false,
  color?: string,
  fontSizePt?: number
): RiderContentNode {
  const marks: Array<{ type: string; attrs?: Record<string, unknown> }> = [];
  if (bold) marks.push({ type: 'bold' });
  if (italic) marks.push({ type: 'italic' });
  const cleanColor = normalizeTextColor(color);
  if (cleanColor) {
    marks.push({ type: 'textColor', attrs: { color: cleanColor } });
  }
  if (fontSizePt && fontSizePt >= 13.5) {
    marks.push({ type: 'fontSize', attrs: { size: `${Math.round(fontSizePt)}pt` } });
  }
  const emailMatch = /^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/.exec(text.trim());
  if (emailMatch) {
    marks.push({ type: 'link', attrs: { href: `mailto:${emailMatch[1]}` } });
  }
  return marks.length > 0 ? { type: 'text', text, marks } : { type: 'text', text };
}

function spansToInlineNodes(
  spans: PdfTextSpan[],
  stripLeadingBullet = false,
  preserveFontSize = false
): RiderContentNode[] {
  const sorted = [...spans].sort((a, b) => a.x - b.x);
  const segments: Array<{
    text: string;
    bold: boolean;
    italic: boolean;
    color?: string;
    fontSizePt?: number;
  }> = [];

  let strippedBullet = false;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    let text = cur.str;
    if (!strippedBullet && stripLeadingBullet) {
      const cleaned = text.replace(/^(?:[●•▪■▸·○◦*]|\s*[-–—])\s*/, '');
      if (cleaned !== text) {
        strippedBullet = true;
        text = cleaned;
        if (!text.trim()) continue;
      }
    }
    const curColor = normalizeTextColor(cur.color);
    const curSize = preserveFontSize ? Math.round(cur.height) : undefined;

    if (segments.length > 0) {
      const prevSpan = sorted[i - 1];
      const gap = cur.x - (prevSpan.x + (prevSpan.width || 0));
      const lastSeg = segments[segments.length - 1];
      const needsSpace = gap >= 1.8 && !lastSeg.text.endsWith(' ') && !text.startsWith(' ');
      if (
        lastSeg.bold === cur.bold &&
        lastSeg.italic === cur.italic &&
        lastSeg.color === curColor &&
        lastSeg.fontSizePt === curSize
      ) {
        lastSeg.text += (needsSpace ? ' ' : '') + text;
        continue;
      }
      if (needsSpace) {
        text = ' ' + text;
      }
    }
    segments.push({
      text,
      bold: cur.bold,
      italic: cur.italic,
      color: curColor,
      fontSizePt: curSize,
    });
  }

  return segments
    .filter((seg) => seg.text.length > 0)
    .map((seg) => buildTextNode(seg.text, seg.bold, seg.italic, seg.color, seg.fontSizePt));
}

function joinSpansPlainText(spans: PdfTextSpan[]): string {
  const sorted = [...spans].sort((a, b) => a.x - b.x);
  let out = '';
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    if (i > 0) {
      const prev = sorted[i - 1];
      const gap = cur.x - (prev.x + (prev.width || 0));
      if (gap >= 1.8 && !out.endsWith(' ') && !cur.str.startsWith(' ')) {
        out += ' ';
      }
    }
    out += cur.str;
  }
  return out.trim();
}

function mergeInlineNodes(a: RiderContentNode[], b: RiderContentNode[]): RiderContentNode[] {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  const result = a.map((n) => ({ ...n }));
  const last = result[result.length - 1];
  const first = b[0];
  const lastText = last.text || '';
  const firstText = first.text || '';

  const hyphenWrap = lastText.endsWith('-') && /^[a-z]/.test(firstText);
  const sep = hyphenWrap || lastText.endsWith(' ') || firstText.startsWith(' ') ? '' : ' ';

  const sameMarks = JSON.stringify(last.marks || []) === JSON.stringify(first.marks || []);
  if (sameMarks && last.type === 'text' && first.type === 'text') {
    last.text = lastText + sep + firstText;
    result.push(...b.slice(1));
  } else {
    if (sep && last.type === 'text') {
      last.text = lastText + sep;
    }
    result.push(...b);
  }
  return result;
}

function buildTipTapTable(headers: string[], rows: string[][], chunkSize = 16): RiderContentNode[] {
  if (rows.length === 0) return [];
  const tables: RiderContentNode[] = [];

  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const slice = rows.slice(offset, offset + chunkSize);
    const headerRow: RiderContentNode = {
      type: 'tableRow',
      content: headers.map((h) => ({
        type: 'tableHeader',
        content: [
          {
            type: 'paragraph',
            content: h ? [{ type: 'text', text: h, marks: [{ type: 'bold' }] }] : [],
          },
        ],
      })),
    };

    const dataRows: RiderContentNode[] = slice.map((r) => ({
      type: 'tableRow',
      content: headers.map((_, colIdx) => {
        const val = (r[colIdx] ?? '').trim();
        return {
          type: 'tableCell',
          content: [
            {
              type: 'paragraph',
              content: val ? [{ type: 'text', text: val }] : [],
            },
          ],
        };
      }),
    }));

    tables.push({
      type: 'table',
      content: [headerRow, ...dataRows],
    });
  }

  return tables;
}

function isRunningHeaderOrFooter(
  span: PdfTextSpan,
  pageNum: number,
  totalPages: number,
  pageHeight: number,
  hasRunningHeaderPattern: boolean
): boolean {
  if (totalPages < 2) return false;
  const text = span.str.trim();
  if (!text) return true;

  // Running footer at bottom of page (y < 76)
  if (span.y < 76) {
    if (/^_+$/.test(text)) return true;
    if (/^Page\s+\d+/i.test(text)) return true;
    if (text.toUpperCase() === 'TABLE OF CONTENTS' && span.y < 68) return true;
  }

  // Running header at top of page ONLY if the document actually has a running header bar (e.g. y > pageHeight - 68 with small font <= 13)
  if (hasRunningHeaderPattern && pageNum > 1 && span.y > pageHeight - 68 && span.height <= 13.5) {
    return true;
  }

  return false;
}

function extractRowsByColumnBounds(
  spans: PdfTextSpan[],
  bounds: number[],
  numCols: number,
  allowStereoMidpointMerge = false
): string[][] {
  const sorted = [...spans].sort((a, b) => b.y - a.y || a.x - b.x);
  const col0Spans = sorted.filter((s) => colIndexForX(s.x, bounds) === 0);
  const rows: Array<{ y: number; cells: PdfTextSpan[][] }> = [];

  for (const s of col0Spans) {
    const existing = rows.find((r) => Math.abs(r.y - s.y) <= 4.5);
    if (existing) {
      existing.cells[0].push(s);
    } else {
      const cells: PdfTextSpan[][] = Array.from({ length: numCols }, () => []);
      cells[0].push(s);
      rows.push({ y: s.y, cells });
    }
  }

  for (const s of sorted) {
    const cIdx = colIndexForX(s.x, bounds);
    if (cIdx === 0) continue;
    let bestRow: { y: number; cells: PdfTextSpan[][] } | null = null;
    let bestDist = Infinity;
    for (const r of rows) {
      const d = Math.abs(r.y - s.y);
      if (d < bestDist) {
        bestDist = d;
        bestRow = r;
      }
    }
    const maxTol = allowStereoMidpointMerge && cIdx >= 3 ? 13 : 6;
    if (bestRow && bestDist <= maxTol) {
      bestRow.cells[cIdx].push(s);
    }
  }

  return rows.map((r) => r.cells.map((cellSpans) => joinSpansPlainText(cellSpans)));
}

function classifySectionMeta(title: string, currentMajorRider: 'tecnico' | 'hospitality'): {
  moduleType: RiderType;
  tag: string;
  tagColor: string;
  iconName: string;
  subtitle: string;
} {
  const upper = title.toUpperCase();

  // 1. Matriz de canales / Input List
  if (upper.includes('INPUT LIST') || upper.includes('CANALES') || upper.includes('PATCH')) {
    return {
      moduleType: 'tecnico',
      tag: 'Input List',
      tagColor: 'bg-violet-100 text-violet-700',
      iconName: 'list',
      subtitle: 'Matriz de canales y microfonía',
    };
  }

  // 2. Planos técnicos / Stage Plot
  if (upper.includes('STAGE PLOT') || upper.includes('PLOTS') || upper.includes('PLANO')) {
    return {
      moduleType: 'tecnico',
      tag: 'Stage Plot',
      tagColor: 'bg-sky-100 text-sky-700',
      iconName: 'layers',
      subtitle: 'Planos técnicos y distribución escénica',
    };
  }

  // 3. Especificaciones técnicas explícitas (audio, iluminación, video, corriente, tarima, etc.)
  if (
    upper.includes('AUDIO') ||
    upper.includes('FOH') ||
    upper.includes('MONITOR') ||
    upper.includes('MICROFON') ||
    upper.includes('ILUMINACI') ||
    upper.includes('LIGHTING') ||
    upper.includes('LUCES') ||
    upper.includes('VIDEO') ||
    upper.includes('PANTALLA') ||
    upper.includes('CORRIENTE') ||
    upper.includes('ELECTRIC') ||
    upper.includes('ESCENARIO') ||
    upper.includes('TARIMA') ||
    upper.includes('RISER') ||
    upper.includes('STAIR') ||
    upper.includes('BACKLINE') ||
    upper.includes('PRUEBA') ||
    upper.includes('SOUNDCHECK') ||
    upper.includes('RIGGING') ||
    upper.includes('TRUSS') ||
    upper.includes('EFECTO') ||
    upper.includes('PYRO') ||
    upper.includes('FX') ||
    upper.includes('INTERCOM') ||
    upper.includes('EQUIPO') ||
    upper.includes('SISTEMA') ||
    upper.includes('SPEAKER')
  ) {
    return {
      moduleType: 'tecnico',
      tag: 'Técnico',
      tagColor: 'bg-slate-100 text-slate-700',
      iconName: 'speaker',
      subtitle: 'Especificaciones técnicas de producción',
    };
  }

  // 4. Seguridad y accesos
  if (
    upper.includes('SECURITY') ||
    upper.includes('SEGURIDAD') ||
    upper.includes('BADGES') ||
    upper.includes('ACCREDITATION') ||
    upper.includes('ACREDITACI') ||
    upper.includes('BARRICADE') ||
    upper.includes('BARRICADA')
  ) {
    return {
      moduleType: 'seguridad',
      tag: 'Seguridad',
      tagColor: 'bg-amber-100 text-amber-800',
      iconName: 'shield',
      subtitle: 'Seguridad, accesos y acreditaciones',
    };
  }

  // 5. Directorio y firmas
  if (
    upper.includes('CONTACT') ||
    upper.includes('CONTENTS') ||
    upper.includes('ACCEPTED') ||
    upper.includes('DIRECTORIO') ||
    upper.includes('INDICE')
  ) {
    return {
      moduleType: 'tecnico',
      tag: 'General',
      tagColor: 'bg-zinc-100 text-zinc-700',
      iconName: 'users',
      subtitle: 'Información general y directorio',
    };
  }

  // 6. Hospitalidad explícita
  if (
    upper.includes('HOSPITALITY') ||
    upper.includes('HOSPITALIDAD') ||
    upper.includes('CATERING') ||
    upper.includes('CAMERINO') ||
    upper.includes('DRESSING') ||
    upper.includes('LODGING') ||
    upper.includes('HOTEL') ||
    upper.includes('TRANSPORT') ||
    upper.includes('TRANSPORTE') ||
    upper.includes('VUELO') ||
    upper.includes('ADVANCE PARTY') ||
    upper.includes('PROMOTION') ||
    upper.includes('CANCELLATION') ||
    upper.includes('COMIDA') ||
    upper.includes('ALIMENTO') ||
    currentMajorRider === 'hospitality'
  ) {
    return {
      moduleType: 'hospitality',
      tag: 'Hospitality',
      tagColor: 'bg-emerald-100 text-emerald-800',
      iconName: 'coffee',
      subtitle: 'Hospitalidad, logística y camerinos',
    };
  }

  return {
    moduleType: 'tecnico',
    tag: 'Técnico',
    tagColor: 'bg-slate-100 text-slate-700',
    iconName: 'speaker',
    subtitle: 'Especificaciones técnicas de producción',
  };
}

export async function parsePdfRiderDocument(
  bytes: Uint8Array,
  fileName: string,
  importRiderId?: string
): Promise<ParsedRiderDocument> {
  const riderUuid =
    importRiderId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(importRiderId)
      ? importRiderId
      : crypto.randomUUID();

  const cleanFileTitle = cleanUploadedFileName(fileName);

  const textResult = await extractText(new Uint8Array(bytes), { mergePages: true }).catch(() => ({ text: '' }));
  const rawText = (textResult.text || '').replace(/\u0000/g, '').trim();

  // Extract TrueType head.macStyle & OS/2 weights from embedded PDF font streams
  const embeddedFontStyles = extractEmbeddedPdfFontStyles(bytes);

  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const pdfForImages = await getDocumentProxy(new Uint8Array(bytes));
  const numPages = pdf.numPages;

  const artistName = cleanFileTitle;
  const riderTitle = cleanFileTitle;
  const version = 'v1.0';
  const season = String(new Date().getFullYear());
  const coverDate = '';
  const media: RiderMediaItem[] = [];
  let stagePlotImageUrl: string | undefined;
  let stagePlotImagePath: string | undefined;
  let coverPlateUrl: string | undefined;

  const sections: SectionItem[] = [];

  interface ActiveSectionDraft {
    id: string;
    title: string;
    headingNode?: RiderContentNode;
    nodes: RiderContentNode[];
    majorRider: 'tecnico' | 'hospitality';
    pageBreakBefore: boolean;
    keepEvenIfHeadingOnly?: boolean;
  }

  let currentMajorRider: 'tecnico' | 'hospitality' = 'tecnico';

  const state: { currentSection: ActiveSectionDraft | null } = {
    currentSection: null,
  };

  const usedIds = new Set<string>();
  const makeUniqueId = (baseTitle: string, prefix: string): string => {
    const base = slugify(`${prefix}-${baseTitle}`, `sec-${sections.length + 1}`);
    let candidate = base;
    let counter = 2;
    while (usedIds.has(candidate)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }
    usedIds.add(candidate);
    return candidate;
  };

  const flushSection = () => {
    const active = state.currentSection;
    if (!active) return;
    if (active.nodes.length === 0 && !active.keepEvenIfHeadingOnly) {
      state.currentSection = null;
      return;
    }
    const bodyNodes = sanitizeNodes(active.nodes.length > 0 ? active.nodes : [{ type: 'paragraph' }]);
    const bodyDoc: RiderContentDoc = {
      type: 'doc',
      content: bodyNodes,
    };
    const fullNodes = active.headingNode ? [active.headingNode, ...bodyNodes] : bodyNodes;
    const contentDoc: RiderContentDoc = {
      type: 'doc',
      content: fullNodes,
    };
    const meta = classifySectionMeta(active.title, active.majorRider);
    sections.push({
      id: active.id,
      num: String(sections.length + 1).padStart(2, '0'),
      title: active.title,
      subtitle: meta.subtitle,
      tag: meta.tag,
      tagColor: meta.tagColor,
      iconName: meta.iconName,
      content: docToPlainText(bodyDoc) || active.title,
      contentDoc,
      pageBreakBefore: active.pageBreakBefore,
    });
    state.currentSection = null;
  };

  const startSection = (
    title: string,
    pageBreakBefore = true,
    headingOptions?: {
      isCentered?: boolean;
      inlineNodes?: RiderContentNode[];
      keepEvenIfHeadingOnly?: boolean;
    }
  ): ActiveSectionDraft => {
    flushSection();
    const prefix = currentMajorRider === 'hospitality' ? 'hosp' : 'tech';
    const displayTitle = title;
    const secId = makeUniqueId(title, prefix);
    const headingNode: RiderContentNode = {
      type: 'heading',
      attrs: {
        level: 2,
        id: secId,
        pageBreakBefore,
        ...(headingOptions?.isCentered ? { textAlign: 'center' } : {}),
      },
      content:
        headingOptions?.inlineNodes && headingOptions.inlineNodes.length > 0
          ? headingOptions.inlineNodes
          : [{ type: 'text', text: displayTitle }],
    };
    const next: ActiveSectionDraft = {
      id: secId,
      title: displayTitle,
      headingNode,
      nodes: [],
      majorRider: currentMajorRider,
      pageBreakBefore,
      keepEvenIfHeadingOnly: headingOptions?.keepEvenIfHeadingOnly ?? false,
    };
    state.currentSection = next;
    watchSection?.(next);
    return next;
  };

  let watchSection: ((sec: ActiveSectionDraft) => void) | null = null;

  const ensureSection = (defaultTitle: string, pageBreakBefore = false): ActiveSectionDraft => {
    return state.currentSection ?? startSection(defaultTitle, pageBreakBefore);
  };

  // Pre-check if document has a multi-page running header bar (like the 42-page tour rider where pages 2+ repeat artist/tour at y > pageHeight - 68)
  let hasRunningHeaderPattern = false;
  if (numPages >= 4) {
    try {
      const p2 = await pdf.getPage(2);
      const vp2 = p2.getViewport({ scale: 1 });
      const tc2 = await p2.getTextContent();
      const top2 = (tc2.items as any[])
        .filter((i) => i.str?.trim() && Number(i.transform?.[5] || 0) > vp2.height - 68)
        .map((i) => String(i.str).trim())
        .join(' ');
      const p3 = await pdf.getPage(3);
      const vp3 = p3.getViewport({ scale: 1 });
      const tc3 = await p3.getTextContent();
      const top3 = (tc3.items as any[])
        .filter((i) => i.str?.trim() && Number(i.transform?.[5] || 0) > vp3.height - 68)
        .map((i) => String(i.str).trim())
        .join(' ');
      if (top2.length > 0 && top2 === top3) {
        hasRunningHeaderPattern = true;
      }
    } catch {
      hasRunningHeaderPattern = false;
    }
  }

  const allInputRows: string[][] = [];
  let inputListSectionNodesRef: RiderContentNode[] | null = null;

  const allMixRows: string[][] = [];
  let mixListSectionNodesRef: RiderContentNode[] | null = null;

  // Process ALL pages starting from Page 1 (never skip Page 1 or invent a cover)
  for (let p = 1; p <= numPages; p++) {
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const opList = await page.getOperatorList();
    const tc = await page.getTextContent();

    // 1. Font bold/italic map (combining commonObjs name + embedded TrueType head.macStyle/OS2)
    const fontMeta: Record<string, { bold: boolean; italic: boolean }> = {};
    for (const fn of Object.keys(tc.styles || {})) {
      let fontDesc = '';
      try {
        const obj = (page as any).commonObjs?.get?.(fn);
        fontDesc = String(obj?.name || '');
      } catch {
        fontDesc = '';
      }
      const stripped = fontDesc.replace(/^[A-Z]{6}\+/, '');
      const embedded = embeddedFontStyles.get(fontDesc) || embeddedFontStyles.get(stripped);
      fontMeta[fn] = {
        bold: Boolean(embedded?.bold) || /(bold|heavy|black|demi|semibold|extrabold|ultrabold)/i.test(fontDesc),
        italic: Boolean(embedded?.italic) || /(italic|oblique|slanted)/i.test(fontDesc),
      };
    }

    const graphics = collectPageGraphics(opList, vp.width, vp.height);
    const showTextEntries = graphics.showTextEntries;
    const calloutBoxes: CalloutBox[] = graphics.callouts.map((box: PdfCallout) => ({
      xMin: box.xMin,
      yMin: box.yMin,
      xMax: box.xMax,
      yMax: box.yMax,
      color: box.color,
    }));
    const diagrams: PdfRect[] = graphics.diagrams;

    const framed = new Map<ActiveSectionDraft, number>();
    const watch = (sec: ActiveSectionDraft | null | undefined) => {
      if (!sec || framed.has(sec)) return;
      framed.set(sec, sec.nodes.length);
    };
    watchSection = watch;
    watch(state.currentSection);

    const pageImages: PageImageItem[] = [];
    const rawImgs = graphics.imagePaints.length > 0 ? await extractImages(pdfForImages, p).catch(() => []) : [];
    const paired = Math.min(graphics.imagePaints.length, rawImgs.length);
    for (let idx = 0; idx < paired; idx++) {
      const rawImg = rawImgs[idx];
      const paint = graphics.imagePaints[idx];
      if (!rawImg || !paint || rawImg.width < 12 || rawImg.height < 12) continue;
      const channels = rawImg.channels === 1 || rawImg.channels === 3 || rawImg.channels === 4 ? rawImg.channels : 0;
      if (!channels) continue;
      const png = encodePngBuffer(rawImg.width, rawImg.height, channels, rawImg.data);
      const role = coversPage(paint, vp.width, vp.height)
        ? 'background'
        : paint.width < 78 && paint.height < 78
          ? 'logo'
          : 'figure';
      const saved = await saveImportedImageBuffer(
        png,
        'image/png',
        `page-${p}-${role}-${idx + 1}.png`,
        role === 'background' || p === 1 ? 'gallery' : 'plot',
        riderUuid
      );
      pageImages.push({
        url: saved.url,
        pathname: saved.pathname,
        x: paint.x,
        y: paint.y,
        width: paint.width,
        height: paint.height,
        yCenter: paint.yCenter,
        page: p,
        role,
      });
      if (saved.pathname && media.length === 0 && role !== 'logo') {
        media.push({
          id: crypto.randomUUID(),
          url: saved.url,
          pathname: saved.pathname,
          cover: true,
        });
      }
    }

    for (let idx = 0; idx < diagrams.length; idx += 1) {
      const diagram = diagrams[idx];
      if (!diagram) continue;
      try {
        const png = await renderPageRegion(pdf, p, diagram, vp.height);
        const saved = await saveImportedImageBuffer(
          png,
          'image/png',
          `page-${p}-diagram-${idx + 1}.png`,
          'plot',
          riderUuid
        );
        pageImages.push({
          url: saved.url,
          pathname: saved.pathname,
          x: diagram.x,
          y: diagram.y,
          width: diagram.width,
          height: diagram.height,
          yCenter: diagram.y + diagram.height / 2,
          page: p,
          role: 'diagram',
        });
      } catch (err) {
        console.warn(`[import] No se pudo rasterizar el diagrama de la página ${p}:`, err);
      }
    }

    const backdrop = pageImages.find((item) => item.role === 'background') ?? null;
    const sealBackdrop = () => {
      const backgroundSrc = backdrop?.url || '';
      const backgroundColor = graphics.pageFill || '';
      if (!backgroundSrc && !backgroundColor) return;
      for (const [sec, index] of framed) {
        const chunk = sec.nodes.slice(index);
        if (chunk.length === 0) continue;
        sec.nodes.splice(index, chunk.length, {
          type: 'pageFrame',
          attrs: { backgroundSrc, backgroundColor },
          content: chunk,
        });
      }
    };

    // 4. Filter text spans (removing running header & footer and attaching color + synthetic italic)
    const spans: PdfTextSpan[] = [];
    let entryCursor = 0;
    let entryRemaining = showTextEntries[0]?.str || '';
    for (const raw of tc.items as any[]) {
      if (!raw.str || !String(raw.str).trim()) continue;
      const itemCompact = String(raw.str).replace(/\s+/g, '');
      const color =
        showTextEntries[entryCursor]?.color ??
        showTextEntries[showTextEntries.length - 1]?.color;

      if (entryRemaining.length > itemCompact.length) {
        entryRemaining = entryRemaining.slice(itemCompact.length);
      } else {
        entryCursor += 1;
        entryRemaining = showTextEntries[entryCursor]?.str || '';
      }

      const fm = fontMeta[raw.fontName] || { bold: false, italic: false };
      const skewX = Math.abs(Number(raw.transform?.[2] || 0));
      const skewY = Math.abs(Number(raw.transform?.[1] || 0));
      const syntheticItalic = skewX > 0.05 || skewY > 0.05;

      const span: PdfTextSpan = {
        str: String(raw.str),
        x: Number(raw.transform?.[4] || 0),
        y: Number(raw.transform?.[5] || 0),
        width: Number(raw.width || 0),
        height: Number(raw.height || Math.abs(raw.transform?.[3] || 12)),
        fontName: String(raw.fontName || ''),
        bold: fm.bold,
        italic: fm.italic || syntheticItalic,
        color,
      };
      if (isRunningHeaderOrFooter(span, p, numPages, vp.height, hasRunningHeaderPattern)) continue;
      spans.push(span);
    }

    // Sort spans top-to-bottom
    spans.sort((a, b) => {
      const dy = b.y - a.y;
      if (Math.abs(dy) > 3.5) return dy;
      return a.x - b.x;
    });

    // Check if this page is a Table of Contents page first
    const isTocPage =
      spans.some((s) => s.str.trim().toUpperCase() === 'TABLE OF CONTENTS' && s.height >= 15) ||
      (state.currentSection?.title.toUpperCase() === 'TABLE OF CONTENTS' &&
        spans.filter((s) => s.x > 495 && /^\d{1,3}$/.test(s.str.trim())).length >= 4);

    // Special Case A: Check if page has Input List or Mix List table regions
    const hasInputHeader =
      !isTocPage && spans.some((s) => s.str.trim() === 'INSTRUMENT') && spans.some((s) => s.str.trim() === 'RACK');
    const isInputContinuation =
      !isTocPage &&
      state.currentSection?.title.toUpperCase().includes('INPUT LIST') &&
      spans.filter((s) => s.x < 48 && /^\d{1,3}$/.test(s.str.trim())).length >= 3;

    const mixHeadingSpan = !isTocPage
      ? spans.find((s) => s.str.toUpperCase().includes('MONITORS MIX ASSIGNMENT'))
      : undefined;
    const hasMixHeader =
      !isTocPage && spans.some((s) => s.str.trim() === 'MIXES') && spans.some((s) => s.str.trim() === 'IEM/WIRED');
    const isMixContinuation =
      !isTocPage &&
      state.currentSection?.title.toUpperCase().includes('MONITORS MIX ASSIGNMENT') &&
      spans.filter((s) => s.x < 70 && /^(MIX|MATRIX|CUE|QUE|DIRECT)/i.test(s.str.trim())).length >= 3;

    if (hasInputHeader || isInputContinuation || mixHeadingSpan || hasMixHeader || isMixContinuation) {
      const inputTitleSpan = spans.find((s) => s.str.toUpperCase().includes('INPUT LIST') && s.height >= 14);
      if (inputTitleSpan && (!state.currentSection || !state.currentSection.title.toUpperCase().includes('INPUT LIST'))) {
        const inputSec = startSection('4. INPUT LIST', p > 1);
        inputListSectionNodesRef = inputSec.nodes;
        const subTitle = spans.find((s) => s.str.toUpperCase().includes('INPUT LIST ('));
        if (subTitle) {
          inputSec.nodes.push({
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: subTitle.str.trim() }],
          });
        }
      }

      const inputYMin = mixHeadingSpan ? mixHeadingSpan.y + 10 : 0;
      const inputYMax = hasInputHeader
        ? (spans.find((s) => s.str.trim() === 'INSTRUMENT')?.y ?? 670) - 6
        : 720;
      const inputRegionSpans = spans.filter((s) => s.y <= inputYMax && s.y >= inputYMin);
      if ((hasInputHeader || isInputContinuation) && inputRegionSpans.length > 0) {
        const rows = extractRowsByColumnBounds(inputRegionSpans, INPUT_LIST_BOUNDS, INPUT_LIST_HEADERS.length, false);
        const validRows = rows.filter((r) => /^\d+$/.test(r[0]));
        allInputRows.push(...validRows);
        if (inputListSectionNodesRef && validRows.length > 0) {
          inputListSectionNodesRef.push(...buildTipTapTable(INPUT_LIST_HEADERS, validRows, 16));
        }
      }

      if (mixHeadingSpan) {
        const mixSec = startSection('5. MONITORS MIX ASSIGNMENT', false);
        mixListSectionNodesRef = mixSec.nodes;
        const mixSubTitle = spans.find((s) => s.str.toUpperCase().includes('MIX LIST'));
        if (mixSubTitle) {
          mixSec.nodes.push({
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: mixSubTitle.str.trim() }],
          });
        }
      }

      if (hasMixHeader || isMixContinuation) {
        const mixYMax = hasMixHeader
          ? (spans.find((s) => s.str.trim() === 'MIXES')?.y ?? 510) - 6
          : 720;
        const mixRegionSpans = spans.filter((s) => s.y <= mixYMax);
        const mixRows = extractRowsByColumnBounds(mixRegionSpans, MIX_LIST_BOUNDS, MIX_LIST_HEADERS.length, true);
        const validMixRows = mixRows.filter((r) => r[0].length > 0);
        allMixRows.push(...validMixRows);
        if (mixListSectionNodesRef && validMixRows.length > 0) {
          mixListSectionNodesRef.push(...buildTipTapTable(MIX_LIST_HEADERS, validMixRows, 16));
        }
      }
      sealBackdrop();
      continue;
    }

    // Special Case B: 2-Column Contacts page (e.g. Page 2 "CONTACTS:")
    const hasContactsHeader = spans.some((s) => /^CONTACTS:?$/i.test(s.str.trim()));
    if (hasContactsHeader) {
      const contactsSec = startSection('CONTACTS', p > 1);
      const bodySpans = spans.filter((s) => !/^CONTACTS:?$/i.test(s.str.trim()));
      const leftSpans = bodySpans.filter((s) => s.x < 285);
      const rightSpans = bodySpans.filter((s) => s.x >= 285);

      const groupLines = (colSpans: PdfTextSpan[]) => {
        const colLines: PdfLine[] = [];
        for (const sp of colSpans.sort((a, b) => b.y - a.y || a.x - b.x)) {
          const last = colLines[colLines.length - 1];
          if (last && Math.abs(last.y - sp.y) <= 3.5) {
            last.spans.push(sp);
          } else {
            colLines.push({
              y: sp.y,
              xMin: sp.x,
              xMax: sp.x + sp.width,
              height: sp.height,
              spans: [sp],
              text: '',
              allBold: false,
              allItalic: false,
              isCentered: false,
              inCalloutBox: -1,
            });
          }
        }
        for (const l of colLines) {
          l.text = joinSpansPlainText(l.spans);
        }
        const cards: PdfLine[][] = [];
        for (const l of colLines) {
          if (/^[●•▪◦·○]/.test(l.text) || cards.length === 0) {
            cards.push([l]);
          } else {
            cards[cards.length - 1].push(l);
          }
        }
        return cards;
      };

      const leftCards = groupLines(leftSpans);
      const rightCards = groupLines(rightSpans);
      const maxPairs = Math.max(leftCards.length, rightCards.length);

      const renderCardParagraphs = (card: PdfLine[] | undefined): RiderContentNode[] => {
        if (!card || card.length === 0) return [{ type: 'paragraph' }];
        return card.map((line) => ({
          type: 'paragraph',
          content: spansToInlineNodes(line.spans, false),
        }));
      };

      if (maxPairs > 0) {
        const tableRows: RiderContentNode[] = [];
        for (let r = 0; r < maxPairs; r++) {
          tableRows.push({
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: renderCardParagraphs(leftCards[r]) },
              { type: 'tableCell', content: renderCardParagraphs(rightCards[r]) },
            ],
          });
        }
        contactsSec.nodes.push({
          type: 'table',
          content: tableRows,
        });
      }
      sealBackdrop();
      continue;
    }

    // Group spans into horizontal lines
    const lines: PdfLine[] = [];
    for (const sp of spans) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - sp.y) <= 3.5) {
        last.spans.push(sp);
        last.xMin = Math.min(last.xMin, sp.x);
        last.xMax = Math.max(last.xMax, sp.x + sp.width);
        last.height = Math.max(last.height, sp.height);
      } else {
        lines.push({
          y: sp.y,
          xMin: sp.x,
          xMax: sp.x + sp.width,
          height: sp.height,
          spans: [sp],
          text: '',
          allBold: false,
          allItalic: false,
          isCentered: false,
          inCalloutBox: -1,
        });
      }
    }

    for (const l of lines) {
      l.spans.sort((a, b) => a.x - b.x);
      l.text = joinSpansPlainText(l.spans);
      l.allBold = l.spans.every((s) => s.bold || /^[●•▪◦·○→:\d.\s-]+$/.test(s.str));
      l.allItalic = l.spans.every((s) => s.italic);
      const midX = (l.xMin + l.xMax) / 2;
      l.isCentered = l.xMin >= 125 && Math.abs(midX - vp.width / 2) <= 10;
      l.inCalloutBox = calloutBoxes.findIndex((b) => l.y >= b.yMin && l.y <= b.yMax);
    }

    const rasterizedDiagrams = pageImages.filter((image) => image.role === 'diagram');
    const lineOnDiagram = (line: PdfLine) => rasterizedDiagrams.some((diagram) => {
      const midX = (line.xMin + line.xMax) / 2;
      return containsPoint(diagram, midX, line.y + line.height / 2);
    });
    const imageOnDiagram = (image: PageImageItem) => image.role !== 'diagram'
      && rasterizedDiagrams.some((diagram) => containsPoint(diagram, image.x + image.width / 2, image.yCenter));

    if (p === 1 && backdrop && lines.length <= 12 && !(lines[0] && lineOnDiagram(lines[0]))) {
      const busy = lines.some((line) => line.height >= 13 && /^\d{1,2}\.\s+/.test(line.text.trim()));
      if (!busy) {
        coverPlateUrl = backdrop.url;
        watchSection = null;
        continue;
      }
    }

    // Special Case C: Table of Contents pages
    const hasTocHeader = lines.some((l) => l.text.toUpperCase() === 'TABLE OF CONTENTS' && l.height >= 15);
    const isTocContinuation =
      state.currentSection?.title.toUpperCase() === 'TABLE OF CONTENTS' &&
      lines.length > 0 &&
      lines.every((l) => l.spans.some((s) => s.x > 500 && /^\d+$/.test(s.str.trim())));

    if (hasTocHeader || isTocContinuation) {
      if (hasTocHeader) {
        startSection('TABLE OF CONTENTS', p > 1);
      }
      const tocRows: string[][] = [];
      for (const l of lines) {
        if (l.text.toUpperCase() === 'TABLE OF CONTENTS') continue;
        const rightSpan = l.spans.find((s) => s.x > 490 && /^\d+$/.test(s.str.trim()));
        const leftSpans = l.spans.filter((s) => s !== rightSpan);
        const titlePart = joinSpansPlainText(leftSpans);
        const pagePart = rightSpan ? rightSpan.str.trim() : '';
        if (titlePart) {
          tocRows.push([titlePart, pagePart ? `Pág. ${pagePart}` : '']);
        }
      }
      if (tocRows.length > 0 && state.currentSection) {
        state.currentSection.nodes.push(...buildTipTapTable(['SECCIÓN', 'PÁGINA'], tocRows, 40));
      }
      sealBackdrop();
      continue;
    }

    // Special Case D: Signature page ("READ & ACCEPTED:")
    const hasReadAccepted = lines.some((l) => l.text.toUpperCase().includes('READ & ACCEPTED'));
    if (hasReadAccepted) {
      const signSec = startSection('READ & ACCEPTED', p > 1);
      const boxLines = lines.filter((l) => l.inCalloutBox >= 0);
      if (boxLines.length > 0) {
        signSec.nodes.push({
          type: 'notice',
          attrs: { tone: 'required' },
          content: [
            {
              type: 'paragraph',
              content: boxLines.reduce<RiderContentNode[]>(
                (acc, bl) => mergeInlineNodes(acc, spansToInlineNodes(bl.spans)),
                []
              ),
            },
          ],
        });
      }
      signSec.nodes.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'READ & ACCEPTED:' }],
      });
      signSec.nodes.push(
        ...buildTipTapTable(
          ['PROMOTER REPRESENTATIVE', 'ARTIST MANAGEMENT'],
          [
            ['PRINT NAME: ___________________________', 'PRINT NAME: ___________________________'],
            ['SIGNATURE: ____________________________', 'SIGNATURE: ____________________________'],
            ['DATE: _________________________________', 'DATE: _________________________________'],
          ]
        )
      );
      sealBackdrop();
      continue;
    }

    // Normal Rich Page Processing: Interleave text lines and images sorted by vertical coordinate (top-to-bottom)
    type PageElement =
      | { kind: 'line'; y: number; line: PdfLine }
      | { kind: 'image'; y: number; image: PageImageItem };

    const elements: PageElement[] = [
      ...lines
        .filter((line) => !lineOnDiagram(line))
        .map((line) => ({ kind: 'line' as const, y: line.y, line })),
      ...pageImages
        .filter((image) => image.role !== 'background' && !imageOnDiagram(image))
        .map((image) => ({ kind: 'image' as const, y: image.yCenter, image })),
    ].sort((a, b) => b.y - a.y);

    let activeBulletItems: RiderContentNode[] | null = null;
    let activeCalloutIdx = -1;
    let activeCalloutParagraphs: RiderContentNode[] = [];
    let prevLine: PdfLine | null = null;
    let prevLineWasSubBullet = false;
    let hasAddedContentOnPage = false;

    const flushBullets = () => {
      if (activeBulletItems && activeBulletItems.length > 0) {
        const sec = ensureSection(cleanFileTitle, p > 1 && !hasAddedContentOnPage);
        sec.nodes.push({
          type: 'bulletList',
          content: activeBulletItems,
        });
        hasAddedContentOnPage = true;
      }
      activeBulletItems = null;
      prevLineWasSubBullet = false;
    };

    const flushCallout = () => {
      if (activeCalloutIdx >= 0 && activeCalloutParagraphs.length > 0) {
        const sec = ensureSection(cleanFileTitle, p > 1 && !hasAddedContentOnPage);
        const boxText = activeCalloutParagraphs.map((pNode) => docToPlainText({ type: 'doc', content: [pNode] })).join(' ');
        const tone = /IMPORTANT|MANDATORY|NO EXCEPTION|NO SUBSTITUTION/i.test(boxText) ? 'required' : 'note';
        const box = calloutBoxes[activeCalloutIdx];
        sec.nodes.push({
          type: 'notice',
          attrs: {
            tone,
            ...(box?.color ? { backgroundColor: box.color } : {}),
          },
          content: activeCalloutParagraphs,
        });
        hasAddedContentOnPage = true;
      }
      activeCalloutIdx = -1;
      activeCalloutParagraphs = [];
    };

    for (const el of elements) {
      if (el.kind === 'image') {
        flushBullets();
        flushCallout();
        const sec = ensureSection(cleanFileTitle, p > 1 && !hasAddedContentOnPage);
        const isStagePlotSection = sec.title.toUpperCase().includes('STAGE PLOT');
        if (isStagePlotSection && !stagePlotImageUrl) {
          stagePlotImageUrl = el.image.url;
          stagePlotImagePath = el.image.pathname;
        }
        sec.nodes.push({
          type: 'image',
          attrs: {
            src: el.image.url,
            alt: `${sec.title} (Pág. ${el.image.page})`,
            title: `${sec.title} (Pág. ${el.image.page})`,
            width: editorPx(el.image.width, vp.width),
          },
        });
        hasAddedContentOnPage = true;
        prevLine = null;
        continue;
      }

      const line = el.line;
      const text = line.text.trim();
      if (!text) continue;

      // Check if we entered or exited a shaded callout box
      if (line.inCalloutBox !== activeCalloutIdx) {
        flushBullets();
        flushCallout();
        activeCalloutIdx = line.inCalloutBox;
      }

      // Inside a shaded callout box -> accumulate paragraphs into a `notice` block
      if (activeCalloutIdx >= 0) {
        const inline = spansToInlineNodes(line.spans, false);
        const startsNewNote = /^(NOTE\s*\d*:?|IMPORTANT\s+NOTES?:?|FOR FURTHER INFORMATION|[●•▪◦·○])/i.test(text);
        const dy = prevLine ? prevLine.y - line.y : 999;
        if (
          activeCalloutParagraphs.length > 0 &&
          !startsNewNote &&
          dy <= 21 &&
          prevLine &&
          prevLine.inCalloutBox === activeCalloutIdx
        ) {
          const lastP = activeCalloutParagraphs[activeCalloutParagraphs.length - 1];
          lastP.content = mergeInlineNodes(lastP.content || [], inline);
        } else {
          activeCalloutParagraphs.push({
            type: 'paragraph',
            content: inline,
          });
        }
        prevLine = line;
        continue;
      }

      // Major Part Heading ("TECHNICAL RIDER" or "HOSPITALITY RIDER" at h >= 22 when followed by numbered sections on same page)
      const hasNumberedSectionOnPage = lines.some(
        (l) => l !== line && l.height >= 14.5 && l.allBold && /^\d{1,2}\.\s+[A-Z]/.test(l.text.trim())
      );
      if (line.height >= 22 && /(TECHNICAL RIDER|HOSPITALITY RIDER)/i.test(text) && hasNumberedSectionOnPage) {
        flushBullets();
        flushCallout();
        if (text.toUpperCase().includes('HOSPITALITY')) {
          currentMajorRider = 'hospitality';
        } else {
          currentMajorRider = 'tecnico';
        }
        prevLine = line;
        continue;
      }

      // Section Heading Detection:
      // 1) Numbered Section Heading (e.g. "1. AUDIO REQUIREMENTS", "12. RISERS, STAIRS...", "17. LIGHTING / VIDEO PLOTS")
      const isNumberedSectionHeading =
        line.height >= 13.5 &&
        line.allBold &&
        /^\d{1,2}\.\s+[A-ZÁÉÍÓÚÑ]/.test(text) &&
        !line.spans.some((s) => s.x > 500 && /^\d+$/.test(s.str.trim()));

      // 2) Major Unnumbered Section Heading (e.g. "RIDER HOSPITALITY", "HOSPITALITY", "TRANSPORTE TERRESTRE", "TRANSPORTE AÉREO")
      const isMajorUnnumberedHeading =
        line.height >= 15.5 &&
        (line.allBold || line.isCentered) &&
        !line.allItalic &&
        !text.startsWith('(') &&
        !/^(NOTE\s*\d*:|IMPORTANT|PARA\s+SHOW)/i.test(text) &&
        text.length >= 3 &&
        text.length <= 75 &&
        /^[A-ZÁÉÍÓÚÑÜ0-9\s/&():.,'_-]+$/.test(text);

      if (isNumberedSectionHeading || isMajorUnnumberedHeading) {
        flushBullets();
        flushCallout();
        if (text.toUpperCase().includes('HOSPITALITY') || text.toUpperCase().includes('HOSPITALIDAD')) {
          currentMajorRider = 'hospitality';
        }
        const shouldBreakPage = p > 1 && !hasAddedContentOnPage;
        const isOnlyLineOnPage = lines.length === 1 && pageImages.length === 0;
        startSection(text, shouldBreakPage, {
          isCentered: line.isCentered,
          inlineNodes: spansToInlineNodes(line.spans, false, true),
          keepEvenIfHeadingOnly: isOnlyLineOnPage,
        });
        hasAddedContentOnPage = true;
        prevLine = line;
        continue;
      }

      const activeSec = ensureSection(cleanFileTitle, p > 1 && !hasAddedContentOnPage);
      hasAddedContentOnPage = true;

      // Sub-bullet item (level 2: starts with ○ or ◦, or bullet at xMin >= 112)
      const isSubBulletLine =
        /^[○◦]\s*/.test(text) || (/^[●•▪■▸·]\s*/.test(text) && line.xMin >= 112);

      if (isSubBulletLine) {
        const inline = spansToInlineNodes(line.spans, true);
        if (!activeBulletItems || activeBulletItems.length === 0) {
          activeBulletItems = [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: inline }],
            },
          ];
        } else {
          const parentItem = activeBulletItems[activeBulletItems.length - 1];
          if (!parentItem.content) parentItem.content = [];
          let nestedList = parentItem.content.find((c) => c.type === 'bulletList');
          if (!nestedList) {
            nestedList = { type: 'bulletList', content: [] };
            parentItem.content.push(nestedList);
          }
          if (!nestedList.content) nestedList.content = [];
          nestedList.content.push({
            type: 'listItem',
            content: [{ type: 'paragraph', content: inline }],
          });
        }
        prevLine = line;
        prevLineWasSubBullet = true;
        continue;
      }

      // Level-1 bullet, including the hyphen lists used by hospitality riders.
      const isDashItem = /^[-–—]\s+\S/.test(text);
      const isBulletLine = /^[●•▪■▸·]\s*/.test(text) || isDashItem;
      if (isBulletLine) {
        const inline = spansToInlineNodes(line.spans, true);
        if (!activeBulletItems) activeBulletItems = [];
        activeBulletItems.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: inline }],
        });
        prevLine = line;
        prevLineWasSubBullet = false;
        continue;
      }

      // Continuation of previous bullet or sub-bullet item (indented xMin >= 82 and close vertically dy <= 22)
      const dy = prevLine ? prevLine.y - line.y : 999;
      if (
        activeBulletItems &&
        activeBulletItems.length > 0 &&
        !isDashItem &&
        !line.isCentered &&
        dy <= 22 &&
        line.xMin >= 82 &&
        !(line.allBold && /^[A-ZÁÉÍÓÚÑ0-9\s/&():.,'-]{3,}$/.test(text))
      ) {
        const inline = spansToInlineNodes(line.spans, false);
        const lastTopItem = activeBulletItems[activeBulletItems.length - 1];

        if (prevLineWasSubBullet) {
          const nestedList = lastTopItem.content?.find((c) => c.type === 'bulletList');
          const lastSubItem = nestedList?.content?.[nestedList.content.length - 1];
          const subParas = lastSubItem?.content;
          if (subParas && subParas.length > 0) {
            const lastPara = subParas[subParas.length - 1];
            if (prevLine && prevLine.xMax >= 380) {
              lastPara.content = mergeInlineNodes(lastPara.content || [], inline);
            } else {
              subParas.push({ type: 'paragraph', content: inline });
            }
            prevLine = line;
            continue;
          }
        } else {
          const topParas = lastTopItem.content;
          if (topParas && topParas.length > 0) {
            const lastPara = topParas[topParas.length - 1];
            if (lastPara.type === 'paragraph') {
              if (prevLine && prevLine.xMax >= 380) {
                lastPara.content = mergeInlineNodes(lastPara.content || [], inline);
              } else {
                topParas.push({ type: 'paragraph', content: inline });
              }
              prevLine = line;
              continue;
            }
          }
        }
      }

      flushBullets();

      // Subheading detection (all-bold short uppercase heading like "SPEAKER SYSTEM", "FOH HARDWARE:", "TRANSPORTE TERRESTRE" at h=12)
      const isSubheading =
        line.allBold &&
        !line.allItalic &&
        !isDashItem &&
        text.length >= 3 &&
        text.length <= 75 &&
        /^[A-ZÁÉÍÓÚÑÜ0-9\s/&():.,'-]+$/.test(text) &&
        !/^NOTE\s*\d*:/i.test(text);

      if (isSubheading) {
        activeSec.nodes.push({
          type: 'heading',
          attrs: {
            level: 3,
            ...(line.isCentered ? { textAlign: 'center' } : {}),
          },
          content: spansToInlineNodes(line.spans, false, true),
        });
        prevLine = line;
        continue;
      }

      // Standalone NOTE line outside a shaded rectangle
      if (/^(NOTE\s*\d*:|IMPORTANT\s+NOTES?:)/i.test(text)) {
        activeSec.nodes.push({
          type: 'notice',
          attrs: { tone: 'note' },
          content: [{ type: 'paragraph', content: spansToInlineNodes(line.spans, false) }],
        });
        prevLine = line;
        continue;
      }

      // Regular paragraph (merge with previous paragraph ONLY if wrapped prose line, never merge separate dash items or centered lines)
      const inline = spansToInlineNodes(line.spans, false, line.height >= 13.5);
      const lastNode = activeSec.nodes[activeSec.nodes.length - 1];
      const prevWasDashItem = prevLine ? /^-\s+\S/.test(prevLine.text.trim()) : false;
      const canMergeWithPrevParagraph =
        lastNode &&
        lastNode.type === 'paragraph' &&
        prevLine &&
        prevLine.inCalloutBox === -1 &&
        !line.isCentered &&
        !prevLine.isCentered &&
        !isDashItem &&
        !(prevWasDashItem && line.xMin <= prevLine.xMin + 4) &&
        dy <= 20 &&
        prevLine.xMax >= 410 &&
        !prevLine.text.trim().endsWith(':');

      if (canMergeWithPrevParagraph) {
        lastNode.content = mergeInlineNodes(lastNode.content || [], inline);
      } else {
        activeSec.nodes.push({
          type: 'paragraph',
          ...(line.isCentered ? { attrs: { textAlign: 'center' } } : {}),
          content: inline,
        });
      }
      prevLine = line;
    }

    flushBullets();
    flushCallout();
    sealBackdrop();
    watchSection = null;
  }

  flushSection();

  if (coverPlateUrl) {
    const coverType: RiderType = /HOSPITALI/i.test(cleanFileTitle) && !/T[EÉ]CNIC/i.test(cleanFileTitle)
      ? 'hospitality'
      : 'tecnico';
    sections.unshift({
      id: DOCUMENT_COVER_ID,
      num: '',
      title: 'Portada',
      subtitle: 'Página importada',
      tag: 'Portada',
      tagColor: 'bg-slate-100 text-slate-700',
      iconName: 'fileText',
      content: riderTitle,
      contentDoc: buildCoverContentDoc(coverType, artistName, riderTitle, version, coverPlateUrl),
      pageBreakBefore: false,
    });
    let count = 0;
    for (const section of sections) {
      if (section.id === DOCUMENT_COVER_ID) continue;
      count += 1;
      section.num = String(count).padStart(2, '0');
    }
  }

  // Build ChannelInput[] from allInputRows
  const channels: ChannelInput[] = allInputRows.map((row, idx) => {
    const chNum = row[0] || String(idx + 1);
    const rack = row[1] || '';
    const instrument = row[2] || `Canal ${chNum}`;
    const mic = row[3] || '';
    const stand = row[4] || '';
    const wireless = row[5] || '';
    const wType = row[6] || '';
    const wlNum = row[7] || '';
    const notes = [rack ? `Rack: ${rack}` : '', wireless === 'YES' ? `WL: ${wType} ${wlNum}`.trim() : '', row[8] || '']
      .filter(Boolean)
      .join(' · ');
    const phantom = /\b(DI|B\s*91|B\s*98|KSM|48V|COND)\b/i.test(mic);
    return ChannelInput.create(chNum.padStart(2, '0'), instrument, mic, stand, undefined, phantom, notes);
  });

  // Partition sections by module while keeping all sections in the master document
  const tecnicoSections = sections.filter(
    (s) => classifySectionMeta(s.title, 'tecnico').moduleType === 'tecnico'
  );
  const hospitalitySections = sections.filter(
    (s) =>
      classifySectionMeta(
        s.title,
        s.title.startsWith('HOSPITALITY') || currentMajorRider === 'hospitality' ? 'hospitality' : 'tecnico'
      ).moduleType === 'hospitality'
  );
  const seguridadSections = sections.filter(
    (s) => classifySectionMeta(s.title, 'tecnico').moduleType === 'seguridad'
  );

  return {
    artistName,
    riderTitle,
    riderType: 'tecnico',
    season,
    version,
    date: coverDate,
    rawText,
    sections,
    modules: {
      tecnico: tecnicoSections.length > 0 ? tecnicoSections : sections,
      hospitality: hospitalitySections,
      seguridad: seguridadSections,
    },
    channels,
    media,
    stagePlotImageUrl,
    stagePlotImagePath,
  };
}

export async function parseDocxRiderDocument(
  bytes: Uint8Array,
  fileName: string,
  importRiderId?: string
): Promise<ParsedRiderDocument> {
  const riderUuid =
    importRiderId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(importRiderId)
      ? importRiderId
      : crypto.randomUUID();

  const cleanFileTitle = cleanUploadedFileName(fileName);

  const buffer = Buffer.from(bytes);
  const docxExtras = readDocxPackage(bytes);
  const [rawResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({
      buffer,
      styleMap: [
        'u => u',
        'highlight => mark',
      ],
    } as unknown as Parameters<typeof mammoth.convertToHtml>[0]),
  ]);

  const rawText = (rawResult.value || '').replace(/\u0000/g, '').trim();
  const html = htmlResult.value || '';

  const artistName = cleanFileTitle;
  const riderTitle = cleanFileTitle;
  const season = String(new Date().getFullYear());
  const version = 'v1.0';

  const sections: SectionItem[] = [];

  // Parse blocks from mammoth HTML
  const blockRegex = /<(h1|h2|h3|p|ul|ol|table)[^>]*>([\s\S]*?)<\/\1>/gi;
  let currentTitle = cleanFileTitle;
  let currentNodes: RiderContentNode[] = [];
  let secIdx = 1;
  let imgCounter = 1;
  let imageWidthCursor = 0;
  let backgroundUrl = '';

  if (docxExtras.background) {
    const saved = await saveImportedImageBuffer(
      docxExtras.background.bytes,
      docxExtras.background.contentType,
      'docx-background.png',
      'gallery',
      riderUuid
    );
    backgroundUrl = saved.url;
  }

  const styled = (html: string) => htmlToInline(html, docxExtras.runs);

  const flushDocxSection = () => {
    if (currentNodes.length === 0) return;
    if (backgroundUrl) {
      currentNodes = [{
        type: 'pageFrame',
        attrs: { backgroundSrc: backgroundUrl, backgroundColor: '' },
        content: currentNodes,
      }];
    }
    const secId = `docx-sec-${secIdx}-${slugify(currentTitle, 'sec')}`;
    const headingNode: RiderContentNode = {
      type: 'heading',
      attrs: {
        level: 2,
        id: secId,
        pageBreakBefore: secIdx > 1,
      },
      content: [{ type: 'text', text: currentTitle }],
    };
    const bodyDoc: RiderContentDoc = { type: 'doc', content: currentNodes };
    const contentDoc: RiderContentDoc = { type: 'doc', content: [headingNode, ...currentNodes] };
    const meta = classifySectionMeta(currentTitle, 'tecnico');
    sections.push({
      id: secId,
      num: String(secIdx).padStart(2, '0'),
      title: currentTitle,
      subtitle: meta.subtitle,
      tag: meta.tag,
      tagColor: meta.tagColor,
      iconName: meta.iconName,
      content: docToPlainText(bodyDoc),
      contentDoc,
      pageBreakBefore: secIdx > 1,
    });
    secIdx += 1;
    currentNodes = [];
  };

  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[2];

    // Check for embedded base64 images
    const imgRegex = /<img[^>]+src="data:(image\/(?:png|jpeg|webp));base64,([^"]+)"[^>]*>/gi;
    let imgMatch: RegExpExecArray | null;
    while ((imgMatch = imgRegex.exec(inner)) !== null) {
      const mime = imgMatch[1] as 'image/png' | 'image/jpeg' | 'image/webp';
      const b64 = imgMatch[2];
      const saved = await saveImportedImageBuffer(
        Buffer.from(b64, 'base64'),
        mime,
        `docx-img-${imgCounter}.png`,
        'plot',
        riderUuid
      );
      imgCounter += 1;
      const width = docxExtras.imageWidths[imageWidthCursor];
      imageWidthCursor += 1;
      currentNodes.push({
        type: 'image',
        attrs: {
          src: saved.url,
          alt: currentTitle,
          ...(width ? { width: Math.min(624, width) } : {}),
        },
      });
    }

    const inline = styled(inner);
    const plain = inlinePlain(inline);
    if (!plain && !inner.includes('<img')) continue;

    if (tag === 'h1' || tag === 'h2') {
      flushDocxSection();
      currentTitle = plain || currentTitle;
    } else if (tag === 'h3') {
      currentNodes.push({
        type: 'heading',
        attrs: { level: 3 },
        content: inline.length > 0 ? inline : [{ type: 'text', text: plain || 'Sección' }],
      });
    } else if (tag === 'ul' || tag === 'ol') {
      const items: RiderContentNode[] = [];
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = liRegex.exec(inner)) !== null) {
        const liInline = styled(liMatch[1] ?? '');
        if (inlinePlain(liInline)) {
          items.push({
            type: 'listItem',
            content: [{ type: 'paragraph', content: liInline }],
          });
        }
      }
      if (items.length > 0) {
        currentNodes.push({
          type: tag === 'ol' ? 'orderedList' : 'bulletList',
          content: items,
        });
      }
    } else if (tag === 'table') {
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const tableRows: RiderContentNode[] = [];
      let trMatch: RegExpExecArray | null;
      let rowIndex = 0;
      while ((trMatch = trRegex.exec(inner)) !== null) {
        const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
        const cells: RiderContentNode[] = [];
        let cellMatch: RegExpExecArray | null;
        while ((cellMatch = cellRegex.exec(trMatch[1] ?? '')) !== null) {
          const cellInline = styled(cellMatch[2] ?? '');
          const cellType = rowIndex === 0 || cellMatch[1]?.toLowerCase() === 'th' ? 'tableHeader' : 'tableCell';
          cells.push({
            type: cellType,
            content: [{
              type: 'paragraph',
              content: cellInline.length > 0 ? cellInline : undefined,
            }],
          });
        }
        if (cells.length > 0) tableRows.push({ type: 'tableRow', content: cells });
        rowIndex += 1;
      }
      if (tableRows.length > 0) {
        currentNodes.push({ type: 'table', content: tableRows });
      }
    } else if (inline.length > 0) {
      currentNodes.push({
        type: 'paragraph',
        content: inline,
      });
    }
  }

  flushDocxSection();

  return {
    artistName,
    riderTitle,
    riderType: 'tecnico',
    season,
    version,
    date: season,
    rawText,
    sections,
    modules: {
      tecnico: sections,
      hospitality: [],
      seguridad: [],
    },
    channels: [],
    media: [],
  };
}
