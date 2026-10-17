import { renderPageAsImage } from 'unpdf';

type PdfSource = Parameters<typeof renderPageAsImage>[0];

/** Ancho útil de la hoja del editor (816 px menos el padding de 96 px por lado). */
export const EDITOR_CONTENT_WIDTH = 624;

const SAVE = 10;
const RESTORE = 11;
const TRANSFORM = 12;
const SHOW_TEXT = 44;
const SHOW_SPACED_TEXT = 45;
const SET_FILL_COLOR = 54;
const SET_FILL_GRAY = 57;
const SET_FILL_RGB = 59;
const SET_FILL_CMYK = 61;
const PAINT_INLINE_IMAGE = 86;
const PAINT_INLINE_IMAGE_GROUP = 87;
const PAINT_IMAGE = 85;
const PAINT_IMAGE_REPEAT = 88;
const CONSTRUCT_PATH = 91;
const FILL = 22;
const EO_FILL = 23;
const FILL_STROKE = 24;
const EO_FILL_STROKE = 25;
const CLOSE_FILL_STROKE = 26;
const CLOSE_EO_FILL_STROKE = 27;

const IMAGE_OPS = new Set([PAINT_IMAGE, PAINT_INLINE_IMAGE, PAINT_INLINE_IMAGE_GROUP, PAINT_IMAGE_REPEAT]);
const FILL_OPS = new Set([FILL, EO_FILL, FILL_STROKE, EO_FILL_STROKE, CLOSE_FILL_STROKE, CLOSE_EO_FILL_STROKE]);

export interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfImagePaint extends PdfRect {
  yCenter: number;
}

export interface PdfCallout {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  color?: string;
}

export interface PageGraphics {
  imagePaints: PdfImagePaint[];
  callouts: PdfCallout[];
  diagrams: PdfRect[];
  pageFill?: string;
  showTextEntries: Array<{ str: string; color: string }>;
}

type Matrix = [number, number, number, number, number, number];

