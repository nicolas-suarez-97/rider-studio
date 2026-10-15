import { NextRequest, NextResponse } from 'next/server';
import {
  SYSTEM_PROMPTS,
  AGENT_PROFILES,
  generateExpertAgentResponse
} from '@/lib/agents/rider-agent';
import { AgentResponse } from '@/core/types/agent.types';
import {
  getOrCreateChatSession,
  saveChatMessage
} from '@/lib/services/rider-storage';
import { SendChatMessageSchema } from '@/lib/validations/chat.schema';
import { parseSuggestionJson, collectSuggestionDrafts } from '@/core/editor/suggestions';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = SendChatMessageSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos de mensaje inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      messages,
      riderType,
      activeAgent,
      sessionId,
      riderId,
      editorContext
    } = parsed.data;

    const lastMsgObj = messages[messages.length - 1];
    const lastMessage = lastMsgObj?.content || lastMsgObj?.text || '';

    const sectionsList = editorContext?.allSections?.length
      ? editorContext.allSections.map((s) => `- ID: "${s.id}", Título: "${s.title}"`).join('\n')
      : editorContext ? `- ID: "${editorContext.sectionId}", Título: "${editorContext.sectionTitle}"` : '';

    const suggestionPrompt = editorContext
      ? `\n\n=== CONTEXTO DEL DOCUMENTO (JSON) ===
Rider: "${editorContext.riderTitle || 'Rider de Producción'}" | Artista: "${editorContext.artistName || 'Sin artista'}" | Tema: "${editorContext.currentTheme || 'studio'}"
Secciones disponibles en el documento:
${sectionsList}

El usuario está ubicado actualmente en la sección "${editorContext.sectionTitle}" (ID: "${editorContext.sectionId}").
Texto actual de esta sección:
"""${editorContext.sectionText}"""
Texto seleccionado por el usuario: """${editorContext.selection}"""
Huecos o pendientes detectados: ${editorContext.gaps.join('; ') || 'ninguno'}.

=== INSTRUCCIONES DE SALIDA ESTRUCTURADA (JSON) ===
Responde SIEMPRE con un objeto JSON válido con la siguiente estructura:
{
  "message": "Explicación clara y concisa en español para el usuario en el chat, describiendo qué se aplicó o respondiendo a su consulta.",
  "suggestions": [
    {
      "kind": "insert" | "replace" | "delete" | "add_section" | "add_channel" | "switch_theme" | "switch_type",
      "sectionId": "ID de la sección a editar (ej. '${editorContext.sectionId}' u otro ID de la lista de secciones)",
      "newSectionTitle": "Título de la nueva sección si kind es 'add_section'",
      "theme": "classic" | "modern" | "minimal" | "technical" | "festival" | "studio",
      "baseText": "fragmento literal exacto del texto existente para reemplazar o borrar, o vacío para insertar al final",
      "proposedText": "texto o contenido con formato de rider que se agregará o reemplazará",
      "rationale": "motivo técnico o breve explicación del cambio para el banner visual de confirmación",
      "channel": { "name": "Voz Principal", "mic": "Shure Beta 58A", "stand": "Pie jirafa" }
    }
  ]
}

Reglas importantes:
1. Si el usuario pide añadir o redactar requerimientos, agrega las sugerencias correspondientes indicando el sectionId adecuado.
2. Si el usuario hace una pregunta puramente conversacional o informativa sin pedir cambios, deja "suggestions": [] y responde en "message".
3. Dentro de "proposedText", puedes estructurar contenido profesional de rider usando estas marcas:
   [[requisito:Etiqueta]]
   texto del requisito
   [[aviso:nota]] o [[aviso:obligatorio]] o [[aviso:veto]]
   texto del aviso
   [[tiers]]
   preferido | alternativa | no aceptado
   [[contactos]]
   Rol | Nombre | Teléfono | Correo
   [[columnas]]
   columna izquierda
   ---
   columna derecha
   Los párrafos normales van sin marcas especiales.
4. Tu respuesta debe ser ÚNICAMENTE el objeto JSON sin texto antes ni después.`
      : '';
    const profile = AGENT_PROFILES[activeAgent] || AGENT_PROFILES.master;
    const systemPrompt = `${SYSTEM_PROMPTS[activeAgent] || SYSTEM_PROMPTS.master}${suggestionPrompt}`;

    const sessionTitle = lastMessage
      ? (lastMessage.length > 36 ? lastMessage.substring(0, 36) + '...' : lastMessage)
      : `Rider ${riderType.toUpperCase()} - ${profile.name}`;

    // 1. Obtener o inicializar la sesión en la base de datos (Supabase)
    const session = await getOrCreateChatSession(
      sessionId,
      riderId,
      sessionTitle,
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

    let finalResponse: AgentResponse | null = null;

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
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: `${systemPrompt}\n\nContexto actual: El usuario está editando un Rider de tipo: "${riderType}". Recuerda responder SIEMPRE en formato JSON válido.` },
              ...messages.map((m) => ({
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.content || m.text || ''
              }))
            ],
            temperature: 0.3,
            max_tokens: editorContext ? 1200 : 600,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const replyRaw = data.choices?.[0]?.message?.content || '{}';
          const parsed = parseSuggestionJson(replyRaw);
          const replyText = parsed?.message || 'He procesado tu solicitud en el documento.';
          const suggestions = parsed?.suggestions || [];

          finalResponse = {
            sessionId: session.id,
            role: activeAgent,
            roleName: profile.name,
            roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
            message: replyText,
            suggestions,
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

    if (finalResponse && editorContext && (!finalResponse.suggestions || finalResponse.suggestions.length === 0)) {
      finalResponse.suggestions = collectSuggestionDrafts(finalResponse.message, finalResponse.actions, editorContext);
      const parsed = parseSuggestionJson(finalResponse.message);
      if (parsed?.message) finalResponse.message = parsed.message;
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
        actions: (finalResponse.actions || []) as unknown as Parameters<typeof saveChatMessage>[0]['actions']
      }).catch(err => console.warn('[Error saving assistant message]', err));
    }

    return NextResponse.json(finalResponse);

  } catch (error: unknown) {
    console.error('[API Chat Error]', error);
    return NextResponse.json(
      { error: 'Error interno al procesar el mensaje con el agente de IA' },
      { status: 500 }
    );
  }
}
