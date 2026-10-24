import { AgentAction, AgentSuggestionDraft } from '@/core/types/agent.types';
import { RiderType } from '@/core/types/rider.types';
import { DocumentSuggestion, EditorContextPayload } from '@/core/types/suggestion.types';

const RIDER_TYPES = new Set<RiderType>(['tecnico', 'hospitality', 'seguridad']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function unwrapJsonFence(text: string): string {
  const jsonFence = text.match(/```json\s*([\s\S]*?)```/i);
  if (jsonFence?.[1]?.trim()) return jsonFence[1].trim();
  const generic = text.match(/```\s*([\s\S]*?)```/);
  if (generic?.[1]?.trim().startsWith('{')) return generic[1].trim();
  return text;
}

function escapeRawControlCharsInJsonStrings(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (!inString) {
      out += ch;
      if (ch === '"') inString = true;
      continue;
    }
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      out += ch;
      inString = false;
      continue;
    }
    if (ch === '\n') {
      out += '\\n';
      continue;
    }
    if (ch === '\r') {
      out += '\\r';
      continue;
    }
    if (ch === '\t') {
      out += '\\t';
      continue;
    }
    out += ch;
  }
  return out;
}

function unwrapMarkdownFencesForDisplay(message: string): string {
  const trimmed = message.trim();
  const onlyFence = trimmed.match(/^```(?:markdown|md|text)?\s*\n?([\s\S]*?)\n?```$/i);
  if (onlyFence?.[1] != null) return onlyFence[1].trim();
  return trimmed.replace(/```(?:markdown|md|text)\s*\n?([\s\S]*?)\n?```/gi, (_, inner: string) => inner.trim());
}

function messageFromRecord(data: Record<string, unknown>): string {
  return typeof data.message === 'string'
    ? data.message
    : typeof data.response === 'string'
      ? data.response
      : typeof data.reply === 'string'
        ? data.reply
        : typeof data.text === 'string'
          ? data.text
          : typeof data.content === 'string'
            ? data.content
            : '';
}

function extractQuotedField(raw: string, field: string): string | null {
  const match = new RegExp(`"${field}"\\s*:\\s*"`).exec(raw);
  if (!match) return null;
  let i = match.index + match[0].length;
  let out = '';
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\' && i + 1 < raw.length) {
      const next = raw[i + 1];
      if (next === 'n') out += '\n';
      else if (next === 'r') out += '\n';
      else if (next === 't') out += '\t';
      else if (next === '"' || next === '\\' || next === '/') out += next;
      else out += next;
      i += 2;
      continue;
    }
    if (ch === '"') break;
    out += ch;
    i += 1;
  }
  return out;
}

