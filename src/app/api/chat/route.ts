import { NextRequest, NextResponse } from 'next/server';
import {
  AgentRole,
  SYSTEM_PROMPTS,
  AGENT_PROFILES,
  generateExpertAgentResponse
} from '@/lib/agents/rider-agent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      riderType = 'tecnico',
      activeAgent = 'master'
    }: {
      messages: { role: string; content: string }[];
      riderType: 'tecnico' | 'hospitality' | 'seguridad';
      activeAgent: AgentRole;
    } = body;

    const lastMessage = messages[messages.length - 1]?.content || '';
    const systemPrompt = SYSTEM_PROMPTS[activeAgent] || SYSTEM_PROMPTS.master;
    const profile = AGENT_PROFILES[activeAgent] || AGENT_PROFILES.master;

    const apiKey = process.env.AI_GATEWAY_API_KEY;
    const baseUrl = process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1';

    // 1. Intentar llamar a Vercel AI Gateway si hay API key configurada
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

          return NextResponse.json({
            role: activeAgent,
            roleName: profile.name,
            roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
            message: replyText,
            gatewayProvider: 'vercel_ai_gateway',
            actions: []
          });
        }

        const errData = await response.json().catch(() => ({}));
        console.warn('[AI Gateway Warning]', errData);

        // Si Vercel AI Gateway requiere tarjeta para créditos libres o devuelve error,
        // usamos el motor de contingencia experto
      } catch (gatewayErr) {
        console.warn('[AI Gateway Connection Error]', gatewayErr);
      }
    }

    // 2. Motor de Agente Experto Inteligente (Fallback transparente sin fallos)
    const fallbackResponse = generateExpertAgentResponse(lastMessage, riderType, activeAgent);
    return NextResponse.json({
      ...fallbackResponse,
      notice: apiKey
        ? 'Vercel AI Gateway activo. (Recuerda verificar tarjeta en vercel.com para desbloquear créditos ilimitados en la nube).'
        : undefined
    });

  } catch (error: any) {
    console.error('[API Chat Error]', error);
    return NextResponse.json(
      { error: 'Error interno al procesar el mensaje con el agente de IA' },
      { status: 500 }
    );
  }
}
