import { RIDER_DATA } from '@/core/constants/rider-templates';
import { Rider } from '@/core/models/Rider';
import {
  ContraAnswer,
  ContraLine,
  ContraResponse,
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

export function emptyContraRecord(): ContraRiderRecord {
  return { status: 'draft', version: 0, sentAt: null, answers: {} };
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
