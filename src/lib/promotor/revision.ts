import { extractText } from 'unpdf';
import mammoth from 'mammoth';
import { z } from 'zod';
import {
  ContraFinding,
  ContraLine,
  ContraReviewRecord,
  FindingVerdict,
  ReviewVerdict,
} from '@/core/types/contra-rider.types';
import { lineHasPedido, suggestionFor } from '@/lib/promotor/contra-rider';

export const MAX_CONTRA_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_CONTRA_EXTRACTED_CHARS = 20000;

const FindingSchema = z.object({
  lineId: z.string(),
  verdict: z.enum(['cumple', 'parcial', 'no_aparece', 'contradice']),
  riderAsk: z.string().optional().default(''),
  fileOffer: z.string().optional().default(''),
  suggestedText: z.string().optional().default(''),
});

const ModelReviewSchema = z.object({
  reply: z.string().optional().default(''),
  verdict: z.enum(['cumple', 'con_observaciones', 'no_cumple']).optional(),
  summary: z.string().optional().default(''),
  findings: z.array(FindingSchema).default([]),
});

export interface ExtractedContraFile {
  text: string;
  truncated: boolean;
}

export type ExtractContraResult =
  | { ok: true; extracted: ExtractedContraFile }
  | { ok: false; error: string };

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1).toLowerCase() : '';
}

function clipText(value: string): { text: string; truncated: boolean } {
  const cleaned = value.replace(/\u0000/g, '').trim();
  if (cleaned.length <= MAX_CONTRA_EXTRACTED_CHARS) {
    return { text: cleaned, truncated: false };
  }
  return { text: cleaned.slice(0, MAX_CONTRA_EXTRACTED_CHARS), truncated: true };
}

export async function extractContraFile(file: File): Promise<ExtractContraResult> {
  if (file.size <= 0) return { ok: false, error: 'El archivo está vacío.' };
  if (file.size > MAX_CONTRA_FILE_BYTES) return { ok: false, error: 'El archivo supera el límite de 8 MB.' };

  const ext = extensionOf(file.name);
  const mime = file.type.toLowerCase();
  if (ext === 'doc' || mime === 'application/msword') {
    return { ok: false, error: 'El formato .doc no se puede leer. Guárdalo como .docx, PDF o texto.' };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let raw = '';

    if (ext === 'pdf' || mime === 'application/pdf') {
      const extracted = await extractText(bytes, { mergePages: true });
      raw = extracted.text;
    } else if (ext === 'docx' || mime.includes('wordprocessingml')) {
      const extracted = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      raw = extracted.value || '';
    } else if (
      ext === 'txt' ||
      ext === 'md' ||
      ext === 'markdown' ||
      mime.startsWith('text/') ||
      mime === 'text/markdown'
    ) {
      raw = new TextDecoder().decode(bytes);
    } else {
      return { ok: false, error: 'Usa un PDF, Word (.docx) o un archivo de texto.' };
    }

    return { ok: true, extracted: clipText(raw) };
  } catch (error) {
    console.warn('[Contra file] extracción fallida', error instanceof Error ? error.message : 'error');
    return { ok: false, error: 'No pude leer el texto de ese archivo.' };
  }
}

export function catalogLines(lines: ContraLine[]): ContraLine[] {
  return lines.filter((line) => lineHasPedido(line.pedido));
}

export function buildRevisionSystemPrompt(
  agentPrompt: string,
  snapshot: string,
  fileText: string,
  mode: 'review' | 'ask',
  catalog: string
): string {
  const fileBlock = fileText.trim()
    ? `CONTRA-RIDER DEL RECINTO:\n${fileText}`
    : 'CONTRA-RIDER DEL RECINTO: (no hay archivo con texto)';

  const modeBlock = mode === 'review'
    ? `MODO REVISIÓN.
Compara el contra-rider del recinto con cada pedido del catálogo.
Responde solo con JSON válido, sin markdown, con esta forma:
{"reply":"","verdict":"cumple|con_observaciones|no_cumple","summary":"","findings":[{"lineId":"","verdict":"cumple|parcial|no_aparece|contradice","riderAsk":"","fileOffer":"","suggestedText":""}]}
Incluye un finding por cada lineId del catálogo.
Usa cumple solo si el archivo ofrece lo pedido.
Usa parcial si ofrece algo usable, pero falta cantidad, marca o condición.
Usa no_aparece si el pedido no se menciona.
Usa contradice si el archivo lo niega o ofrece algo incompatible.
No inventes inventario. No digas que editaste, guardaste o enviaste el rider.
Responde en español.

CATÁLOGO:
${catalog}`
    : `MODO CONSULTA DEL PROMOTOR.
Respondes sobre el rider publicado y, si hay texto, sobre el contra-rider del recinto.
No modificas el rider. No digas que guardaste, actualizaste o enviaste nada.
Si el dato no está escrito, dilo. Cita la sección.
Si preguntan por el archivo y no hay texto, dilo.
Responde en español y de forma breve.`;

  return `${agentPrompt}

${modeBlock}

RIDER:
${snapshot}

${fileBlock}`;
}

export function catalogText(lines: ContraLine[]): string {
  return lines.map((line) => (
    `${line.id} | ${line.sectionTitle} | ${line.moduleLabel}\n${line.pedido.slice(0, 500)}`
  )).join('\n\n');
}

function reviewVerdict(findings: ContraFinding[]): ReviewVerdict {
  if (findings.length === 0) return 'con_observaciones';
  if (findings.every((finding) => finding.verdict === 'cumple')) return 'cumple';
  const gaps = findings.filter((finding) => finding.verdict === 'contradice' || finding.verdict === 'no_aparece').length;
  if (findings.some((finding) => finding.verdict === 'contradice') || gaps > findings.length / 2) {
    return 'no_cumple';
  }
  return 'con_observaciones';
}

