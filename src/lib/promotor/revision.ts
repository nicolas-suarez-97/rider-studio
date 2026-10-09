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
import { verdictSummary } from '@/lib/promotor/contra-file';

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

export const MAX_INVENTORY_FILES = 5;

export function joinInventory(sources: Array<{ name: string; text: string }>, limit = MAX_CONTRA_EXTRACTED_CHARS): string {
  const chunks: string[] = [];
  let used = 0;
  for (const source of sources) {
    const body = source.text.trim();
    if (!body) continue;
    const header = `## ${source.name}\n`;
    const room = limit - used - header.length;
    if (room <= 80) break;
    const slice = body.slice(0, room);
    chunks.push(`${header}${slice}`);
    used += header.length + slice.length + 2;
  }
  return chunks.join('\n\n');
}

export function buildRevisionSystemPrompt(
  agentPrompt: string,
  snapshot: string,
  fileText: string,
  mode: 'generate' | 'review' | 'ask',
  catalog: string
): string {
  const fileLabel = mode === 'review'
    ? 'CONTRA-RIDER DEL RECINTO'
    : 'INVENTARIO Y PROPUESTAS DEL RECINTO';
  const fileBlock = fileText.trim()
    ? `${fileLabel}:\n${fileText}`
    : `${fileLabel}: (no hay archivos con texto)`;

  const reviewBlock = `MODO REVISIÓN.
El documento es un contra-rider ya redactado por el recinto.
Compáralo con cada pedido escrito del catálogo.
Responde solo con JSON válido, sin markdown, con esta forma:
{"reply":"","verdict":"cumple|con_observaciones|no_cumple","summary":"","findings":[{"lineId":"","verdict":"cumple|parcial|no_aparece|contradice","riderAsk":"","fileOffer":"","suggestedText":""}]}
Incluye un finding por cada lineId del catálogo.
En fileOffer cita el nombre del archivo y lo que ese texto ofrece o niega.
Usa cumple solo si el archivo ofrece lo mismo que pide el rider.
Usa parcial si ofrece algo usable, pero incompleto o distinto.
Usa no_aparece si el archivo no lo menciona.
Usa contradice si el archivo lo niega o ofrece algo incompatible.
No inventes equipos. No digas que editaste, guardaste o enviaste el rider.
En reply y summary usa solo estas respuestas: Aprobado, Alternativa y Rechazado.
Responde en español.

CATÁLOGO:
${catalog}`;

  const modeBlock = mode === 'review'
    ? reviewBlock
    : mode === 'generate'
    ? `MODO PROPUESTA.
Los documentos son datos sueltos del promotor: inventario, cotizaciones, listas o notas. No son un contra-rider ya redactado.
Cruza esos datos con cada pedido escrito del artista y redacta el contra-rider resultante.
Responde solo con JSON válido, sin markdown, con esta forma:
{"reply":"","verdict":"cumple|con_observaciones|no_cumple","summary":"","findings":[{"lineId":"","verdict":"cumple|parcial|no_aparece|contradice","riderAsk":"","fileOffer":"","suggestedText":""}]}
Incluye un finding por cada lineId del catálogo.
En fileOffer cita el nombre del archivo y la oferta o el motivo tomado de ese texto.
Usa cumple solo si el inventario ofrece lo mismo que pide el rider.
Usa parcial si ofrece algo usable, pero incompleto o distinto. suggestedText es la alternativa concreta.
Usa no_aparece si el inventario no lo menciona. suggestedText: "El inventario no menciona este pedido."
Usa contradice si el inventario lo niega o ofrece algo incompatible.
No inventes equipos que no estén escritos. No digas que editaste, guardaste o enviaste el rider.
En reply y summary usa solo estas respuestas: Aprobado, Alternativa y Rechazado.
Responde en español.

CATÁLOGO:
${catalog}`
    : `MODO CONSULTA DEL PROMOTOR.
Respondes sobre el rider publicado y, si hay texto, sobre el inventario o las propuestas del recinto.
No modificas el rider. No digas que guardaste, actualizaste o enviaste nada.
Si el dato no está escrito, dilo. Cita la sección.
Si preguntan por los archivos y no hay texto, dilo.
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

const VERDICT_LINE = {
  cumple: 'Todos los pedidos quedan en Aprobado.',
  con_observaciones: 'Hay pedidos en Aprobado, Alternativa y Rechazado.',
  no_cumple: 'La mayoría de los pedidos quedan en Rechazado.',
} as const;

export function reviewFromFindings(
  lines: ContraLine[],
  rawFindings: Array<{ lineId: string; verdict: FindingVerdict; riderAsk?: string; fileOffer?: string; suggestedText?: string }>,
  _summaryHint: string
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
    const suggested = suggestionFor('no_aparece', '', 'El inventario no menciona este pedido.');
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
  const summary = verdictSummary(findings);
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

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function hasPhrase(text: string, haystack: string): boolean {
  const words = normalizeText(text).split(/[^a-z0-9]+/).filter((word) => word.length >= 4);
  for (let index = 0; index < words.length - 1; index += 1) {
    if (haystack.includes(`${words[index]} ${words[index + 1]}`)) return true;
  }
  return false;
}

export function proposeFromInventory(
  lines: ContraLine[],
  sources: Array<{ name: string; text: string }>,
  kind: 'inventory' | 'contra' = 'inventory'
): { reply: string; review: ContraReviewRecord | null } {
  const catalog = catalogLines(lines);
  if (catalog.length === 0) {
    return {
      reply: kind === 'contra'
        ? 'Este rider no tiene pedidos escritos para comparar.'
        : 'Este rider no tiene pedidos escritos para armar un contra-rider.',
      review: null,
    };
  }
  const readable = sources.filter((source) => source.text.trim());
  if (readable.length === 0) {
    return { reply: emptyFileReply(), review: null };
  }

  const stacks = readable.map((source) => ({
    name: source.name,
    haystack: normalizeText(source.text),
  }));
  const raw = catalog.map((line) => {
    let best = { name: stacks[0].name, title: 0, body: 0, phrase: false };
    const titleTerms = termsOf(line.sectionTitle);
    const bodyTerms = termsOf(line.pedido).slice(0, 12);
    for (const stack of stacks) {
      const title = coverage(titleTerms, stack.haystack);
      const body = coverage(bodyTerms, stack.haystack);
      const phrase = hasPhrase(line.sectionTitle, stack.haystack) || hasPhrase(line.pedido, stack.haystack);
      const score = Math.max(title, body) + (phrase ? 0.01 : 0);
      const bestScore = Math.max(best.title, best.body) + (best.phrase ? 0.01 : 0);
      if (score > bestScore) best = { name: stack.name, title, body, phrase };
    }
    const mentionedInFile = best.title >= 0.5 || best.body >= 0.34;
    const verdict: FindingVerdict = mentionedInFile ? 'parcial' : 'no_aparece';
    const mention = kind === 'contra' ? 'el archivo menciona este pedido' : 'tus datos mencionan este pedido';
    const missing = kind === 'contra' ? 'El archivo no menciona este pedido.' : 'Tus datos no mencionan este pedido.';
    return {
      lineId: line.id,
      verdict,
      riderAsk: line.pedido.slice(0, 240),
      fileOffer: verdict === 'no_aparece' ? '' : `${best.name}: ${mention}.`,
      suggestedText: verdict === 'parcial'
        ? `Alternativa tomada de ${best.name}. Confirma la oferta.`
        : missing,
    };
  });
  const review = reviewFromFindings(catalog, raw, '');
  if (!review) {
    return {
      reply: kind === 'contra' ? 'No pude comparar ese contra-rider.' : 'No pude armar el contra-rider con esos datos.',
      review: null,
    };
  }
  review.summary = verdictSummary(review.findings);
  const names = readable.map((source) => source.name).join(', ');
  const verdictLine = VERDICT_LINE[review.verdict];
  return {
    reply: kind === 'contra'
      ? `Comparé el contra-rider (${names}) con el rider. ${verdictLine} ${review.summary}`
      : `Crucé los datos que subiste (${names}) con lo que pide el artista. ${verdictLine} ${review.summary}`,
    review,
  };
}

export function heuristicReview(lines: ContraLine[], fileText: string): { reply: string; review: ContraReviewRecord | null } {
  return proposeFromInventory(lines, [{ name: 'archivo', text: fileText }]);
}

export function emptyFileReply(): string {
  return 'No pude leer texto en ese archivo. Exporta el PDF con texto, o súbelo como Word o texto.';
}