function multiply(m: Matrix, n: Matrix): Matrix {
  const [a, b, c, d, e, f] = m;
  const [a2, b2, c2, d2, e2, f2] = n;
  return [
    a * a2 + c * b2,
    b * a2 + d * b2,
    a * c2 + c * d2,
    b * c2 + d * d2,
    a * e2 + c * f2 + e,
    b * e2 + d * f2 + f,
  ];
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => clampByte(channel).toString(16).padStart(2, '0')).join('')}`;
}

function unitChannel(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n <= 1 ? n * 255 : n;
}

function fillFromArgs(fn: number, args: unknown[]): string | null {
  const list = Array.isArray(args) || (args && typeof args === 'object' && typeof (args as ArrayLike<unknown>).length === 'number')
    ? Array.from(args as ArrayLike<unknown>)
    : null;
  if (!list) return null;
  const painted = list.find((value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value));
  if (typeof painted === 'string') return painted.toLowerCase();
  const values = list.map(Number);
  args = values;
  if (fn === SET_FILL_RGB && args.length >= 3) {
    return rgbHex(unitChannel(Number(args[0])), unitChannel(Number(args[1])), unitChannel(Number(args[2])));
  }
  if (fn === SET_FILL_GRAY && args.length >= 1) {
    const gray = unitChannel(Number(args[0]));
    return rgbHex(gray, gray, gray);
  }
  if (fn === SET_FILL_CMYK && args.length >= 4) {
    const c = Number(args[0]) <= 1 ? Number(args[0]) : Number(args[0]) / 255;
    const m = Number(args[1]) <= 1 ? Number(args[1]) : Number(args[1]) / 255;
    const y = Number(args[2]) <= 1 ? Number(args[2]) : Number(args[2]) / 255;
    const k = Number(args[3]) <= 1 ? Number(args[3]) : Number(args[3]) / 255;
    return rgbHex(255 * (1 - c) * (1 - k), 255 * (1 - m) * (1 - k), 255 * (1 - y) * (1 - k));
  }
  if (fn === SET_FILL_COLOR) {
    if (args.length >= 3) {
      return rgbHex(unitChannel(Number(args[0])), unitChannel(Number(args[1])), unitChannel(Number(args[2])));
    }
    if (args.length >= 1 && typeof args[0] === 'number') {
      const gray = unitChannel(Number(args[0]));
      return rgbHex(gray, gray, gray);
    }
  }
  return null;
}

function rectFromMatrix(ctm: Matrix): PdfImagePaint | null {
  const [a, , c, , e, f] = ctm;
  const width = Math.hypot(ctm[0], ctm[1]);
  const height = Math.hypot(ctm[2], ctm[3]);
  if (width < 4 || height < 4) return null;
  const x = Math.min(e, e + a);
  const y = Math.min(f, f + ctm[3]);
  return { x, y, width, height, yCenter: y + height / 2 };
}

function usableFill(hex: string | undefined): string | undefined {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return undefined;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (r < 28 && g < 28 && b < 28) return undefined;
  if (r > 248 && g > 248 && b > 248) return undefined;
  return hex.toLowerCase();
}

function numericList(raw: unknown): number[] | null {
  if (Array.isArray(raw)) return raw.map(Number);
  if (raw && typeof raw === 'object' && typeof (raw as ArrayLike<number>).length === 'number') {
    return Array.from(raw as ArrayLike<number>, Number);
  }
  return null;
}

function bboxOf(raw: unknown): { x0: number; y0: number; x1: number; y1: number } | null {
  const values = numericList(raw);
  if (!values || values.length < 4) return null;
  const x0 = Number(values[0]);
  const y0 = Number(values[1]);
  const x1 = Number(values[2]);
  const y1 = Number(values[3]);
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
  return {
    x0: Math.min(x0, x1),
    y0: Math.min(y0, y1),
    x1: Math.max(x0, x1),
    y1: Math.max(y0, y1),
  };
}

function isCallout(box: { x0: number; y0: number; x1: number; y1: number }, pageWidth: number, pageHeight: number): boolean {
  const width = box.x1 - box.x0;
  const height = box.y1 - box.y0;
  return width >= Math.min(350, pageWidth * 0.55)
    && height >= 22
    && height <= 520
    && box.y0 >= 40
    && box.y1 <= pageHeight - 40;
}

function isPageFill(box: { x0: number; y0: number; x1: number; y1: number }, pageWidth: number, pageHeight: number): boolean {
  const width = box.x1 - box.x0;
  const height = box.y1 - box.y0;
  return width >= pageWidth * 0.85 && height >= pageHeight * 0.7;
}

function clusterDiagrams(
  boxes: Array<{ x0: number; y0: number; x1: number; y1: number }>,
  pageWidth: number,
  pageHeight: number
): PdfRect[] {
  const pending = boxes
    .filter((box) => box.x1 - box.x0 >= 6 || box.y1 - box.y0 >= 6)
    .map((box) => ({ ...box, used: false }));
  const diagrams: PdfRect[] = [];
  const pageArea = pageWidth * pageHeight;

  for (let i = 0; i < pending.length; i += 1) {
    const seed = pending[i];
    if (!seed || seed.used) continue;
    seed.used = true;
    const cluster = { ...seed, count: 1 };
    let grew = true;
    while (grew) {
      grew = false;
      for (const item of pending) {
        if (item.used) continue;
        const pad = 64;
        const separated = item.x1 < cluster.x0 - pad
          || item.x0 > cluster.x1 + pad
          || item.y1 < cluster.y0 - pad
          || item.y0 > cluster.y1 + pad;
        if (separated) continue;
        item.used = true;
        cluster.x0 = Math.min(cluster.x0, item.x0);
        cluster.y0 = Math.min(cluster.y0, item.y0);
        cluster.x1 = Math.max(cluster.x1, item.x1);
        cluster.y1 = Math.max(cluster.y1, item.y1);
        cluster.count += 1;
        grew = true;
      }
    }
    const width = cluster.x1 - cluster.x0;
    const height = cluster.y1 - cluster.y0;
    const area = width * height;
    if (cluster.count < 8 || width < 110 || height < 72) continue;
    if (pageArea > 0 && area > pageArea * 0.9) continue;
    diagrams.push({
      x: Math.max(0, cluster.x0 - 6),
      y: Math.max(0, cluster.y0 - 6),
      width: Math.min(pageWidth, width + 12),
      height: Math.min(pageHeight, height + 12),
    });
  }
  return diagrams;
}

function glyphsToString(args: unknown[]): string {
  if (typeof args[0] === 'string') return args[0];
  const glyphs = Array.isArray(args[0]) ? args[0] : [];
  return glyphs
    .filter((glyph): glyph is { unicode: string } => Boolean(glyph) && typeof glyph === 'object' && typeof (glyph as { unicode?: unknown }).unicode === 'string')
    .map((glyph) => glyph.unicode)
    .join('');
}

export function collectPageGraphics(
  opList: { fnArray: ArrayLike<number>; argsArray: ArrayLike<unknown> },
  pageWidth: number,
  pageHeight: number
): PageGraphics {
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  let fill = '#000000';
  const imagePaints: PdfImagePaint[] = [];
  const callouts: PdfCallout[] = [];
  const pathBoxes: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
  const showTextEntries: Array<{ str: string; color: string }> = [];
  let pageFill: string | undefined;

  for (let i = 0; i < opList.fnArray.length; i += 1) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];
    if (fn === SAVE) {
      stack.push([...ctm]);
      continue;
    }
    if (fn === RESTORE) {
      ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
      continue;
    }
    if (fn === TRANSFORM && Array.isArray(args) && args.length >= 6) {
      ctm = multiply(ctm, args.slice(0, 6).map(Number) as Matrix);
      continue;
    }
    const nextFill = Array.isArray(args) ? fillFromArgs(fn ?? 0, args) : null;
    if (nextFill) {
      fill = nextFill;
      continue;
    }
    if ((fn === SHOW_TEXT || fn === SHOW_SPACED_TEXT) && Array.isArray(args)) {
      const str = glyphsToString(args).replace(/\s+/g, '');
      if (str.trim()) showTextEntries.push({ str, color: fill });
      continue;
    }
    if (fn != null && IMAGE_OPS.has(fn)) {
      const rect = rectFromMatrix(ctm);
      if (rect) imagePaints.push(rect);
      continue;
    }
    if (fn !== CONSTRUCT_PATH || !Array.isArray(args)) continue;
    const paintOp = typeof args[0] === 'number' ? args[0] : null;
    const box = bboxOf(args[2]);
    if (!box || paintOp == null || !FILL_OPS.has(paintOp)) {
      if (box) pathBoxes.push(box);
      continue;
    }
    if (isPageFill(box, pageWidth, pageHeight)) {
      pageFill = usableFill(fill) ?? pageFill;
      continue;
    }
    if (isCallout(box, pageWidth, pageHeight)) {
      callouts.push({
        xMin: box.x0,
        yMin: box.y0 - 2,
        xMax: box.x1,
        yMax: box.y1 + 2,
        color: usableFill(fill),
      });
      continue;
    }
    pathBoxes.push(box);
  }

  const merged: PdfCallout[] = [];
  for (const box of callouts.sort((a, b) => b.yMax - a.yMax)) {
    const overlap = merged.find((item) => !(box.yMax < item.yMin || box.yMin > item.yMax));
    if (overlap) {
      overlap.yMin = Math.min(overlap.yMin, box.yMin);
      overlap.yMax = Math.max(overlap.yMax, box.yMax);
      overlap.xMin = Math.min(overlap.xMin, box.xMin);
      overlap.xMax = Math.max(overlap.xMax, box.xMax);
      overlap.color = overlap.color || box.color;
    } else {
      merged.push({ ...box });
    }
  }

  return {
    imagePaints,
    callouts: merged,
    diagrams: clusterDiagrams(pathBoxes, pageWidth, pageHeight),
    pageFill,
    showTextEntries,
  };
}

export function editorPx(pdfUnits: number, pageWidth: number): number {
  if (pageWidth <= 0) return EDITOR_CONTENT_WIDTH;
  const px = Math.round((pdfUnits / pageWidth) * EDITOR_CONTENT_WIDTH);
  return Math.max(18, Math.min(EDITOR_CONTENT_WIDTH, px));
}

export function coversPage(rect: PdfRect, pageWidth: number, pageHeight: number): boolean {
  if (pageWidth <= 0 || pageHeight <= 0) return false;
  const coverage = (rect.width * rect.height) / (pageWidth * pageHeight);
  const reachesTop = rect.y + rect.height >= pageHeight * 0.88;
  return coverage >= 0.62 && rect.x <= pageWidth * 0.08 && reachesTop;
}

export function containsPoint(rect: PdfRect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export async function renderPageRegion(
  pdf: PdfSource,
  pageNumber: number,
  region: PdfRect,
  pageHeight: number
): Promise<Buffer> {
  const scale = 2;
  const rendered = await renderPageAsImage(pdf, pageNumber, {
    scale,
    canvasImport: () => import('@napi-rs/canvas'),
  });
  const { createCanvas, loadImage } = await import('@napi-rs/canvas');
  const img = await loadImage(Buffer.from(rendered));
  const sx = Math.max(0, Math.floor(region.x * scale));
  const sy = Math.max(0, Math.floor((pageHeight - region.y - region.height) * scale));
  const sw = Math.max(1, Math.min(img.width - sx, Math.ceil(region.width * scale)));
  const sh = Math.max(1, Math.min(img.height - sy, Math.ceil(region.height * scale)));
  const canvas = createCanvas(sw, sh);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toBuffer('image/png');
}
