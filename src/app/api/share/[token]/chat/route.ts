import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AgentRole } from '@/core/types/agent.types';
import { Rider } from '@/core/models/Rider';
import { SYSTEM_PROMPTS, AGENT_PROFILES } from '@/lib/agents/rider-agent';
import {
  answerFromSnapshot,
  buildConsultSystemPrompt,
  buildRiderSnapshot,
} from '@/lib/share/consult';
import { isShareToken } from '@/lib/share/token';
import {
  getRiderByShareToken,
  openConsultChatSession,
  saveChatMessage,
} from '@/lib/services/rider-storage';

const ConsultChatSchema = z.object({
  messages: z.array(z.object({
    role: z.string().optional(),
    content: z.string().max(8000).optional(),
    text: z.string().max(8000).optional(),
  })).max(30).default([]),
  activeAgent: z.enum(['master', 'audio_foh', 'hospitality', 'security']).optional().default('master'),
  sessionId: z.string().optional(),
});

function agentAvatar(role: AgentRole): string {
  if (role === 'audio_foh') return '🎛️';
  if (role === 'hospitality') return '☕';
  if (role === 'security') return '🛡️';
  return '🧠';
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!isShareToken(token)) {
      return NextResponse.json({ error: 'Enlace no disponible' }, { status: 404 });
    }

    const row = await getRiderByShareToken(token);
    if (!row) {
      return NextResponse.json({ error: 'Enlace no disponible' }, { status: 404 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = ConsultChatSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos de mensaje inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { messages, activeAgent, sessionId } = parsed.data;
    const lastMsgObj = messages[messages.length - 1];
    const lastMessage = (lastMsgObj?.content || lastMsgObj?.text || '').trim();
    if (!lastMessage) {
      return NextResponse.json({ error: 'Escribe una pregunta sobre el rider' }, { status: 400 });
    }

    const rider = Rider.fromDatabase(row);
    const snapshot = buildRiderSnapshot(rider);
    const profile = AGENT_PROFILES[activeAgent] || AGENT_PROFILES.master;
    const systemPrompt = buildConsultSystemPrompt(
      SYSTEM_PROMPTS[activeAgent] || SYSTEM_PROMPTS.master,
      snapshot
    );

    const sessionTitle = lastMessage.length > 80 ? `${lastMessage.slice(0, 80)}...` : lastMessage;
    const session = await openConsultChatSession(sessionId, rider.id, sessionTitle, activeAgent);

    await saveChatMessage({
      sessionId: session.id,
      role: 'user',
      content: lastMessage,
    }).catch((err) => console.warn('[Consult] Error saving user message', err));

    let replyText = '';
    let gatewayProvider: 'vercel_ai_gateway' | 'production_expert_engine' = 'production_expert_engine';

    const apiKey = process.env.AI_GATEWAY_API_KEY;
    const baseUrl = process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1';

    if (apiKey) {
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            temperature: 0.3,
            max_tokens: 700,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.slice(-20).map((message) => ({
                role: message.role === 'ai' || message.role === 'assistant' ? 'assistant' : 'user',
                content: message.content || message.text || '',
              })),
            ],
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          replyText = data.choices?.[0]?.message?.content?.trim() || '';
          if (replyText) gatewayProvider = 'vercel_ai_gateway';
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn('[Consult AI Gateway Warning]', errData);
        }
      } catch (gatewayErr) {
        console.warn('[Consult AI Gateway Connection Error]', gatewayErr);
      }
    }

    if (!replyText) {
      replyText = answerFromSnapshot(lastMessage, snapshot);
    }

    await saveChatMessage({
      sessionId: session.id,
      role: 'assistant',
      agentRole: activeAgent,
      roleName: profile.name,
      roleAvatar: agentAvatar(activeAgent),
      content: replyText,
      actions: [],
    }).catch((err) => console.warn('[Consult] Error saving assistant message', err));

    return NextResponse.json({
      sessionId: session.id,
      role: activeAgent,
      roleName: profile.name,
      roleAvatar: agentAvatar(activeAgent),
      message: replyText,
      actions: [],
      gatewayProvider,
    });
  } catch (error: unknown) {
    console.error('[API Consult Chat Error]', error);
    return NextResponse.json({ error: 'No se pudo consultar el rider' }, { status: 500 });
  }
}
