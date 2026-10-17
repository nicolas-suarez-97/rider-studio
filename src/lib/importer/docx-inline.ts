import zlib from 'zlib';
import { RiderContentNode } from '@/core/types/rider.types';

export interface DocxRunStyle {
  text: string;
  color?: string;
  sizePt?: number;
}

export interface DocxPackageExtras {
  runs: DocxRunStyle[];
  background: { bytes: Buffer; contentType: 'image/png' | 'image/jpeg' | 'image/webp' } | null;
  imageWidths: number[];
}

interface MarkBag {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: boolean;
  color?: string;
  size?: string;
  href?: string;
}

function decodeXml(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function unzip(buf: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 30 < buf.length && buf.readUInt32LE(offset) === 0x04034b50) {
    const flags = buf.readUInt16LE(offset + 6);
    const method = buf.readUInt16LE(offset + 8);
    let compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.toString('utf8', offset + 30, offset + 30 + nameLen);
    const dataStart = offset + 30 + nameLen + extraLen;
    if ((flags & 0x8) !== 0 && compSize === 0) break;
    const compressed = buf.subarray(dataStart, dataStart + compSize);
    try {
      const data = method === 0 ? Buffer.from(compressed) : method === 8 ? zlib.inflateRawSync(compressed) : null;
      if (data) files.set(name, data);
    } catch {
      // Un archivo dañado no debe tumbar el resto de la importación.
    }
    offset = dataStart + compSize;
  }
  return files;
}

function contentTypeFor(name: string): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return null;
}

function resolveZipPath(target: string): string {
  const clean = target.replace(/\\/g, '/').replace(/^\//, '');
  if (clean.startsWith('word/')) return clean;
  return `word/${clean.replace(/^\.\//, '')}`;
}

export function readDocxPackage(bytes: Uint8Array): DocxPackageExtras {
  const empty = { runs: [], background: null, imageWidths: [] };
  try {
    const files = unzip(Buffer.from(bytes));
    const xml = files.get('word/document.xml')?.toString('utf8') ?? '';
    if (!xml) return empty;
    const runs: DocxRunStyle[] = [];
    const runRe = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
    let runMatch: RegExpExecArray | null;
    while ((runMatch = runRe.exec(xml)) !== null) {
      const run = runMatch[1] ?? '';
      const text = [...run.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)]
        .map((item) => decodeXml(item[1] ?? ''))
        .join('');
      if (!text) continue;
      const colorRaw = /<w:color\b[^>]*w:val="([0-9A-Fa-f]{6})"/i.exec(run)?.[1];
      const sizeRaw = /<w:sz\b[^>]*w:val="(\d+)"/i.exec(run)?.[1];
      const color = colorRaw && colorRaw.toLowerCase() !== '000000' ? `#${colorRaw.toLowerCase()}` : undefined;
      const sizePt = sizeRaw ? Number(sizeRaw) / 2 : undefined;
      runs.push({ text, color, sizePt: Number.isFinite(sizePt) ? sizePt : undefined });
    }

    const imageWidths = [...xml.matchAll(/<wp:extent\b[^>]*cx="(\d+)"/g)]
      .map((item) => Math.round(Number(item[1]) / 914400 * 96))
      .filter((px) => px >= 18 && px <= 900);

    let background: DocxPackageExtras['background'] = null;
    const rels = files.get('word/_rels/document.xml.rels')?.toString('utf8') ?? '';
    const backgroundId = /<(?:w|v):background\b[\s\S]*?r:(?:id|embed)="([^"]+)"/i.exec(xml)?.[1];
    if (backgroundId && rels) {
      const rel = new RegExp(`Id="${backgroundId}"[^>]*Target="([^"]+)"`, 'i').exec(rels)
        ?? new RegExp(`Target="([^"]+)"[^>]*Id="${backgroundId}"`, 'i').exec(rels);
      const target = rel?.[1];
      const type = target ? contentTypeFor(target) : null;
      const file = target ? files.get(resolveZipPath(target)) : undefined;
      if (type && file) background = { bytes: file, contentType: type };
    }

    return { runs, background, imageWidths };
  } catch {
    return empty;
  }
}