function extractJsonArraySlice(raw: string, field: string): unknown[] {
  const header = new RegExp(`"${field}"\\s*:\\s*`).exec(raw);
  if (!header) return [];
  const start = header.index + header[0].length;
  if (raw[start] !== '[') return [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(escapeRawControlCharsInJsonStrings(raw.slice(start, i + 1)));
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

function draftsFromUnknownList(list: unknown[]): AgentSuggestionDraft[] {
  const suggestions: AgentSuggestionDraft[] = [];
  const validKinds = new Set([
    'insert',
    'replace',
    'delete',
    'add_channel',
    'switch_type',
    'add_section',
    'switch_theme'
  ]);

  for (const item of list) {
    if (!isRecord(item)) continue;
    const kind = item.kind;
    if (typeof kind !== 'string' || !validKinds.has(kind)) continue;

    let channel: { name: string; mic?: string; stand?: string } | undefined;
    if (isRecord(item.channel) && typeof item.channel.name === 'string') {
      channel = {
        name: item.channel.name,
        mic: typeof item.channel.mic === 'string' ? item.channel.mic : undefined,
        stand: typeof item.channel.stand === 'string' ? item.channel.stand : undefined,
      };
    }

    const rawProposed =
      typeof item.proposedText === 'string' ? item.proposedText :
      typeof item.content === 'string' ? item.content :
      typeof item.text === 'string' ? item.text :
      typeof item.proposedContent === 'string' ? item.proposedContent :
      typeof item.proposal === 'string' ? item.proposal :
      typeof item.value === 'string' ? item.value :
      typeof item.markdown === 'string' ? item.markdown :
      typeof item.body === 'string' ? item.body :
      typeof item.draft === 'string' ? item.draft :
      '';

    const rawBase =
      typeof item.baseText === 'string' ? item.baseText :
      typeof item.base === 'string' ? item.base :
      typeof item.targetText === 'string' ? item.targetText :
      typeof item.originalText === 'string' ? item.originalText :
      typeof item.target === 'string' ? item.target :
      '';

    const rawRationale =
      typeof item.rationale === 'string' ? item.rationale :
      typeof item.reason === 'string' ? item.reason :
      typeof item.description === 'string' ? item.description :
      typeof item.motivo === 'string' ? item.motivo :
      '';

    suggestions.push({
      kind: kind as AgentSuggestionDraft['kind'],
      sectionId: typeof item.sectionId === 'string' && item.sectionId.trim() ? item.sectionId.trim() : undefined,
      newSectionTitle: typeof item.newSectionTitle === 'string' && item.newSectionTitle.trim() ? item.newSectionTitle.trim() : undefined,
      theme: typeof item.theme === 'string' && item.theme.trim() ? item.theme.trim() : undefined,
      baseText: rawBase.slice(0, 2000),
      proposedText: rawProposed.slice(0, 6000),
      rationale: rawRationale.slice(0, 500),
      channel,
      riderType: typeof item.riderType === 'string' ? item.riderType : undefined,
    });
  }
  return suggestions;
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  for (const candidate of [slice, escapeRawControlCharsInJsonStrings(slice)]) {
    try {
      const data = JSON.parse(candidate) as unknown;
      if (isRecord(data)) return data;
    } catch {
      // try next candidate
    }
  }
  return null;
}

export function looksLikeAgentJsonEnvelope(raw: string): boolean {
  const text = (raw || '').trim();
  if (!text.startsWith('{')) return false;
  return /"(?:message|response|reply|text|content)"\s*:/.test(text);
}

export function parseSuggestionJson(raw: string): { message: string; suggestions: AgentSuggestionDraft[] } | null {
  const text = unwrapJsonFence((raw || '').trim());
  if (!text) return null;

  const data = parseJsonObject(text);
  if (data) {
    return {
      message: unwrapMarkdownFencesForDisplay(messageFromRecord(data)),
      suggestions: draftsFromUnknownList(Array.isArray(data.suggestions) ? data.suggestions : []),
    };
  }

  if (!looksLikeAgentJsonEnvelope(text) && !/"(?:message|suggestions)"\s*:/.test(text)) {
    return null;
  }

  const message = unwrapMarkdownFencesForDisplay(
    extractQuotedField(text, 'message')
    || extractQuotedField(text, 'response')
    || extractQuotedField(text, 'reply')
    || extractQuotedField(text, 'text')
    || extractQuotedField(text, 'content')
    || ''
  );
  const suggestions = draftsFromUnknownList(extractJsonArraySlice(text, 'suggestions'));
  if (!message && suggestions.length === 0) return null;
  return { message, suggestions };
}

export function suggestionsFromActions(
  actions: AgentAction[] | undefined,
  context: EditorContextPayload
): AgentSuggestionDraft[] {
  const drafts: AgentSuggestionDraft[] = [];
  for (const action of actions || []) {
    if (action.type === 'update_section' && isRecord(action.payload)) {
      const note = typeof action.payload.note === 'string' ? action.payload.note : '';
      if (!note) continue;
      const sectionId = typeof action.payload.sectionId === 'string' ? action.payload.sectionId : context.sectionId;
      drafts.push({
        kind: 'insert',
        sectionId,
        baseText: '',
        proposedText: note,
        rationale: 'El asistente propone añadir este requerimiento.',
      });
    }
    if (action.type === 'add_section' && isRecord(action.payload)) {
      const title = typeof action.payload.title === 'string' ? action.payload.title : 'Nueva Sección';
      const content = typeof action.payload.content === 'string' ? action.payload.content : '';
      drafts.push({
        kind: 'add_section',
        newSectionTitle: title,
        proposedText: content,
        rationale: `Crear la sección "${title}".`,
      });
    }
    if (action.type === 'switch_theme' && typeof action.payload === 'string') {
      drafts.push({
        kind: 'switch_theme',
        sectionId: context.sectionId,
        theme: action.payload,
        proposedText: action.payload,
        rationale: `Cambiar tema del documento a ${action.payload}.`,
      });
    }
    if (action.type === 'add_input_channel' && isRecord(action.payload)) {
      const source = typeof action.payload.source === 'string' ? action.payload.source : '';
      const nameField = typeof action.payload.name === 'string' ? action.payload.name : '';
      const mic = typeof action.payload.mic === 'string' ? action.payload.mic : '';
      const transducer = typeof action.payload.transducer === 'string' ? action.payload.transducer : '';
      const stand = typeof action.payload.stand === 'string' ? action.payload.stand : '';
      const name = source || nameField || 'Nuevo canal';
      drafts.push({
        kind: 'add_channel',
        sectionId: 'tech-inputlist',
        baseText: '',
        proposedText: [name, mic || transducer, stand].filter(Boolean).join(' · '),
        rationale: 'Agregar este canal a la Input List.',
        channel: {
          name,
          mic: mic || transducer || 'Shure SM58',
          stand: stand || 'Pie standard',
        },
      });
    }
    if (action.type === 'switch_rider_type' && typeof action.payload === 'string' && RIDER_TYPES.has(action.payload as RiderType)) {
      drafts.push({
        kind: 'switch_type',
        sectionId: context.sectionId,
        baseText: '',
        proposedText: action.payload,
        rationale: `Cambiar el módulo del rider a ${action.payload}.`,
        riderType: action.payload,
      });
    }
  }
  return drafts;
}

export function collectSuggestionDrafts(
  message: string,
  actions: AgentAction[] | undefined,
  context: EditorContextPayload
): AgentSuggestionDraft[] {
  const parsed = parseSuggestionJson(message);
  if (parsed && parsed.suggestions.length > 0) {
    return parsed.suggestions.map((draft) => ({
      ...draft,
      sectionId: draft.sectionId || context.sectionId,
    }));
  }

  const fromActions = suggestionsFromActions(actions, context);
  if (fromActions.length > 0) return fromActions;

  return [];
}

export function materializeSuggestions(
  drafts: AgentSuggestionDraft[],
  context: EditorContextPayload
): DocumentSuggestion[] {
  return drafts.map((draft) => {
    const sectionId = draft.sectionId || context.sectionId;
    let baseText = draft.baseText || '';
    let kind = draft.kind;
    if (!baseText && context.selection && (kind === 'replace' || kind === 'delete')) {
      baseText = context.selection;
    }
    const riderType = draft.riderType && RIDER_TYPES.has(draft.riderType as RiderType)
      ? (draft.riderType as RiderType)
      : undefined;
    return {
      id: `agent-${crypto.randomUUID()}`,
      sectionId,
      kind,
      baseText,
      proposedText: draft.proposedText || '',
      rationale: draft.rationale || 'Propuesta del asistente.',
      status: 'pending',
      source: 'agent',
      channel: draft.channel,
      riderType,
      newSectionTitle: draft.newSectionTitle,
      theme: draft.theme as any,
    };
  });
}
