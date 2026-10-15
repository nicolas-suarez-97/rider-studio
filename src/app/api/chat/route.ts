import { NextRequest, NextResponse } from 'next/server';
import {
  SYSTEM_PROMPTS,
  AGENT_PROFILES,
  generateExpertAgentResponse
} from '@/lib/agents/rider-agent';
import { AgentResponse, AgentSuggestionDraft } from '@/core/types/agent.types';
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

=== REGLA FUNDAMENTAL: ¿CONSULTA O MODIFICACIÓN? ===
Debes clasificar el último mensaje del usuario en una de estas dos categorías antes de responder:

CASO 1: CONSULTA O CONVERSACIÓN INFORMATIVA (NO MODIFICAR EL DOCUMENTO)
Aplica SIEMPRE que el usuario:
- Hace una pregunta o duda técnica (ej: "¿Qué consola me recomiendas?", "¿Por qué se pide late check-out?", "¿Es suficiente este equipo?").
- Pide tu opinión, recomendaciones, ideas o comparativas (ej: "¿Qué opinas de esta sección?", "¿Qué micrófonos son mejores?", "Recomiéndame opciones").
- Pide explicaciones o análisis técnicos (ej: "Explícame qué es FOH", "¿Cómo funciona el backline?", "Analiza si este rider es viable").
- Saluda, agradece o conversa de forma general.
-> ACCIÓN ESTRICTA:
   1. Responde de forma completa, profesional, conversacional y detallada con Markdown en el campo "message".
   2. DEBES DEVOLVER OBLIGATORIAMENTE "suggestions": [].
   3. ESTÁ TOTALMENTE PROHIBIDO modificar el documento o crear sugerencias cuando el usuario solo está consultando o preguntando.

CASO 2: ORDEN DIRECTA DE EDICIÓN (MODIFICAR EL DOCUMENTO)
Aplica ÚNICAMENTE cuando el usuario ordene explícitamente ejecutar un cambio en el documento mediante verbos imperativos como: "agrega...", "modifica...", "cambia...", "pon...", "reemplaza...", "elimina...", "quita...", "inserta...", "escribe un requisito sobre...":
-> ACCIÓN:
   1. Si es modificar o actualizar texto existente (o si el usuario seleccionó texto):
      * kind: "replace"
      * "baseText": fragmento exacto que se reemplaza
      * "proposedText": nueva versión completa
   2. Si es agregar un nuevo requerimiento sin alterar lo existente:
      * kind: "insert"
      * "baseText": ""
   3. Si es borrar:
      * kind: "delete"
      * "baseText": fragmento a borrar
      * "proposedText": ""
   4. En "message": describe brevemente en 1 línea qué cambio aplicaste en el documento.

=== FORMATO DE RESPUESTA JSON ===
Responde SIEMPRE con un objeto JSON válido:
{
  "message": "Tu respuesta al usuario en español enriquecida con Markdown.",
  "suggestions": [
    // Lista vacía [] SIEMPRE que sea una consulta, duda, pregunta o análisis.
    // Solo incluir objetos de sugerencia cuando el usuario ordenó explícitamente editar el documento.
  ]
}

Dentro de "proposedText" (solo cuando aplique una modificación), puedes usar:
- Subtítulos: "### Subtítulo"
- Listas con negrita: "- **Parámetro:** Valor requerido"
- Bloques de rider: [[requisito:Nombre]], [[aviso:obligatorio|nota|veto]], [[tiers]], [[contactos]], [[columnas]].

Tu respuesta debe ser ÚNICAMENTE el objeto JSON sin texto antes ni después.`
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
        const bodyPayload: Record<string, unknown> = {
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: editorContext
                ? `${systemPrompt}\n\nContexto actual: El usuario está editando un Rider de tipo: "${riderType}". Recuerda responder SIEMPRE en formato JSON válido.`
                : `${systemPrompt}\n\nContexto actual: El usuario está consultando sobre un Rider de tipo: "${riderType}". Responde en español de forma profesional, cordial, experta y enriquecida con markdown.`
            },
            ...messages.map((m) => ({
              role: m.role === 'ai' ? 'assistant' : 'user',
              content: m.content || m.text || ''
            }))
          ],
          temperature: editorContext ? 0.3 : 0.7,
          max_tokens: editorContext ? 1200 : 700,
        };

        if (editorContext) {
          bodyPayload.response_format = { type: 'json_object' };
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(bodyPayload),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const replyRaw = data.choices?.[0]?.message?.content || '';

          let replyText = replyRaw;
          let suggestions: AgentSuggestionDraft[] = [];

          if (editorContext) {
            const parsed = parseSuggestionJson(replyRaw);
            if (parsed) {
              if (parsed.message) replyText = parsed.message;
              suggestions = parsed.suggestions;
            }
          }

          if (!replyText.trim()) {
            replyText = 'Entendido. ¿En qué más puedo orientarte sobre la producción de tu show o rider?';
          }

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
      const fallbackResponse = generateExpertAgentResponse(lastMessage, riderType, activeAgent, editorContext);
      finalResponse = {
        sessionId: session.id,
        ...fallbackResponse,
        notice: apiKey
          ? 'Vercel AI Gateway activo. (Recuerda verificar tarjeta en vercel.com para desbloquear créditos ilimitados en la nube).'
          : undefined
      };
    }

    if (finalResponse && editorContext && finalResponse.suggestions === undefined) {
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
