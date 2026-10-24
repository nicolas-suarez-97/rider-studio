export interface ChatSuggestionDraft {
  kind: 'insert' | 'replace' | 'delete' | 'add_channel' | 'switch_type' | 'add_section' | 'switch_theme';
  sectionId?: string;
  newSectionTitle?: string;
  theme?: string;
  baseText?: string;
  proposedText?: string;
  rationale?: string;
  channel?: { name: string; mic?: string; stand?: string };
  riderType?: string;
}

function newSectionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `section-${crypto.randomUUID()}`;
  }
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface RiderBlockRef {
  id: string;
  title: string;
}

export interface ChatDocumentSyncInput {
  userText: string;
  priorAssistantText: string;
  suggestions: ChatSuggestionDraft[];
  sections: RiderBlockRef[];
  activeSectionId?: string;
  priorAssistantIsError?: boolean;
  priorAssistantNotice?: string;
}

export interface ChatDocumentSyncResult {
  suggestions: ChatSuggestionDraft[];
  error?: string;
}

export interface ChatDocumentApplyPlan {
  action: 'apply' | 'create_section' | 'fail';
  sectionId: string;
  newSectionTitle?: string;
  draft: ChatSuggestionDraft;
  error?: string;
}

const TRANSFER_INTENT =
  /(?:añade|anade|agrega|pon|incluye|inserta|pasa|pásalo|pasalo|incorpora|lleva|copia|mueve|aplica)\s+(?:esto|eso|lo|este\s+contenido|esta\s+redacción|esta\s+redaccion|el\s+contenido|el\s+texto|esta\s+respuesta).{0,60}(?:al\s+rider|en\s+el\s+rider|al\s+documento|en\s+el\s+documento|al\s+texto)/i;

const TRANSFER_CLITIC =
  /(?:añáde(?:lo|la)|anade(?:lo|la)|agré(?:galo|gala)|agrega(?:lo|la)|pon(?:lo|la)|inclúye(?:lo|la)|incluye(?:lo|la)|insérta(?:lo|la)|inserta(?:lo|la)|pásalo|pasalo|incorpóralo|incorporalo).{0,40}(?:rider|documento)/i;

const TRANSFER_FAIL =
  'No pude pasar el contenido al rider. No hay un texto previo para transferir o no pude resolver el bloque. El documento no se modificó.';

const APPLY_EMPTY_FAIL =
  'No pude aplicar el cambio al documento: la instrucción no incluye contenido para insertar. El resto de apartados se mantiene.';

export function isSparseEditorContext(ctx?: {
  sectionId?: string;
  sectionText?: string;
  allSections?: unknown[];
}): boolean {
  if (!ctx) return false;
  const hasSection = (ctx.allSections || []).length > 0;
  return !hasSection && !(ctx.sectionId || '').trim() && !(ctx.sectionText || '').trim();
}

export function shouldUseDocumentJsonMode(ctx?: {
  sectionId?: string;
  sectionText?: string;
  allSections?: unknown[];
}): boolean {
  return Boolean(ctx) && !isSparseEditorContext(ctx);
}

const AI_SERVICE_ERROR =
  /no se pudo obtener una respuesta del servicio de ia/i;

const AI_ERROR_NOTICE =
  /no se pudo obtener una respuesta del servicio de ia|el chat de ia no tiene credenciales|token de ia no detectado|no se encontraron credenciales de ia|ai_gateway_api_key|openai_api_key|vercel_oidc_token|copiloto local|la nube de ia no respondi[oó]|could not get a response from the ai|missing (?:ai_|openai_)?api[_ ]?key|no ai credentials|ai (?:service|gateway) (?:error|unavailable|failed|not configured)|configura (?:ai_gateway|openai_api)/i;

export function isNonTransferableAssistantNotice(
  text?: string,
  meta?: { isError?: boolean; notice?: string }
): boolean {
  if (meta?.isError) return true;
  if (AI_ERROR_NOTICE.test((text || '').trim())) return true;
  return AI_ERROR_NOTICE.test((meta?.notice || '').trim());
}

export function chatReplyAfterDocumentApply(input: {
  aiText: string;
  isError?: boolean;
  applied: boolean;
}): { text: string; isError: boolean } {
  if (input.applied) {
    const looksLikeServiceError = Boolean(input.isError) || AI_SERVICE_ERROR.test(input.aiText || '');
    if (looksLikeServiceError || !(input.aiText || '').trim()) {
      return {
        text: 'He pasado el contenido al documento. Revisa el bloque y confirma o deshaz el cambio.',
        isError: false,
      };
    }
    return { text: input.aiText, isError: false };
  }
  return {
    text: input.aiText,
    isError: Boolean(input.isError),
  };
}

export function isExplicitRiderTransferIntent(prompt: string): boolean {
  const text = (prompt || '').trim();
  if (!text) return false;
  return TRANSFER_INTENT.test(text) || TRANSFER_CLITIC.test(text);
}

export function extractTransferableRiderText(raw: string): string {
  const text = (raw || '').trim();
  if (!text || isNonTransferableAssistantNotice(text)) return '';

  const withoutFooter = text
    .replace(/(?:^|\n)\s*💡[\s\S]*$/u, '')
    .replace(/(?:^|\n)\s*\*Si deseas[\s\S]*$/i, '')
    .replace(/(?:^|\n)\s*Si deseas que[\s\S]*$/i, '')
    .trim();

  const source = withoutFooter || text;
  const fence = source.match(/```(?:markdown|md|text)?\s*([\s\S]*?)```/i);
  if (fence?.[1]?.trim()) return fence[1].trim();

  const dash = source.match(/---\s*([\s\S]*?)\s*---/);
  if (dash?.[1] && dash[1].trim().length > 10) return dash[1].trim();

  return source;
}

