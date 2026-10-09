import { RIDER_DATA } from '@/core/constants/rider-templates';
import { Rider } from '@/core/models/Rider';
import {
  ContraAnswer,
  ContraFileRecord,
  ContraFinding,
  ContraLine,
  ContraResponse,
  ContraReviewRecord,
  FindingVerdict,
  PromotorFileView,
  ReviewVerdict,
  ContraRiderRecord,
} from '@/core/types/contra-rider.types';
import { RiderModuleData, RiderType, SectionItem } from '@/core/types/rider.types';
import { Json } from '@/lib/supabase/database.types';

const MODULE_LABEL: Record<RiderType, string> = {
  tecnico: 'Técnico',
  hospitality: 'Hospitality',
  seguridad: 'Seguridad',
};

const RESPONSES = new Set<ContraResponse>(['', 'cubro', 'alternativa', 'no_puedo', 'pregunta']);
const FINDING_VERDICTS = new Set<FindingVerdict>(['cumple', 'parcial', 'no_aparece', 'contradice']);
const REVIEW_VERDICTS = new Set<ReviewVerdict>(['cumple', 'con_observaciones', 'no_cumple']);
const EMPTY_PEDIDO = 'Sin pedido escrito en esta sección.';

export function emptyContraRecord(): ContraRiderRecord {
  return {
    status: 'draft',
    version: 0,
    sentAt: null,
    answers: {},
    files: [],
    submittedFile: null,
    review: null,
    reviewSessionId: null,
  };
}

export function lineHasPedido(pedido: string): boolean {
  return pedido.trim() !== EMPTY_PEDIDO;
}

export function suggestionFor(
  verdict: FindingVerdict,
  fileOffer: string,
  suggestedText: string
): { response: Exclude<ContraResponse, ''>; text: string } {
  const offer = fileOffer.trim().slice(0, 500);
  const text = suggestedText.trim().slice(0, 1000);
  if (verdict === 'cumple') return { response: 'cubro', text: '' };
  if (verdict === 'parcial') {
    return { response: 'alternativa', text: offer || text || 'Oferta tomada del inventario.' };
  }
  if (verdict === 'contradice') {
    return { response: 'no_puedo', text: text || offer || 'El inventario contradice este pedido.' };
  }
  return { response: 'no_puedo', text: text || 'El inventario no menciona este pedido.' };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readResponse(value: unknown): ContraResponse {
  return typeof value === 'string' && RESPONSES.has(value as ContraResponse)
    ? (value as ContraResponse)
    : '';
}

export function readStoredContra(metadata: Json | null | undefined): ContraRiderRecord {
  const meta = asRecord(metadata);
  const raw = asRecord(meta?.contraRider);
  if (!raw) return emptyContraRecord();

  const answers: Record<string, ContraAnswer> = {};
  const rawAnswers = asRecord(raw.answers);
  if (rawAnswers) {
    for (const [id, value] of Object.entries(rawAnswers)) {
      const answer = asRecord(value);
      if (!answer) continue;
      answers[id] = {
        response: readResponse(answer.response),
        offer: typeof answer.offer === 'string' ? answer.offer : '',
        note: typeof answer.note === 'string' ? answer.note : '',
      };
    }
  }

  return {
    status: raw.status === 'sent' ? 'sent' : 'draft',
    version: typeof raw.version === 'number' && raw.version > 0 ? Math.floor(raw.version) : 0,
    sentAt: typeof raw.sentAt === 'string' ? raw.sentAt : null,
    answers,
    files: readContraFiles(raw.files, raw.file),
    submittedFile: readContraFile(raw.submittedFile),
    review: readContraReview(raw.review),
    reviewSessionId: typeof raw.reviewSessionId === 'string' ? raw.reviewSessionId : null,
  };
}

function readContraFiles(list: unknown, legacy: unknown): ContraFileRecord[] {
  if (Array.isArray(list)) {
    return list
      .map(readContraFile)
      .filter((file): file is ContraFileRecord => file !== null)
      .slice(0, 5);
  }
  const single = readContraFile(legacy);
  return single ? [single] : [];
}

function readContraFile(value: unknown): ContraFileRecord | null {
  const raw = asRecord(value);
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) return null;
  return {
    name: raw.name.slice(0, 180),
    mime: typeof raw.mime === 'string' ? raw.mime.slice(0, 120) : 'application/octet-stream',
    size: typeof raw.size === 'number' && raw.size >= 0 ? Math.floor(raw.size) : 0,
    extractedText: typeof raw.extractedText === 'string' ? raw.extractedText.slice(0, 20000) : '',
    uploadedAt: typeof raw.uploadedAt === 'string' ? raw.uploadedAt : new Date(0).toISOString(),
  };
}

export function readContraReview(value: unknown): ContraReviewRecord | null {
  const raw = asRecord(value);
  if (!raw || typeof raw.verdict !== 'string' || !REVIEW_VERDICTS.has(raw.verdict as ReviewVerdict)) return null;
  if (!Array.isArray(raw.findings)) return null;

  const findings: ContraFinding[] = [];
  for (const item of raw.findings) {
    const finding = asRecord(item);
    if (!finding || typeof finding.lineId !== 'string') continue;
    if (typeof finding.verdict !== 'string' || !FINDING_VERDICTS.has(finding.verdict as FindingVerdict)) continue;
    const verdict = finding.verdict as FindingVerdict;
    const fileOffer = typeof finding.fileOffer === 'string' ? finding.fileOffer.slice(0, 500) : '';
    const riderAsk = typeof finding.riderAsk === 'string' ? finding.riderAsk.slice(0, 500) : '';
    const suggested = suggestionFor(
      verdict,
      fileOffer,
      typeof finding.suggestedText === 'string' ? finding.suggestedText : ''
    );
    findings.push({
      lineId: finding.lineId,
      sectionTitle: typeof finding.sectionTitle === 'string' ? finding.sectionTitle.slice(0, 160) : finding.lineId,
      verdict,
      riderAsk,
      fileOffer,
      suggestedResponse: suggested.response,
      suggestedText: suggested.text,
    });
  }

  return {
    verdict: raw.verdict as ReviewVerdict,
    summary: typeof raw.summary === 'string' ? raw.summary.slice(0, 600) : '',
    findings,
    reviewedAt: typeof raw.reviewedAt === 'string' ? raw.reviewedAt : new Date(0).toISOString(),
  };
}

