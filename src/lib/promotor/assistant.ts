import { Rider } from '@/core/models/Rider';
import { AgentRole } from '@/core/types/agent.types';
import {
  ContraReviewRecord,
  PromotorFileView,
} from '@/core/types/contra-rider.types';
import { AGENT_PROFILES, SYSTEM_PROMPTS } from '@/lib/agents/rider-agent';
import {
  buildContraLines,
  readStoredContra,
  toPromotorFileView,
} from '@/lib/promotor/contra-rider';
import {
  buildRevisionSystemPrompt,
  catalogLines,
  catalogText,
  emptyFileReply,
  extractContraFile,
  heuristicReview,
  parseModelReview,
} from '@/lib/promotor/revision';
import { readShareLink } from '@/lib/repositories/rider.repository';
import { answerFromSnapshot, buildRiderSnapshot } from '@/lib/share/consult';
import {
  getRiderById,
  openConsultChatSession,
  saveChatMessage,
  saveContraRider,
} from '@/lib/services/rider-storage';

const AGENTS = new Set<AgentRole>(['master', 'audio_foh', 'hospitality', 'security']);

export interface PromotorAssistantPayload {
  reply: string;
  sessionId: string;
  roleName: string;
  roleAvatar: string;
  review: ContraReviewRecord | null;
  file: PromotorFileView | null;
}

type AssistantOutcome =
  | { ok: true; status: 200; payload: PromotorAssistantPayload }
  | { ok: false; status: 400 | 404 | 422; error: string };

function agentAvatar(role: AgentRole): string {
  if (role === 'audio_foh') return '🎛️';
  if (role === 'hospitality') return '☕';
  if (role === 'security') return '🛡️';
  return '🧠';
}

function asAgent(value: unknown): AgentRole {
  return typeof value === 'string' && AGENTS.has(value as AgentRole) ? value as AgentRole : 'master';
}

async function loadOpenShow(showId: string) {
  const row = await getRiderById(showId);
  if (!row || !readShareLink(row)?.enabled) return null;
  return row;
}

async function completeModel(systemPrompt: string, messages: Array<{ role: string; content: string }>, maxTokens: number) {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) return '';
  const baseUrl = process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1';
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-20),
        ],
      }),
    });
    if (!response.ok) {
      console.warn('[Promotor assistant] gateway', response.status);
      return '';
    }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.warn('[Promotor assistant] gateway', error instanceof Error ? error.message : 'error');
    return '';
  }
}

async function rememberTurn(params: {
  sessionId: string | undefined;
  showId: string;
  title: string;
  agent: AgentRole;
  userText: string;
  reply: string;
  review: ContraReviewRecord | null;
}) {
  const profile = AGENT_PROFILES[params.agent] || AGENT_PROFILES.master;
  const session = await openConsultChatSession(params.sessionId, params.showId, params.title, params.agent);
  await saveChatMessage({
    sessionId: session.id,
    role: 'user',
    content: params.userText,
  }).catch((error) => console.warn('[Promotor assistant] mensaje', error instanceof Error ? error.message : 'error'));
  await saveChatMessage({
    sessionId: session.id,
    role: 'assistant',
    agentRole: params.agent,
    roleName: profile.name,
    roleAvatar: agentAvatar(params.agent),
    content: params.reply,
    actions: params.review ? { kind: 'contra-review', review: JSON.parse(JSON.stringify(params.review)) } : [],
  }).catch((error) => console.warn('[Promotor assistant] respuesta', error instanceof Error ? error.message : 'error'));
  return session.id;
}

export async function clearPromotorFile(showId: string): Promise<AssistantOutcome> {
  const row = await loadOpenShow(showId);
  if (!row) return { ok: false, status: 404, error: 'Show no encontrado' };
  const saved = await saveContraRider(showId, { file: null, review: null });
  if (!saved) return { ok: false, status: 404, error: 'Show no encontrado' };
  const stored = readStoredContra(saved.metadata);
  return {
    ok: true,
    status: 200,
    payload: {
      reply: '',
      sessionId: stored.reviewSessionId || '',
      roleName: AGENT_PROFILES.master.name,
      roleAvatar: agentAvatar('master'),
      review: null,
      file: null,
    },
  };
}

