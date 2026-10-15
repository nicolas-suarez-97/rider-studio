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
import { callAiCompletion, getAiDiagnostics } from '@/lib/ai/ai-provider';

export async function GET() {
  const diagnostics = getAiDiagnostics();
  return NextResponse.json({
    status: 'ok',
    aiDiagnostics: diagnostics,
  });
}

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
Texto seleccionado por el usuario en el editor: """${editorContext.selection}"""
Huecos o pendientes detectados: ${editorContext.gaps.join('; ') || 'ninguno'}.

=== DIRECTIVA FUNDAMENTAL DE CONTROL DEL DOCUMENTO ===
TÚ TIENES CONTROL TOTAL Y DIRECTO PARA MODIFICAR EL DOCUMENTO A TRAVÉS DEL CAMPO 'suggestions'.
NUNCA digas "no tengo capacidad de editar documentos directamente", ni le pidas al usuario que copie y pegue.
El documento se edita automáticamente cuando incluyes objetos dentro de "suggestions".

=== REGLA DE CLASIFICACIÓN: ¿CONSULTA O MODIFICACIÓN? ===
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

CASO 2: ORDEN DIRECTA DE EDICIÓN O ELIMINACIÓN (MODIFICAR EL DOCUMENTO)
Aplica cuando el usuario ordene explícitamente ejecutar un cambio en el documento o cuando use formatos de selección:
- Formatos sobre texto seleccionado:
  * Modificar "<texto>": <instrucción>
  * Sobre "<texto>": <instrucción>
  * Ajustar "<texto>": <instrucción>
  -> Si la instrucción dice "eliminalo", "eliminar", "borra", "quita" -> OBLIGATORIO kind: "delete", "baseText": "<texto>", "proposedText": "".
  -> Si la instrucción dice "cámbialo por...", "reemplaza", "pon..." -> OBLIGATORIO kind: "replace", "baseText": "<texto>", "proposedText": "<nuevo texto>".
- Verbos de orden directa: "agrega...", "modifica...", "cambia...", "pon...", "reemplaza...", "elimina...", "quita...", "inserta...", "crea la sección...", "creala en el documento...".
-> ACCIÓN ESTRICTA:
   1. Si tu campo "message" afirma haber modificado, agregado o eliminado algo, DEBES OBLIGATORIAMENTE incluir el objeto correspondiente dentro de "suggestions".
   2. Tipos de "kind":
      * "delete": Para borrar una línea o fragmento existente.
        - "sectionId": "${editorContext.sectionId}" (o la sección correspondiente)
        - "baseText": fragmento exacto que se desea eliminar
        - "proposedText": ""
        - "rationale": motivo breve
      * "replace": Para cambiar o actualizar texto existente.
        - "sectionId": ID de la sección
        - "baseText": fragmento exacto que se reemplaza
        - "proposedText": nueva redacción
        - "rationale": motivo breve
      * "insert": Para añadir nuevo contenido sin sustituir nada.
        - "sectionId": ID de la sección
        - "baseText": ""
        - "proposedText": nuevo texto o bloque
        - "rationale": motivo breve
      * "add_section": Para crear una nueva sección en el rider.
        - "newSectionTitle": título de la nueva sección
        - "proposedText": contenido inicial
        - "rationale": motivo breve

=== FORMATO DE RESPUESTA JSON OBLIGATORIO ===
Responde SIEMPRE con un objeto JSON válido según el caso:

Ejemplo Caso 1 (Consulta técnica):
{
  "message": "Explicación técnica detallada con markdown...",
  "suggestions": []
}

Ejemplo Caso 2 (Eliminación directa):
{
  "message": "He eliminado la línea correspondiente del documento.",
  "suggestions": [
    {
      "kind": "delete",
      "sectionId": "${editorContext.sectionId}",
      "baseText": "Coordinador del Venue: [Nombre, Teléfono, Email]",
      "proposedText": "",
      "rationale": "Eliminar coordinador del venue a solicitud del usuario"
    }
  ]
}

Ejemplo Caso 2 (Modificación / Reemplazo):
{
  "message": "He actualizado la especificación en la sección.",
  "suggestions": [
    {
      "kind": "replace",
      "sectionId": "${editorContext.sectionId}",
      "baseText": "texto exacto a reemplazar",
      "proposedText": "nuevo texto requerido",
      "rationale": "Actualización técnica a solicitud del usuario"
    }
  ]
}

Ejemplo Caso 2 (Crear sección):
{
  "message": "He creado la sección en el documento.",
  "suggestions": [
    {
      "kind": "add_section",
      "newSectionTitle": "Información General",
      "proposedText": "[[requisito:Contactos Clave]]\\n- Production Manager: [Nombre y Teléfono]",
      "rationale": "Creación de la sección solicitada"
    }
  ]
}