export function toPromotorFileViews(files: ContraFileRecord[]): PromotorFileView[] {
  return files.flatMap((file) => {
    const view = toPromotorFileView(file);
    return view ? [view] : [];
  });
}

export function toPromotorFileView(file: ContraFileRecord | null): PromotorFileView | null {
  if (!file) return null;
  return {
    name: file.name,
    mime: file.mime,
    size: file.size,
    uploadedAt: file.uploadedAt,
    hasText: file.extractedText.trim().length > 0,
  };
}

function moduleData(rider: Rider, type: RiderType): RiderModuleData {
  if (rider.type === type) {
    return {
      sections: rider.sections || [],
      channels: rider.channels || [],
      completedSectionIds: rider.completedSectionIds || [],
    };
  }

  const stored = rider.modules?.[type];
  if (stored?.sections?.length) return stored;

  return {
    sections: (RIDER_DATA[type]?.sections || []).map((section) => ({ ...section, content: '' })),
    channels: [],
    completedSectionIds: [],
  };
}

function moduleHasContent(rider: Rider, type: RiderType): boolean {
  const data = rider.type === type
    ? { sections: rider.sections, channels: rider.channels }
    : rider.modules?.[type];
  if (!data) return false;
  const hasText = (data.sections || []).some((section) => (section.content || '').trim().length > 0);
  const hasChannels = (data.channels || []).length > 0;
  return hasText || hasChannels;
}

function readableTypes(rider: Rider): RiderType[] {
  const optional: RiderType[] = ['hospitality', 'seguridad'];
  return ['tecnico', ...optional.filter((type) => moduleHasContent(rider, type))];
}

function sectionPedido(rider: Rider, module: RiderType, section: SectionItem): string {
  const parts: string[] = [];
  const content = (section.content || '').trim();
  if (content) parts.push(content);
  else if (section.subtitle) parts.push(section.subtitle);

  if (module === 'tecnico' && section.id === 'tech-inputlist') {
    const channels = moduleData(rider, 'tecnico').channels || [];
    if (channels.length > 0) {
      const preview = channels
        .slice(0, 8)
        .map((channel) => `${channel.ch} ${channel.name} — ${channel.mic || 'sin micrófono'}`)
        .join('\n');
      const rest = channels.length > 8 ? `\n… y ${channels.length - 8} canales más` : '';
      parts.push(preview + rest);
    }
  }

  if (module === 'tecnico' && section.id === 'tech-stageplot' && rider.stagePlot) {
    const plot = rider.stagePlot;
    parts.push(
      `Tarima ${plot.stageWidth} × ${plot.stageDepth} m, altura ${plot.stageHeight} m. ${plot.elements?.length || 0} elementos en el plano.`
    );
  }

  return parts.join('\n\n') || 'Sin pedido escrito en esta sección.';
}

export function buildContraLines(rider: Rider, answers: Record<string, ContraAnswer>): ContraLine[] {
  return readableTypes(rider).flatMap((module) => {
    const data = moduleData(rider, module);
    return (data.sections || []).map((section) => {
      const id = `${module}:${section.id}`;
      const saved = answers[id];
      return {
        id,
        module,
        moduleLabel: MODULE_LABEL[module],
        sectionId: section.id,
        sectionTitle: section.title,
        pedido: sectionPedido(rider, module, section),
        response: saved?.response || '',
        offer: saved?.offer || '',
        note: saved?.note || '',
      };
    });
  });
}

export function sendBlockReason(lines: Pick<ContraLine, 'response' | 'offer' | 'note'>[]): string | null {
  if (!lines.some((line) => line.response)) {
    return 'Responde al menos un pedido antes de enviar.';
  }
  if (lines.some((line) => line.response === 'alternativa' && !line.offer.trim())) {
    return 'Cada alternativa necesita una oferta.';
  }
  if (lines.some((line) => line.response === 'no_puedo' && !line.note.trim())) {
    return 'Cada “No puedo” necesita una nota.';
  }
  return null;
}

export function answersFromLines(lines: ContraLine[]): Record<string, ContraAnswer> {
  const answers: Record<string, ContraAnswer> = {};
  for (const line of lines) {
    if (!line.response && !line.offer.trim() && !line.note.trim()) continue;
    answers[line.id] = {
      response: line.response,
      offer: line.offer,
      note: line.note,
    };
  }
  return answers;
}

export function sanitizeAnswers(
  input: unknown,
  allowedIds: Set<string>
): Record<string, ContraAnswer> {
  const source = asRecord(input);
  if (!source) return {};

  const answers: Record<string, ContraAnswer> = {};
  for (const [id, value] of Object.entries(source)) {
    if (!allowedIds.has(id)) continue;
    const answer = asRecord(value);
    if (!answer) continue;
    const response = readResponse(answer.response);
    const offer = typeof answer.offer === 'string' ? answer.offer.slice(0, 500) : '';
    const note = typeof answer.note === 'string' ? answer.note.slice(0, 1000) : '';
    if (!response && !offer.trim() && !note.trim()) continue;
    answers[id] = { response, offer, note };
  }
  return answers;
}