export async function reviewPromotorFile(params: {
  showId: string;
  file: File;
  agent: unknown;
  sessionId?: string;
}): Promise<AssistantOutcome> {
  const row = await loadOpenShow(params.showId);
  if (!row) return { ok: false, status: 404, error: 'Show no encontrado' };

  const extracted = await extractContraFile(params.file);
  if (!extracted.ok) return { ok: false, status: 422, error: extracted.error };

  const agent = asAgent(params.agent);
  const rider = Rider.fromDatabase(row);
  const lines = buildContraLines(rider, {});
  const catalog = catalogLines(lines);
  const userText = `Revisa el contra-rider «${params.file.name}».`;
  let reply = emptyFileReply();
  let review: ContraReviewRecord | null = null;

  if (extracted.extracted.text) {
    const snapshot = buildRiderSnapshot(rider);
    const systemPrompt = buildRevisionSystemPrompt(
      SYSTEM_PROMPTS[agent] || SYSTEM_PROMPTS.master,
      snapshot,
      extracted.extracted.text,
      'review',
      catalogText(catalog)
    );
    const modelText = await completeModel(systemPrompt, [{ role: 'user', content: userText }], 2200);
    const parsed = modelText ? parseModelReview(modelText, lines) : null;
    if (parsed?.review) {
      reply = parsed.reply;
      review = parsed.review;
    } else if (parsed?.reply) {
      reply = parsed.reply;
    } else if (!modelText || modelText.trim().startsWith('{')) {
      const fallback = heuristicReview(lines, extracted.extracted.text);
      reply = fallback.reply;
      review = fallback.review;
    } else {
      reply = modelText.slice(0, 4000);
    }
  }

  const uploadedAt = new Date().toISOString();
  const sessionId = await rememberTurn({
    sessionId: params.sessionId,
    showId: params.showId,
    title: 'Revisión contra-rider',
    agent,
    userText,
    reply,
    review,
  });

  const saved = await saveContraRider(params.showId, JSON.parse(JSON.stringify({
    file: {
      name: params.file.name.slice(0, 180),
      mime: params.file.type || 'application/octet-stream',
      size: params.file.size,
      extractedText: extracted.extracted.text,
      uploadedAt,
    },
    review,
    reviewSessionId: sessionId,
  })));
  if (!saved) return { ok: false, status: 404, error: 'Show no encontrado' };

  const profile = AGENT_PROFILES[agent] || AGENT_PROFILES.master;
  return {
    ok: true,
    status: 200,
    payload: {
      reply,
      sessionId,
      roleName: profile.name,
      roleAvatar: agentAvatar(agent),
      review,
      file: toPromotorFileView(readStoredContra(saved.metadata).file),
    },
  };
}

export async function askPromotorAssistant(params: {
  showId: string;
  messages: Array<{ role?: string; content?: string; text?: string }>;
  agent: unknown;
  sessionId?: string;
}): Promise<AssistantOutcome> {
  const row = await loadOpenShow(params.showId);
  if (!row) return { ok: false, status: 404, error: 'Show no encontrado' };

  const last = params.messages[params.messages.length - 1];
  const question = (last?.content || last?.text || '').trim();
  if (!question) return { ok: false, status: 400, error: 'Escribe una pregunta sobre el rider' };

  const agent = asAgent(params.agent);
  const rider = Rider.fromDatabase(row);
  const stored = readStoredContra(row.metadata);
  const snapshot = buildRiderSnapshot(rider);
  const fileText = stored.file?.extractedText || '';
  const history = params.messages.slice(-20).map((message) => ({
    role: message.role === 'ai' || message.role === 'assistant' ? 'assistant' : 'user',
    content: (message.content || message.text || '').slice(0, 4000),
  }));

  const systemPrompt = buildRevisionSystemPrompt(
    SYSTEM_PROMPTS[agent] || SYSTEM_PROMPTS.master,
    snapshot,
    fileText,
    'ask',
    ''
  );
  let reply = await completeModel(systemPrompt, history, 700);
  if (!reply) {
    if (!fileText && /archivo|contra-?rider|pdf|documento adjunto/i.test(question)) {
      reply = 'Todavía no hay un contra-rider con texto. Súbelo en PDF, Word o texto para compararlo con este rider.';
    } else {
      const context = fileText
        ? `${snapshot}\n\n## Contra-rider del recinto\n${fileText.slice(0, 8000)}`
        : snapshot;
      reply = answerFromSnapshot(question, context);
    }
  }

  const sessionId = await rememberTurn({
    sessionId: params.sessionId || stored.reviewSessionId || undefined,
    showId: params.showId,
    title: question.length > 80 ? `${question.slice(0, 80)}...` : question,
    agent,
    userText: question,
    reply,
    review: null,
  });
  await saveContraRider(params.showId, { reviewSessionId: sessionId });

  const profile = AGENT_PROFILES[agent] || AGENT_PROFILES.master;
  return {
    ok: true,
    status: 200,
    payload: {
      reply,
      sessionId,
      roleName: profile.name,
      roleAvatar: agentAvatar(agent),
      review: null,
      file: toPromotorFileView(stored.file),
    },
  };
}