function marksFrom(state: MarkBag): RiderContentNode['marks'] {
  const marks: NonNullable<RiderContentNode['marks']> = [];
  if (state.bold) marks.push({ type: 'bold' });
  if (state.italic) marks.push({ type: 'italic' });
  if (state.underline) marks.push({ type: 'underline' });
  if (state.highlight) marks.push({ type: 'highlight' });
  if (state.color) marks.push({ type: 'textColor', attrs: { color: state.color } });
  if (state.size) marks.push({ type: 'fontSize', attrs: { size: state.size } });
  if (state.href) marks.push({ type: 'link', attrs: { href: state.href } });
  return marks.length > 0 ? marks : undefined;
}

function readStyle(attrs: string): Partial<MarkBag> {
  const color = /color:\s*(#[0-9a-f]{3,8}|rgb\([^)]+\))/i.exec(attrs)?.[1];
  const size = /font-size:\s*([^;"']+)/i.exec(attrs)?.[1]?.trim();
  return {
    ...(color ? { color } : {}),
    ...(size ? { size } : {}),
  };
}

export function htmlToInline(html: string, runs: DocxRunStyle[] = []): RiderContentNode[] {
  const nodes: RiderContentNode[] = [];
  const stack: MarkBag[] = [{}];
  const token = /<\/?([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let match: RegExpExecArray | null;
  while ((match = token.exec(html)) !== null) {
    if (match[3] != null) {
      const text = decodeXml(match[3]);
      if (!text) continue;
      const state = stack[stack.length - 1] ?? {};
      const node: RiderContentNode = { type: 'text', text };
      const marks = marksFrom(state);
      if (marks) node.marks = marks;
      nodes.push(node);
      continue;
    }
    const tag = (match[1] ?? '').toLowerCase();
    const closing = match[0].startsWith('</');
    const selfClosing = /\/>$/.test(match[0]) || tag === 'br';
    if (tag === 'br') {
      nodes.push({ type: 'hardBreak' });
      continue;
    }
    if (closing) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const parent = stack[stack.length - 1] ?? {};
    const attrs = match[2] ?? '';
    const next: MarkBag = { ...parent };
    if (tag === 'strong' || tag === 'b') next.bold = true;
    if (tag === 'em' || tag === 'i') next.italic = true;
    if (tag === 'u') next.underline = true;
    if (tag === 'mark') next.highlight = true;
    if (tag === 'a') {
      const href = /href="([^"]+)"/i.exec(attrs)?.[1];
      if (href) next.href = decodeXml(href);
    }
    if (tag === 'span') Object.assign(next, readStyle(attrs));
    if (!selfClosing) stack.push(next);
  }

  return paintRunStyles(nodes, runs);
}

function paintRunStyles(nodes: RiderContentNode[], runs: DocxRunStyle[]): RiderContentNode[] {
  if (runs.length === 0) return nodes;
  let from = 0;
  return nodes.map((node) => {
    if (node.type !== 'text' || !node.text) return node;
    const needle = node.text.replace(/\s+/g, ' ').trim();
    if (needle.length < 2) return node;
    let found: DocxRunStyle | undefined;
    for (let i = from; i < runs.length; i += 1) {
      const run = runs[i];
      if (!run) continue;
      const hay = run.text.replace(/\s+/g, ' ');
      if (hay.includes(needle) || (hay.trim().length > 1 && needle.includes(hay.trim()))) {
        found = run;
        from = i;
        break;
      }
    }
    if (!found) return node;
    const marks = [...(node.marks ?? [])];
    if (found.color && !marks.some((mark) => mark.type === 'textColor')) {
      marks.push({ type: 'textColor', attrs: { color: found.color } });
    }
    if (found.sizePt && (found.sizePt >= 14 || found.sizePt <= 9) && !marks.some((mark) => mark.type === 'fontSize')) {
      marks.push({ type: 'fontSize', attrs: { size: `${Math.round(found.sizePt)}pt` } });
    }
    return marks.length > 0 ? { ...node, marks } : node;
  });
}

export function inlinePlain(nodes: RiderContentNode[]): string {
  return nodes
    .map((node) => (node.type === 'text' ? node.text ?? '' : node.type === 'hardBreak' ? '\n' : ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}