function countSummary(findings: ContraFinding[]): string {
  const count = (verdict: FindingVerdict) => findings.filter((finding) => finding.verdict === verdict).length;
  const label = (amount: number, singular: string, plural: string) => `${amount} ${amount === 1 ? singular : plural}`;
  return [
    label(count('cumple'), 'cubierto', 'cubiertos'),
    label(count('parcial'), 'parcial', 'parciales'),
    label(count('no_aparece'), 'sin mención', 'sin mención'),
    label(count('contradice'), 'en contradicción', 'en contradicción'),
  ].join(', ') + '.';
}

const VERDICT_LINE = {
  cumple: 'El archivo cubre los pedidos escritos del rider.',
  con_observaciones: 'El archivo cubre parte de los pedidos. Revisa los parciales y lo que no aparece.',
  no_cumple: 'El archivo no cubre el rider: hay pedidos sin mención o en contradicción.',
} as const;

export function reviewFromFindings(
  lines: ContraLine[],
  rawFindings: Array<{ lineId: string; verdict: FindingVerdict; riderAsk?: string; fileOffer?: string; suggestedText?: string }>,
  summaryHint: string
): ContraReviewRecord | null {
  const catalog = catalogLines(lines);
  if (catalog.length === 0) return null;
  const byId = new Map(catalog.map((line) => [line.id, line]));
  const findings: ContraFinding[] = [];
  const seen = new Set<string>();

  for (const raw of rawFindings) {
    const line = byId.get(raw.lineId);
    if (!line || seen.has(line.id)) continue;
    seen.add(line.id);
    const fileOffer = (raw.fileOffer || '').trim().slice(0, 500);
    const riderAsk = (raw.riderAsk || line.pedido).trim().slice(0, 500);
    const suggested = suggestionFor(raw.verdict, fileOffer, raw.suggestedText || '');
    findings.push({
      lineId: line.id,
      sectionTitle: line.sectionTitle,
      verdict: raw.verdict,
      riderAsk,
      fileOffer,
      suggestedResponse: suggested.response,
      suggestedText: suggested.text,
    });
  }

  if (findings.length < Math.ceil(catalog.length * 0.6)) return null;

  for (const line of catalog) {
    if (seen.has(line.id)) continue;
    const suggested = suggestionFor('no_aparece', '', 'El archivo no menciona este pedido.');
    findings.push({
      lineId: line.id,
      sectionTitle: line.sectionTitle,
      verdict: 'no_aparece',
      riderAsk: line.pedido.slice(0, 500),
      fileOffer: '',
      suggestedResponse: suggested.response,
      suggestedText: suggested.text,
    });
  }

  const verdict = reviewVerdict(findings);
  const summary = summaryHint.trim().slice(0, 600) || countSummary(findings);
  return {
    verdict,
    summary,
    findings,
    reviewedAt: new Date().toISOString(),
  };
}

export function parseModelReview(raw: string, lines: ContraLine[]): { reply: string; review: ContraReviewRecord | null } | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  const result = ModelReviewSchema.safeParse(parsed);
  if (!result.success) return null;
  const review = reviewFromFindings(lines, result.data.findings, result.data.summary);
  const reply = result.data.reply.trim().slice(0, 700)
    || (review ? VERDICT_LINE[review.verdict] : '');
  if (!reply && !review) return null;
  return { reply: reply || VERDICT_LINE.con_observaciones, review };
}

function termsOf(text: string): string[] {
  return [...new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 4)
  )];
}

function mentioned(term: string, haystack: string): boolean {
  if (haystack.includes(term)) return true;
  return term.length >= 7 && haystack.includes(term.slice(0, 6));
}

function coverage(terms: string[], haystack: string): number {
  if (terms.length === 0) return 0;
  const hits = terms.filter((term) => mentioned(term, haystack)).length;
  return hits / terms.length;
}

export function heuristicReview(lines: ContraLine[], fileText: string): { reply: string; review: ContraReviewRecord | null } {
  const catalog = catalogLines(lines);
  if (catalog.length === 0) {
    return { reply: 'Este rider no tiene pedidos escritos para comparar.', review: null };
  }
  const haystack = fileText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const raw = catalog.map((line) => {
    const titleScore = coverage(termsOf(line.sectionTitle), haystack);
    const bodyScore = coverage(termsOf(line.pedido).slice(0, 12), haystack);
    const verdict: FindingVerdict = titleScore >= 0.5 || bodyScore >= 0.34 ? 'parcial' : 'no_aparece';
    return {
      lineId: line.id,
      verdict,
      riderAsk: line.pedido.slice(0, 240),
      fileOffer: verdict === 'parcial' ? 'El archivo menciona parte de este pedido.' : '',
      suggestedText: verdict === 'parcial'
        ? 'El archivo menciona parte de este pedido. Confirma la oferta.'
        : 'El archivo no menciona este pedido.',
    };
  });
  const review = reviewFromFindings(catalog, raw, '');
  if (!review) {
    return { reply: 'No pude armar la revisión del archivo.', review: null };
  }
  review.summary = countSummary(review.findings);
  return {
    reply: `Comparé términos del archivo con el rider. ${VERDICT_LINE[review.verdict]} ${review.summary}`,
    review,
  };
}

export function emptyFileReply(): string {
  return 'No pude leer texto en ese archivo. Exporta el PDF con texto, o súbelo como Word o texto.';
}