Dentro de "proposedText" puedes usar:
- Subtítulos: "### Subtítulo"
- Listas con viñetas: "- **Parámetro:** Valor requerido"
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

    let finalResponse: AgentResponse | null = null;

    // 3. Llamar al proveedor de IA configurado (Vercel AI Gateway, OIDC automático o OpenAI directo)
    const aiResult = await callAiCompletion({
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
      jsonMode: Boolean(editorContext),
    });

    if (aiResult) {
      const replyRaw = aiResult.content;
      let replyText = replyRaw;
      let suggestions: AgentSuggestionDraft[] = [];

      if (editorContext) {
        const parsed = parseSuggestionJson(replyRaw);
        if (parsed) {
          if (parsed.message) replyText = parsed.message;
          suggestions = parsed.suggestions;
        }

        // Red de seguridad: si el LLM devolvió suggestions: [] pero el usuario envió una orden directa sobre selección
        if (suggestions.length === 0) {
          const selectedQuote = lastMessage.match(/^(?:sobre|modificar|modifica|ajustar|ajusta|cambiar|cambia|editar|edita|eliminar|elimina|borrar|borra|quitar|quita)\s+"([^"]+)":?\s*(.*)$/i);
          if (selectedQuote) {
            const targetQuote = selectedQuote[1].trim();
            const rawInstruction = selectedQuote[2].trim();
            const isQuestion = rawInstruction.endsWith('?') || /^(?:es|cumple|qué|por qué|cómo|revisa)/i.test(rawInstruction);
            if (!isQuestion) {
              const isDelete = /^(?:elimina|eliminar|elimínalo|eliminalo|borra|borrar|bórralo|borralo|quita|quitar|quítalo|quitalo|suprime|suprimir|delete|remove)\b/i.test(rawInstruction);
              if (isDelete) {
                suggestions.push({
                  kind: 'delete',
                  sectionId: editorContext.sectionId,
                  baseText: targetQuote,
                  proposedText: '',
                  rationale: 'Eliminar fragmento seleccionado a solicitud del usuario.',
                });
              } else {
                const cleanInstruction = rawInstruction
                  .replace(/^(?:cámbialo\s+por|cambialo\s+por|cambiar\s+por|reemplaza\s+por|pon|modifica\s+a)\s*/i, '')
                  .trim();
                suggestions.push({
                  kind: 'replace',
                  sectionId: editorContext.sectionId,
                  baseText: targetQuote,
                  proposedText: cleanInstruction,
                  rationale: 'Modificación técnica sobre el fragmento seleccionado.',
                });
              }
            }
          }
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
        gatewayProvider: aiResult.provider,
        actions: []
      };
    }

    // 4. Si la llamada a la IA falló o no devolvió resultado, emitir mensaje de error explícito para reintentar
    if (!finalResponse) {
      const diagnostics = getAiDiagnostics();
      console.warn('[API Chat] No se obtuvo respuesta del servicio de IA. Diagnóstico:', diagnostics);
      const profile = AGENT_PROFILES[activeAgent] || AGENT_PROFILES.master;
      finalResponse = {
        sessionId: session.id,
        role: activeAgent,
        roleName: profile.name,
        roleAvatar: '⚠️',
        message: '⚠️ No se pudo obtener una respuesta del servicio de IA en este momento. Por favor, vuelve a intentar.',
        isError: true,
        retryable: true,
        suggestions: [],
        gatewayProvider: 'openai',
        actions: [],
        notice: diagnostics.configured
          ? `Proveedores IA detectados: ${diagnostics.activeProviders.join(', ')}, pero la llamada a la nube falló.`
          : 'Token de IA no detectado en producción. Configura AI_GATEWAY_API_KEY o OPENAI_API_KEY en las variables de entorno de Vercel.'
      };
    }

    if (finalResponse && editorContext && finalResponse.suggestions === undefined) {
      finalResponse.suggestions = collectSuggestionDrafts(finalResponse.message, finalResponse.actions, editorContext);
      const parsed = parseSuggestionJson(finalResponse.message);
      if (parsed?.message) finalResponse.message = parsed.message;
    }

    // 5. Persistir respuesta del asistente en Supabase (solo si no es un error transitorio de red)
    if (finalResponse?.message && !finalResponse.isError) {
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
      {
        error: 'Error interno al procesar el mensaje con el agente de IA',
        message: '⚠️ No se pudo obtener una respuesta del servicio de IA en este momento. Por favor, vuelve a intentar.',
        isError: true,
        retryable: true
      },
      { status: 500 }
    );
  }
}