export function resolveStableBlock(
  ref: string | undefined,
  sections: RiderBlockRef[]
): RiderBlockRef | null {
  const target = (ref || '').trim();
  if (!target || sections.length === 0) return null;

  const exactId = sections.find((section) => section.id === target);
  if (exactId) return exactId;

  const lowered = target.toLowerCase();
  const exactTitle = sections.find((section) => section.title.trim().toLowerCase() === lowered);
  if (exactTitle) return exactTitle;

  return null;
}

function hasUsableProposedText(draft: ChatSuggestionDraft): boolean {
  if (draft.kind === 'delete') return Boolean((draft.baseText || '').trim());
  if (draft.kind === 'switch_theme' || draft.kind === 'switch_type' || draft.kind === 'add_channel') {
    return true;
  }
  return Boolean((draft.proposedText || '').trim());
}

function defaultSectionTitle(text: string): string {
  const heading = text.match(/^\s*#{1,4}\s+(.+)$/m);
  if (heading?.[1]?.trim()) return heading[1].trim().replace(/\*+/g, '').slice(0, 80);
  const bold = text.match(/\*\*([^*]+)\*\*/);
  if (bold?.[1]?.trim()) return bold[1].trim().slice(0, 80);
  return 'Requerimientos';
}

function normalizeSuggestion(
  draft: ChatSuggestionDraft,
  sections: RiderBlockRef[],
  activeSectionId?: string
): ChatSuggestionDraft {
  const resolved = resolveStableBlock(draft.sectionId, sections)
    || resolveStableBlock(activeSectionId, sections);
  if (!resolved) return draft;
  return { ...draft, sectionId: resolved.id };
}

export function ensureChatDocumentSuggestions(input: ChatDocumentSyncInput): ChatDocumentSyncResult {
  const usable = (input.suggestions || [])
    .filter(hasUsableProposedText)
    .filter((draft) => !isNonTransferableAssistantNotice(draft.proposedText || ''))
    .map((draft) => (
    normalizeSuggestion(draft, input.sections, input.activeSectionId)
  ));

  if (usable.length > 0) {
    return { suggestions: usable };
  }

  if (!isExplicitRiderTransferIntent(input.userText)) {
    return { suggestions: input.suggestions || [] };
  }

  if (isNonTransferableAssistantNotice(input.priorAssistantText, {
    isError: input.priorAssistantIsError,
    notice: input.priorAssistantNotice,
  })) {
    return { suggestions: [], error: TRANSFER_FAIL };
  }

  const proposedText = extractTransferableRiderText(input.priorAssistantText);
  if (!proposedText) {
    return { suggestions: [], error: TRANSFER_FAIL };
  }

  const active = resolveStableBlock(input.activeSectionId, input.sections);
  if (active) {
    return {
      suggestions: [{
        kind: 'insert',
        sectionId: active.id,
        baseText: '',
        proposedText,
        rationale: 'Transferir el contenido del chat al bloque del rider.',
      }],
    };
  }

  return {
    suggestions: [{
      kind: 'add_section',
      newSectionTitle: defaultSectionTitle(proposedText),
      baseText: '',
      proposedText,
      rationale: 'Crear un bloque nuevo para transferir el contenido del chat.',
    }],
  };
}

export function planChatDocumentApply(input: {
  draft: ChatSuggestionDraft;
  sections: RiderBlockRef[];
  activeSectionId?: string;
}): ChatDocumentApplyPlan {
  const draft = input.draft;

  if (draft.kind === 'switch_theme' || draft.kind === 'switch_type' || draft.kind === 'add_channel') {
    return {
      action: 'apply',
      sectionId: draft.sectionId || input.activeSectionId || '',
      draft,
    };
  }

  if (isNonTransferableAssistantNotice(draft.proposedText || '')) {
    return { action: 'fail', sectionId: draft.sectionId || '', draft, error: APPLY_EMPTY_FAIL };
  }

  if (draft.kind === 'add_section') {
    const title = (draft.newSectionTitle || defaultSectionTitle(draft.proposedText || '')).trim();
    if (!title) {
      return { action: 'fail', sectionId: '', draft, error: APPLY_EMPTY_FAIL };
    }
    return {
      action: 'create_section',
      sectionId: newSectionId(),
      newSectionTitle: title,
      draft: { ...draft, newSectionTitle: title },
    };
  }

  if (draft.kind !== 'delete' && !hasUsableProposedText(draft)) {
    return { action: 'fail', sectionId: draft.sectionId || '', draft, error: APPLY_EMPTY_FAIL };
  }

  const requested = (draft.sectionId || '').trim();
  const resolved = requested
    ? resolveStableBlock(requested, input.sections)
    : resolveStableBlock(input.activeSectionId, input.sections);

  if (resolved) {
    return {
      action: 'apply',
      sectionId: resolved.id,
      draft: { ...draft, sectionId: resolved.id },
    };
  }

  const title = (draft.newSectionTitle || defaultSectionTitle(draft.proposedText || 'Requerimientos')).trim();
  return {
    action: 'create_section',
    sectionId: newSectionId(),
    newSectionTitle: title,
    draft: { ...draft, kind: draft.kind === 'delete' ? 'insert' : draft.kind, newSectionTitle: title },
  };
}
