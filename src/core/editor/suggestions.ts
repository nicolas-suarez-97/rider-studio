import { AgentAction, AgentSuggestionDraft } from '@/core/types/agent.types';
import { RiderType } from '@/core/types/rider.types';
import { DocumentSuggestion, EditorContextPayload } from '@/core/types/suggestion.types';

const RIDER_TYPES = new Set<RiderType>(['tecnico', 'hospitality', 'seguridad']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseSuggestionJson(raw: string): { message: string; suggestions: AgentSuggestionDraft[] } | null {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    const data = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!isRecord(data)) return null;
    const message = typeof data.message === 'string' ? data.message : '';
    const list = Array.isArray(data.suggestions) ? data.suggestions : [];
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

      suggestions.push({
        kind: kind as AgentSuggestionDraft['kind'],
        sectionId: typeof item.sectionId === 'string' && item.sectionId.trim() ? item.sectionId.trim() : undefined,
        newSectionTitle: typeof item.newSectionTitle === 'string' && item.newSectionTitle.trim() ? item.newSectionTitle.trim() : undefined,
        theme: typeof item.theme === 'string' && item.theme.trim() ? item.theme.trim() : undefined,
        baseText: typeof item.baseText === 'string' ? item.baseText.slice(0, 2000) : '',
        proposedText: typeof item.proposedText === 'string' ? item.proposedText.slice(0, 6000) : '',
        rationale: typeof item.rationale === 'string' ? item.rationale.slice(0, 500) : '',
        channel,
        riderType: typeof item.riderType === 'string' ? item.riderType : undefined,
      });
    }
    return { message, suggestions };
  } catch {
    return null;
  }
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

  const prompt = message.trim();
  const chatty = /entendido|sincroniz|analizado|puedes pedirme|error de conexión/i.test(prompt);
  if (!chatty && context.selection && context.sectionText.includes(context.selection)) {
    return [{
      kind: 'replace',
      sectionId: context.sectionId,
      baseText: context.selection,
      proposedText: prompt,
      rationale: 'Propuesta para el texto seleccionado.',
    }];
  }

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
    if (baseText && !context.sectionText.includes(baseText) && sectionId === context.sectionId) {
      if (context.selection && context.sectionText.includes(context.selection)) {
        kind = 'replace';
        baseText = context.selection;
      } else {
        kind = kind === 'delete' ? 'delete' : 'insert';
        baseText = '';
      }
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
