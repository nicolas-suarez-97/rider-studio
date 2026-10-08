import { NextRequest, NextResponse } from 'next/server';
import {
  AgentRole,
  SYSTEM_PROMPTS,
  AGENT_PROFILES,
  generateExpertAgentResponse
} from '@/lib/agents/rider-agent';
import {
  getOrCreateChatSession,
  saveChatMessage
} from '@/lib/services/rider-storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      riderType = 'tecnico',
      activeAgent = 'master',
      sessionId,
      riderId
    }: {
      messages: { role: string; content?: string; text?: string }[];
      riderType: 'tecnico' | 'hospitality' | 'seguridad';
      activeAgent: AgentRole;
      sessionId?: string;
      riderId?: string;
    } = body;

    const lastMessage = messages[messages.length - 1]?.content || messages[messages.length - 1]?.text || '';
    const systemPrompt = SYSTEM_PROMPTS[activeAgent] || SYSTEM_PROMPTS.master;
    const profile = AGENT_PROFILES[activeAgent] || AGENT_PROFILES.master;

    // 1. Obtener o inicializar la sesión en la base de datos (Supabase)
    const session = await getOrCreateChatSession(
      sessionId,
      riderId,
      `Rider ${riderType.toUpperCase()} - ${profile.name}`,
      activeAgent
    );

    // 2. Persistir mensaje del usuario si existe
    if (lastMessage) {
      await saveChatMessage({
        sessionId: session.id,
        role: 'user',
        content: lastMessage,
      }).catch(err => console.warn('[Error saving user message]', err));
    }

    const apiKey = process.env.AI_GATEWAY_API_KEY;
    const baseUrl = process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1';

    let finalResponse: any = null;

    // 3. Intentar llamar a Vercel AI Gateway si hay API key configurada
    if (apiKey) {
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: [
              { role: 'system', content: `${systemPrompt}\n\nContexto actual: El usuario está editando un Rider de tipo: "${riderType}".` },
              ...messages.map((m: any) => ({
                role: m.role === 'ai' ? 'assistant' : m.role === 'user' ? 'user' : 'user',
                content: m.content || m.text || ''
              }))
            ],
            temperature: 0.6,
            max_tokens: 600,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const replyText = data.choices?.[0]?.message?.content || 'Entendido.';

          finalResponse = {
            sessionId: session.id,
            role: activeAgent,
            roleName: profile.name,
            roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
            message: replyText,
            gatewayProvider: 'vercel_ai_gateway',
            actions: []
          };
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn('[AI Gateway Warning]', errData);
        }
      } catch (gatewayErr) {
        console.warn('[AI Gateway Connection Error]', gatewayErr);
      }
    }

    // 4. Fallback de Agente Experto Inteligente si la llamada a la nube no fue completada
    if (!finalResponse) {
      const fallbackResponse = generateExpertAgentResponse(lastMessage, riderType, activeAgent);
      finalResponse = {
        sessionId: session.id,
        ...fallbackResponse,
        notice: apiKey
          ? 'Vercel AI Gateway activo. (Recuerda verificar tarjeta en vercel.com para desbloquear créditos ilimitados en la nube).'
          : undefined
      };
    }

    // 5. Persistir respuesta del asistente en Supabase
    if (finalResponse?.message) {
      await saveChatMessage({
        sessionId: session.id,
        role: 'assistant',
        agentRole: finalResponse.role,
        roleName: finalResponse.roleName,
        roleAvatar: finalResponse.roleAvatar,
        content: finalResponse.message,
        actions: finalResponse.actions || []
      }).catch(err => console.warn('[Error saving assistant message]', err));
    }

    return NextResponse.json(finalResponse);

  } catch (error: any) {
    console.error('[API Chat Error]', error);
    return NextResponse.json(
      { error: 'Error interno al procesar el mensaje con el agente de IA' },
      { status: 500 }
    );
  }
}
