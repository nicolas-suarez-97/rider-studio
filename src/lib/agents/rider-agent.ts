import {
  AgentRole,
  AgentAction,
  AgentResponse,
  AgentProfile
} from '@/core/types/agent.types';
import { AGENT_PROFILES } from '@/core/constants/agent-profiles';
import { RiderType } from '@/core/types/rider.types';
import { EditorContextPayload } from '@/core/types/suggestion.types';

export type { AgentRole, AgentAction, AgentResponse, AgentProfile };
export { AGENT_PROFILES };
export {
  RIDER_GENERATOR_SYSTEM_PROMPT,
  RIDER_AUDITOR_SYSTEM_PROMPT,
  buildRiderGenerationUserPrompt,
  buildRiderAuditUserPrompt
} from './prompts/rider-llm-prompts';

export const SYSTEM_PROMPTS: Record<AgentRole, string> = {
  master: `Eres el Master Production Copilot de Rider Studio, una plataforma profesional para eventos en vivo y giras.
Tu labor es coordinar riders técnicos, hospitality y seguridad para bandas, festivales y artistas de primer nivel.
Tienes control directo y total para modificar, agregar o eliminar requerimientos en el documento del rider a través de sugerencias estructuradas. NUNCA digas que no puedes editar el documento directamente ni le digas al usuario que copie y pegue.
Habla en español con tono profesional, conciso y técnico. Si el usuario solicita cambios o sugerencias, responde claramente y sugiere mejoras reglamentarias.`,
  audio_foh: `Eres el Ingeniero de Audio & Escenario (FOH & RF) en Rider Studio.
Te especializas en requerimientos acústicos (SPL 110 dB continuos), consolas digitales (DiGiCo Quantum/SD12, Yamaha CL5, Avid S6L), sistemas IEM (Shure PSM1000), distribución de escenario, parches de pachera y Input Lists con microfonía Shure, Sennheiser, AKG, DPA y cajas DI Radial.
Tienes control directo y total para modificar, agregar o eliminar requerimientos en el documento del rider a través de sugerencias estructuradas. NUNCA digas que no puedes editar el documento directamente.
Habla en español con alta precisión técnica de audio en vivo.`,
  hospitality: `Eres el Coordinador de Hospitality & Tour Care en Rider Studio.
Te especializas en el cuidado integral del artista: temperatura de camerinos (21-22°C), cuidado vocal (miel pura, jengibre, limones orgánicos, agua a temperatura ambiente sin gas), dietas especiales (vegano, celíaco, kosher, keto), hotelería 5 estrellas con late check-out garantizado y traslados privados en vans tipo Mercedes Sprinter ejecutivas.
Tienes control directo y total para modificar, agregar o eliminar requerimientos en el documento del rider a través de sugerencias estructuradas. NUNCA digas que no puedes editar el documento directamente.
Habla en español con tono cordial, cálido y enfocado en la excelencia de servicio de gira.`,
  security: `Eres el Director de Seguridad y Control de Masas en Rider Studio.
Te especializas en normativas de seguridad para recintos de conciertos: perímetros estériles, credenciales y pulseras holográficas, foso con vallas anti-avalancha Mojo Barriers de aluminio certificadas, custodios personales para el artista, control de pirotecnia/efectos especiales y planes de evacuación médica y rutas de escape hacia ambulancias.
Tienes control directo y total para modificar, agregar o eliminar requerimientos en el documento del rider a través de sugerencias estructuradas. NUNCA digas que no puedes editar el documento directamente.
Habla en español con autoridad, claridad y enfoque preventivo.`
};

/**
 * Interfaz de Regla de Respuesta de Agente (Open/Closed Principle)
 * Permite registrar nuevas intenciones o agentes sin modificar la lógica base.
 */
interface AgentResponseRule {
  id: string;
  matches: (promptLower: string, currentRiderType: RiderType) => boolean;
  execute: (promptLower: string, currentRiderType: RiderType) => AgentResponse;
}

const AGENT_RULES: AgentResponseRule[] = [
  // 1. Cambio a Hospitality
  {
    id: 'switch_to_hospitality',
    matches: (p, riderType) =>
      riderType !== 'hospitality' && (p.includes('hospitality') || p.includes('catering') || p.includes('camerino')),
    execute: () => ({
      role: 'hospitality',
      roleName: AGENT_PROFILES.hospitality.name,
      roleAvatar: '☕',
      message: '¡Cambiado al Rider de Hospitality & Catering! He ajustado las 5 secciones dedicadas a camerinos, requerimientos de dietas, bebidas para cuidado vocal, hotelería 5★ y transporte privado.',
      actions: [{ type: 'switch_rider_type', payload: 'hospitality' }],
      gatewayProvider: 'production_expert_engine'
    })
  },
  // 2. Cambio a Seguridad
  {
    id: 'switch_to_security',
    matches: (p, riderType) =>
      riderType !== 'seguridad' && (p.includes('seguridad') || p.includes('valla') || p.includes('custodia') || p.includes('aforo')),
    execute: () => ({
      role: 'security',
      roleName: AGENT_PROFILES.security.name,
      roleAvatar: '🛡️',
      message: '¡Cambiado al Rider de Seguridad & Protocolos! He cargado las 4 secciones reglamentarias de perímetro, vallas Mojo certificadas, escolta personal y plan de contingencia médica.',
      actions: [{ type: 'switch_rider_type', payload: 'seguridad' }],
      gatewayProvider: 'production_expert_engine'
    })
  },
  // 3. Cambio a Técnico
  {
    id: 'switch_to_tech',
    matches: (p, riderType) =>
      riderType !== 'tecnico' && (p.includes('técnico') || p.includes('tecnico') || p.includes('audio') || p.includes('foh') || p.includes('sonido')),
    execute: () => ({
      role: 'audio_foh',
      roleName: AGENT_PROFILES.audio_foh.name,
      roleAvatar: '🎛️',
      message: '¡Cambiado al Rider Técnico de Audio & Escenario! Activadas las 7 secciones reglamentarias que cubren PA, monitores IEM, backline, Input List, stage plot y visuales.',
      actions: [{ type: 'switch_rider_type', payload: 'tecnico' }],
      gatewayProvider: 'production_expert_engine'
    })
  },
  // 4. Modificaciones técnicas (Input list / Microfonía)
  {
    id: 'technical_microphones',
    matches: (p) => p.includes('micr') || p.includes('inalámbrico') || p.includes('canal') || p.includes('input'),
    execute: () => ({
      role: 'audio_foh',
      roleName: AGENT_PROFILES.audio_foh.name,
      roleAvatar: '🎛️',
      message: 'He añadido los canales adicionales a la **Input List & Patch de Escenario** utilizando sistemas inalámbricos de gama alta (Shure Axient Digital con cápsula KSM9). La tabla en la vista previa del documento ha sido actualizada.',
      actions: [{
        type: 'add_input_channel',
        payload: {
          ch: '25-26',
          source: 'Voz Lead Guest / Coro Adicional',
          transducer: 'Shure Axient Digital AD4Q / Cápsula KSM9',
          stand: 'Pie Jirafa K&M Black',
          insert: 'Neve 1073 Preamp + 1176 Comp'
        }
      }],
      gatewayProvider: 'production_expert_engine'
    })
  },
  // 5. Hospitality - Hotel
  {
    id: 'hospitality_hotel',
    matches: (p) => p.includes('hotel') || p.includes('check-out') || p.includes('habitación'),
    execute: () => ({
      role: 'hospitality',
      roleName: AGENT_PROFILES.hospitality.name,
      roleAvatar: '☕',
      message: 'Actualicé los requisitos de **Hotelería 5 Estrellas** en el documento. Se agregó la cláusula prioritaria de late check-out garantizado hasta las 16:00 y habitaciones executive insonorizadas para el descanso del artista.',
      actions: [{
        type: 'update_section',
        payload: {
          sectionId: 'hosp-hotel',
          note: 'Se requiere confirmación obligatoria de Late Check-Out a las 16:00 hrs y pisos preferenciales no fumadores con insonorización acústica.'
        }
      }],
      gatewayProvider: 'production_expert_engine'
    })
  },
  // 6. Hospitality - Cuidado vocal & Bebidas
  {
    id: 'hospitality_beverages',
    matches: (p) => p.includes('bebida') || p.includes('vocal') || p.includes('jengibre') || p.includes('agua') || p.includes('limon'),
    execute: () => ({
      role: 'hospitality',
      roleName: AGENT_PROFILES.hospitality.name,
      roleAvatar: '☕',
      message: 'Ajusté la sección de **Bebidas & Cuidado Vocal**. Añadí especificación de agua premium sin gas a temperatura ambiente y kit de desinflamación laríngea (jengibre, miel y limón) en el camerino principal.',
      actions: [{
        type: 'update_section',
        payload: {
          sectionId: 'hosp-bebidas',
          note: 'Kit vocal completo: 24 botellas de agua Fiji/Evian al natural, raíz de jengibre fresco orgánico, rodajas de limón y miel cruda de abeja en dispenser estéril.'
        }
      }],
      gatewayProvider: 'production_expert_engine'
    })
  },
  // 7. Seguridad - Vallas Mojo & Pit
  {
    id: 'security_fences',
    matches: (p) => p.includes('valla') || p.includes('mojo') || p.includes('pit') || p.includes('foso'),
    execute: () => ({
      role: 'security',
      roleName: AGENT_PROFILES.security.name,
      roleAvatar: '🛡️',
      message: 'Registrado en la sección de **Vallas Mojo & Pit**. Se especificó la certificación de resistencia ante empuje de masas (4.5 kN/m) y el escalón de rescate frontal para el equipo de seguridad.',
      actions: [{
        type: 'update_section',
        payload: {
          sectionId: 'sec-vallas',
          note: 'Vallas Mojo Barriers de aluminio con escalón de rescate antideslizante para paramédicos y pasillo de foso libre de 2.5 metros.'
        }
      }],
      gatewayProvider: 'production_expert_engine'
    })
  }
];

/**
 * Motor inteligente de fallback cuando la pasarela requiere verificación de pago o está offline.
 * Implementa el patrón Strategy / Rules de forma modular.
 */
export function generateExpertAgentResponse(
  prompt: string,
  riderType: RiderType,
  activeAgent: AgentRole,
  editorContext?: EditorContextPayload
): AgentResponse {
  const p = prompt.toLowerCase();
  const profile = AGENT_PROFILES[activeAgent] || AGENT_PROFILES.master;
  const targetSectionId = editorContext?.sectionId || 'tech-audio';
  const sectionTitle = editorContext?.sectionTitle || 'Documento';

  // 0.1 Ajuste directo sobre texto seleccionado (Modificar "...", Sobre "...", etc.)
  const selectedQuoteMatch = prompt.match(/^(?:sobre|modificar|modifica|ajustar|ajusta|cambiar|cambia|editar|edita|eliminar|elimina|borrar|borra|quitar|quita)\s+"([^"]+)":?\s*(.*)$/i);
  if (selectedQuoteMatch && editorContext) {
    const targetQuote = selectedQuoteMatch[1].trim();
    const rawInstruction = selectedQuoteMatch[2].trim() || 'Modificación técnica';
    const isQuestion = rawInstruction.endsWith('?') || /^(?:es|cumple|qué|por qué|cómo|revisa)/i.test(rawInstruction);

    if (!isQuestion) {
      const isDelete = /^(?:elimina|eliminar|elimínalo|eliminalo|borra|borrar|bórralo|borralo|quita|quitar|quítalo|quitalo|suprime|suprimir|delete|remove)\b/i.test(rawInstruction);

      if (isDelete) {
        return {
          role: activeAgent,
          roleName: profile.name,
          roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
          message: `He eliminado la línea correspondiente a **"${targetQuote}"** de la sección **"${sectionTitle}"**. Al inicio de la modificación encontrarás los botones para aprobar o revertir.`,
          suggestions: [{
            kind: 'delete',
            sectionId: targetSectionId,
            baseText: targetQuote,
            proposedText: '',
            rationale: `Eliminación solicitada sobre "${targetQuote.slice(0, 40)}${targetQuote.length > 40 ? '...' : ''}"`
          }],
          gatewayProvider: 'production_expert_engine'
        };
      }

      const cleanInstruction = rawInstruction
        .replace(/^(?:cámbialo\s+por|cambialo\s+por|cambiar\s+por|reemplaza\s+por|pon|modifica\s+a)\s*/i, '')
        .trim();
      const formatted = cleanInstruction.charAt(0).toUpperCase() + cleanInstruction.slice(1);

      return {
        role: activeAgent,
        roleName: profile.name,
        roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
        message: `He actualizado el fragmento seleccionado en la sección **"${sectionTitle}"**. Al inicio de la modificación encontrarás los botones para aprobar o revertir.`,
        suggestions: [{
          kind: 'replace',
          sectionId: targetSectionId,
          baseText: targetQuote,
          proposedText: formatted,
          rationale: `Ajuste sobre selección: ${formatted.slice(0, 50)}${formatted.length > 50 ? '...' : ''}`
        }],
        gatewayProvider: 'production_expert_engine'
      };
    }
  }

  // 0.2 Análisis o consulta técnica sobre texto seleccionado
  const analyzeQuoteMatch = prompt.match(/^(?:analizar|analiza)\s+"([^"]+)":?\s*(.*)$/i);
  if (analyzeQuoteMatch) {
    const targetQuote = analyzeQuoteMatch[1].trim();
    return {
      role: activeAgent,
      roleName: profile.name,
      roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
      message: `**Análisis técnico sobre "${targetQuote}":**\n\nEl requerimiento es técnicamente viable y cumple con los estándares profesionales del sector. Si deseas cambiar esta cláusula por otra especificación técnica, puedes pedírmelo directamente.`,
      suggestions: [],
      gatewayProvider: 'production_expert_engine'
    };
  }

  // 0.3 Detección de creación de nueva sección
  if (
    p.includes('nueva sección') ||
    p.includes('agrega una sección') ||
    p.includes('crea una sección') ||
    p.includes('añade una sección') ||
    /(?:crea|agrega|añade|nueva|crear|agregar)\s+(?:la|una|el)?\s*sección/i.test(p) ||
    /(?:creala|créala)\s+en\s+el\s+documento/i.test(p)
  ) {
    const rawTitle = prompt
      .replace(/(?:creala|créala)\s+en\s+el\s+documento/i, '')
      .replace(/(?:crea|agrega|añade|nueva|crear|agregar)\s+(?:la|una|el)?\s*sección\s*(?:de|titulada|llamada|:)?\s*/i, '')
      .trim();
    const title = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : 'Información General';
    return {
      role: activeAgent,
      roleName: profile.name,
      roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
      message: `He creado y añadido la nueva sección **"${title}"** directamente al documento. Al inicio de la modificación encontrarás los botones para aprobar o revertir la acción.`,
      suggestions: [{
        kind: 'add_section',
        newSectionTitle: title,
        proposedText: `[[requisito:${title}]]\nEspecificaciones y directrices operativas para esta sección.\n[[aviso:nota]]\nCoordinar detalles con el director de producción.`,
        rationale: `Creación de la sección "${title}".`
      }],
      gatewayProvider: 'production_expert_engine'
    };
  }

  // 0.4 Clasificación de intención: ¿Es una consulta/pregunta o una orden directa de edición?
  const isQuestionOrInquiry =
    prompt.includes('?') ||
    /^(?:qué|que|cuál|cual|cuáles|cuales|cómo|como|por qué|porque|cuándo|cuando|dónde|donde|quién|quien|es|son|puedes explicar|explica|explícame|recomienda|recomiendas|recomiéndame|qué opinas|que opinas|cuéntame|dime|tienes|hay|crees|opinas|revisa|analiza|valida|consulta|aconseja|aconséjame)\b/i.test(prompt.trim()) ||
    /(?:qué opinas|que opinas|qué recomiendas|que recomiendas|qué sugieres|que sugieres|qué diferencia|cuál es|cual es|cómo ves|como ves|me recomiendas|te parece|está bien|esta bien|es correcto|es necesario|me aconsejas)/i.test(prompt);

  const isExplicitEditCommand =
    /^(?:agrega|añade|pon|incluye|inserta|coloca|escribe|modifica|cambia|actualiza|corrige|reemplaza|elimina|quita|borra|sustituye|crea|ajusta|modificar|cambiar|eliminar|quitar|borrar|ajustar|crear|agregar|añadir)\b/i.test(prompt.trim()) ||
    /\b(?:agrega|añade|pon|incluye|inserta|modifica|cambia|actualiza|reemplaza|elimina|quita|borra|crea|ajusta|modificar|cambiar|eliminar|quitar|borrar)\s+(?:un\s+|una\s+|el\s+|la\s+|este\s+|esta\s+|al\s+|en\s+|sección|canal|requerimiento|texto|cláusula|consola|micrófono|hotel|valla|parámetro|documento)/i.test(prompt) ||
    /(?:creala|créala|crealo|créalo|añadela|añádela|agregala|agrégala|eliminala|elimínala|borrala|bórrala)\s*(?:en\s+el\s+documento)?/i.test(prompt) ||
    p.includes('agrega canal') || p.includes('añade canal') ||
    p.includes('genera sugerencias') || p.includes('aplica sugerencias') ||
    p.includes('creala en el documento') || p.includes('créala en el documento');

  // MODO CONSULTA: Si es una pregunta o duda y no es una orden explícita de edición,
  // responder EXCLUSIVAMENTE en el chat sin modificar el documento (suggestions: []).
  if (isQuestionOrInquiry && !isExplicitEditCommand) {
    // Consulta sobre consolas / sonido
    if (p.includes('consola') || p.includes('digico') || p.includes('yamaha') || p.includes('avid') || p.includes('foh') || p.includes('mezcla')) {
      return {
        role: 'audio_foh',
        roleName: AGENT_PROFILES.audio_foh.name,
        roleAvatar: '🎛️',
        message: `**Recomendaciones sobre Consolas de Sala (FOH):**\n\nEn riders profesionales para directos y festivales, los tres estándares de la industria son:\n\n1. **DiGiCo Quantum / SD Series (SD12, SD10, Quantum 338):** Es el estándar de oro en giras internacionales. Sobresale por su procesamiento FPGA sin latencia, buses dinámicos y total libertad de configuración de faders.\n2. **Yamaha CL5 / Rivage PM Series:** Muy fiable, con integración nativa de red Dante redundante y preamplificadores premium Rupert Neve.\n3. **Avid Venue S6L:** Ideal para ingenieros que integran plugins directos de Pro Tools en vivo.\n\n*Consejo técnico:* En el rider siempre es crucial exigir **doble fuente de poder redundante** y dejar una cláusula explícita de veto para consolas analógicas o modelos fuera del estándar acordado.\n\n💡 *Si deseas que incorpore alguna de estas consolas en la sección de audio de tu rider, solo pídeme (por ejemplo: "Agrega consola DiGiCo SD12") y la aplicaré directamente al documento.*`,
        suggestions: [],
        gatewayProvider: 'production_expert_engine'
      };
    }

    // Consulta sobre micrófonos / RF / canales
    if (p.includes('micr') || p.includes('inalámbrico') || p.includes('canal') || p.includes('input') || p.includes('rf')) {
      return {
        role: 'audio_foh',
        roleName: AGENT_PROFILES.audio_foh.name,
        roleAvatar: '🎛️',
        message: `**Criterio Técnico de Microfonía & Radiofrecuencias:**\n\n- **Voces Líderes:** Sistemas inalámbricos digitales de gama alta como **Shure Axient Digital (AD4Q)** con cápsula **KSM9** (condensador para voces con matices y amplia dinámica) o **Beta 58A** (supercardioide para alta ganancia antes de retroalimentación).\n- **Coordinación RF:** En festivales es obligatorio solicitar un escaneo y coordinación de espectro 2 horas antes de la prueba de sonido, con antenas direccionales activas elevadas.\n- **Monitoreo In-Ear (IEM):** Shure PSM 1000 o Sennheiser 2000 con antenas helicoidales y combinador activo.\n\n💡 *Si quieres que agregue estos requerimientos a la sección o un nuevo canal a la Input List, dímelo y lo registraré en el documento.*`,
        suggestions: [],
        gatewayProvider: 'production_expert_engine'
      };
    }

    // Consulta sobre hospitality / catering / hotel / bebidas
    if (p.includes('hospitality') || p.includes('catering') || p.includes('camerino') || p.includes('hotel') || p.includes('bebida') || p.includes('vocal') || p.includes('agua') || p.includes('jengibre') || p.includes('dieta')) {
      const isHotel = p.includes('hotel') || p.includes('check-out') || p.includes('habitación');
      const isDrink = p.includes('agua') || p.includes('bebida') || p.includes('jengibre') || p.includes('vocal');

      let responseText = '';
      if (isHotel) {
        responseText = `**Normativa de Hotelería y Descanso en Gira:**\n\nEl requerimiento de **Late Check-Out a las 16:00 hrs** garantizado por contrato es fundamental: tras un espectáculo que finaliza de madrugada y el posterior load-out técnico, el equipo y los artistas no pueden abandonar el hotel al mediodía habitual. Se exigen hoteles 5★ con habitaciones insonorizadas a no más de 25 minutos del venue.`;
      } else if (isDrink) {
        responseText = `**Protocolo de Bebidas & Cuidado Vocal:**\n\n- **Agua al natural obligatoria:** El agua fría puede generar espasmos en las cuerdas vocales antes de cantar; se exigen botellas de agua mineral sin gas a temperatura ambiente.\n- **Kit de recuperación laríngea:** Raíz fresca de jengibre orgánico en rodajas, miel pura de abeja y limón fresco en dispensador estéril.`;
      } else {
        responseText = `**Estándar de Camerino & Confort:**\n\nUn camerino principal profesional debe incluir climatización individual regulada a 21°C, sofá cómodo, espejo de cuerpo entero con iluminación cálida neutra, toallas de mano negras de algodón y catering balanceado coordinado 48h antes (con alternativas veganas y celíacas).`;
      }

      return {
        role: 'hospitality',
        roleName: AGENT_PROFILES.hospitality.name,
        roleAvatar: '☕',
        message: `${responseText}\n\n💡 *Si deseas que añada o ajuste alguna de estas cláusulas en tu rider, solo pídemelo.*`,
        suggestions: [],
        gatewayProvider: 'production_expert_engine'
      };
    }

    // Consulta sobre seguridad / vallas / pit
    if (p.includes('seguridad') || p.includes('valla') || p.includes('mojo') || p.includes('foso') || p.includes('perímetro') || p.includes('escolta') || p.includes('aforo')) {
      return {
        role: 'security',
        roleName: AGENT_PROFILES.security.name,
        roleAvatar: '🛡️',
        message: `**Normativas de Seguridad y Control de Masas:**\n\n- **Vallas de contención Mojo Barriers:** Deben ser de aluminio certificadas bajo norma europea con resistencia a empuje de mínimo **4.5 kN/m**.\n- **Pasillo de Foso (Pit):** Debe mantenerse libre de cables u obstáculos con una anchura mínima de 2.5 metros para permitir el libre tránsito de seguridad y camilleros.\n- **Escalón de Rescate Frontal:** Obligatorio para que los custodios y paramédicos puedan acceder rápidamente al público en caso de emergencia.\n- **Acreditaciones:** Perímetro backstage estéril con credenciales holográficas diferenciadas.\n\n💡 *Si deseas que registre este protocolo de seguridad en tu rider, indícamelo (ej. "Agrega vallas mojo a seguridad") y lo aplicaré al documento.*`,
        suggestions: [],
        gatewayProvider: 'production_expert_engine'
      };
    }

    // Consulta general sobre el rider o sección
    return {
      role: activeAgent,
      roleName: profile.name,
      roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
      message: `**Consulta sobre "${sectionTitle}":**\n\nHe analizado tu consulta. Para este tipo de producción es importante contar con especificaciones claras, marcas preferidas y cláusulas de veto bien definidas para evitar ambigüedades con promotores o salas.\n\nPuedes hacerme cualquier consulta técnica con total tranquilidad. Y si en algún momento deseas aplicar o modificar algo en el documento, solo debes darme la instrucción (por ejemplo: *"agrega..."*, *"cambia..."* o *"elimina..."*).`,
      suggestions: [],
      gatewayProvider: 'production_expert_engine'
    };
  }

  // 2. Detección de cambio de tema visual
  const themeMatch = p.match(/(?:cambia|pon|aplica|usar)?\s*tema\s+(festival|editorial|blueprint|electronic|carbon|acoustic|nordic|studio)/i);
  if (themeMatch && !p.includes('?')) {
    const themeName = themeMatch[1].toLowerCase();
    return {
      role: activeAgent,
      roleName: profile.name,
      roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
      message: `He cambiado el tema estético del documento a **"${themeName.toUpperCase()}"**. Puedes aprobarlo o revertirlo en el documento.`,
      suggestions: [{
        kind: 'switch_theme',
        sectionId: targetSectionId,
        theme: themeName,
        proposedText: themeName,
        rationale: `Cambio de tema visual a "${themeName}".`
      }],
      gatewayProvider: 'production_expert_engine'
    };
  }

  // 3. Reglas específicas de audio / consolas (ORDEN DE EDICIÓN)
  if (p.includes('consola') || p.includes('digico') || p.includes('yamaha') || p.includes('avid') || p.includes('foh') || p.includes('mezcla')) {
    const isDigico = p.includes('digico') || p.includes('sd12') || p.includes('quantum');
    const consoleName = isDigico ? 'DiGiCo SD12 / Quantum Series' : 'Consola Digital de Alta Gama (DiGiCo / Yamaha CL5 / Avid S6L)';
    const proposedText = `[[requisito:Consola Principal FOH]]
Se requiere como consola principal de sala (FOH): ${consoleName} con doble fuente de alimentación redundante, conectividad de red de audio redundante y la versión de firmware estable más reciente.
[[aviso:veto]]
No se aceptan consolas analógicas bajo ninguna circunstancia, ni modelos no autorizados previamente por el ingeniero de sonido.`;

    return {
      role: 'audio_foh',
      roleName: AGENT_PROFILES.audio_foh.name,
      roleAvatar: '🎛️',
      message: `He modificado directamente la sección **"${sectionTitle}"** agregando la especificación obligatoria de consola FOH (${isDigico ? 'DiGiCo SD12' : 'Consola Digital'}). Al inicio de la modificación encontrarás los botones para aprobar o revertir el cambio.`,
      suggestions: [{
        kind: 'insert',
        sectionId: targetSectionId,
        baseText: '',
        proposedText,
        rationale: `Especificación de consola ${consoleName} con cláusula de veto.`
      }],
      gatewayProvider: 'production_expert_engine'
    };
  }

  // 4. Modificaciones técnicas de microfonía o canales (ORDEN DE EDICIÓN)
  if (p.includes('micr') || p.includes('inalámbrico') || p.includes('canal') || p.includes('input') || p.includes('rf')) {
    const isChannelAdd = p.includes('agrega canal') || p.includes('añade canal') || p.includes('input list');
    if (isChannelAdd) {
      return {
        role: 'audio_foh',
        roleName: AGENT_PROFILES.audio_foh.name,
        roleAvatar: '🎛️',
        message: `He añadido los canales solicitados a la **Input List**. Puedes aprobar o revertir la adición con los controles del documento.`,
        suggestions: [{
          kind: 'add_channel',
          sectionId: 'tech-inputlist',
          baseText: '',
          proposedText: 'Voz Lead Guest · Shure Axient Digital KSM9 · Pie K&M',
          rationale: 'Canal inalámbrico adicional para la Input List.',
          channel: {
            name: 'Voz Guest / Coro Adicional',
            mic: 'Shure Axient Digital KSM9',
            stand: 'Pie K&M Black'
          }
        }],
        gatewayProvider: 'production_expert_engine'
      };
    }

    const proposedText = `[[requisito:Microfonía & Sistemas RF]]
Sistemas inalámbricos Shure Axient Digital o Sennheiser 6000 con cápsulas de gama alta (KSM9 / DPA). Se requiere antena direccional activa y coordinación de frecuencias RF con escaneo en el recinto.
[[aviso:obligatorio]]
El proveedor local debe entregar el espectro de radiofrecuencias libre y coordinado 2 horas antes de la prueba de sonido.`;

    return {
      role: 'audio_foh',
      roleName: AGENT_PROFILES.audio_foh.name,
      roleAvatar: '🎛️',
      message: `He agregado el requerimiento de microfonía y sistemas RF directamente a la sección **"${sectionTitle}"**. Al inicio de la modificación encontrarás los botones para aprobar o revertir.`,
      suggestions: [{
        kind: 'insert',
        sectionId: targetSectionId,
        baseText: '',
        proposedText,
        rationale: 'Requisitos técnicos de microfonía inalámbrica y coordinación RF.'
      }],
      gatewayProvider: 'production_expert_engine'
    };
  }

  // 5. Hospitality (ORDEN DE EDICIÓN)
  if (p.includes('hospitality') || p.includes('catering') || p.includes('camerino') || p.includes('hotel') || p.includes('bebida') || p.includes('vocal') || p.includes('agua') || p.includes('jengibre') || p.includes('dieta')) {
    const isDrink = p.includes('agua') || p.includes('bebida') || p.includes('jengibre') || p.includes('vocal');
    const isHotel = p.includes('hotel') || p.includes('check-out') || p.includes('habitación');

    let proposedText = '';
    let rationale = '';

    if (isDrink) {
      proposedText = `[[requisito:Bebidas & Cuidado Vocal]]
24 botellas de agua mineral sin gas a temperatura ambiente (marcas: Fiji, Evian o equivalente premium), raíz fresca de jengibre orgánico, rodajas de limón y miel cruda de abeja en dispenser individual.
[[aviso:obligatorio]]
El agua no debe servirse fría bajo ningún concepto para evitar choque térmico en las cuerdas vocales.`;
      rationale = 'Kit de bebidas y cuidado vocal en camerino.';
    } else if (isHotel) {
      proposedText = `[[requisito:Alojamiento & Hotelería 5 Estrellas]]
Habitaciones ejecutivas o suites insonorizadas en hotel de categoría 5 estrellas ubicado a no más de 25 minutos del venue del evento.
[[aviso:obligatorio]]
Late check-out garantizado por contrato hasta las 16:00 horas para todo el grupo del artista.`;
      rationale = 'Cláusula obligatoria de late check-out y hotel 5 estrellas.';
    } else {
      proposedText = `[[requisito:Camerino Principal & Confort]]
Camerino privado climatizado a 21°C con sillón confortable, espejo de cuerpo entero iluminado, 6 toallas limpias de algodón negro y tomas de corriente independientes.
[[aviso:nota]]
Catering fresco con opciones veganas y sin gluten coordinadas 48 horas antes con producción.`;
      rationale = 'Requerimientos de confort y catering en camerino.';
    }

    return {
      role: 'hospitality',
      roleName: AGENT_PROFILES.hospitality.name,
      roleAvatar: '☕',
      message: `He modificado directamente la sección **"${sectionTitle}"** agregando los requerimientos de hospitality y catering. Al inicio de la modificación encontrarás los botones para aprobar o revertir.`,
      suggestions: [{
        kind: 'insert',
        sectionId: targetSectionId,
        baseText: '',
        proposedText,
        rationale
      }],
      gatewayProvider: 'production_expert_engine'
    };
  }

  // 6. Seguridad (ORDEN DE EDICIÓN)
  if (p.includes('seguridad') || p.includes('valla') || p.includes('mojo') || p.includes('foso') || p.includes('perímetro') || p.includes('escolta') || p.includes('aforo')) {
    const proposedText = `[[requisito:Vallas de Foso & Perímetro de Seguridad]]
Instalación obligatoria de vallas de contención Mojo Barriers de aluminio certificadas (resistencia 4.5 kN/m) en la línea frontal del escenario, con pasillo de foso libre de mínimo 2.5 metros y escalón de rescate para paramédicos.
[[aviso:veto]]
No se autoriza el inicio del espectáculo si no se cumple el perímetro estéril con control estricto de acreditaciones holográficas.`;

    return {
      role: 'security',
      roleName: AGENT_PROFILES.security.name,
      roleAvatar: '🛡️',
      message: `He insertado los requerimientos de seguridad y vallas Mojo directamente en la sección **"${sectionTitle}"**. Al inicio de la modificación encontrarás los botones para aprobar o revertir.`,
      suggestions: [{
        kind: 'insert',
        sectionId: targetSectionId,
        baseText: '',
        proposedText,
        rationale: 'Protocolo de seguridad, vallas Mojo certificadas y control perimetral.'
      }],
      gatewayProvider: 'production_expert_engine'
    };
  }



  // 6.7 Sugerencias técnicas de mejora para la sección actual (/sugerencias)
  if (p.includes('genera sugerencias') || p.includes('aplica sugerencias') || p.includes('agrega sugerencias') || p.includes('faltaría agregar')) {
    const isAudio = targetSectionId.includes('audio') || /audio|sonido|foh|monitores|microfonía/i.test(sectionTitle);
    const isHosp = targetSectionId.includes('hospitality') || /hospitality|camerino|catering|hotel/i.test(sectionTitle);
    const isSec = targetSectionId.includes('seguridad') || /seguridad|acceso|valla|foso/i.test(sectionTitle);

    let proposedText = '';
    let rationale = '';

    if (isAudio) {
      proposedText = `### Requisitos Técnicos Sugeridos
- **Sistema de PA:** Cobertura uniforme en todo el recinto con SPL continuo de 105 dBA en FOH sin distorsión.
- **Monitoreo:** Sistema de IEM estéreo Shure PSM1000 / Sennheiser 2000 con antenas helicoidales y combinador activo.
[[requisito:Intercomunicación de Producción]]
Sistema de intercom inalámbrico Clear-Com o Riedel Bolero (mínimo 4 petacas: FOH, Monitores, Stage Manager y Luces).
[[aviso:obligatorio]]
Todo el equipamiento debe contar con tierra técnica aislada y estabilizador de voltaje independiente.`;
      rationale = `Sugerencias técnicas de monitoreo, PA e intercomunicación para ${sectionTitle}.`;
    } else if (isHosp) {
      proposedText = `### Especificaciones Sugeridas de Hospitality
- **Climatización y Confort:** Camerino independiente con temperatura regulable entre 20°C y 22°C.
- **Conectividad:** Red Wi-Fi de alta velocidad exclusiva y privada para la producción del artista (mínimo 100 Mbps simétricos).
[[requisito:Servicio de Toallas & Planchado]]
12 toallas de mano negras de algodón de alta densidad y vaporizador vertical en camerino.
[[aviso:nota]]
Catering fresco con opciones calientes y alternativas sin gluten/lácteos desde el montaje.`;
      rationale = `Mejoras de confort, conectividad y catering para ${sectionTitle}.`;
    } else if (isSec) {
      proposedText = `### Protocolos de Seguridad Sugeridos
- **Control de Acceso:** Pulseras o credenciales holográficas diferenciadas para escenario, backstage y FOH.
- **Vías de Evacuación:** Pasillos de emergencia de mínimo 2.5 metros completamente despejados y señalizados.
[[requisito:Seguridad en Escenario]]
Personal de seguridad dedicado en los accesos de escaleras al escenario durante toda la actuación.
[[aviso:veto]]
Queda prohibido el ingreso de público o personal no acreditado al área de backstage 2 horas antes y 1 hora después del show.`;
      rationale = `Protocolos de control perimetral y seguridad en escenario para ${sectionTitle}.`;
    } else {
      proposedText = `### Cláusulas y Requerimientos Sugeridos
- **Validación Previa:** Las especificaciones de esta sección deben ser confirmadas con 7 días de antelación al montaje.
- **Suministro Local:** El organizador garantizará la disponibilidad de todos los insumos detallados sin sustituciones no autorizadas.
[[requisito:Personal de Enlace de Producción]]
Un asistente de producción bilingüe asignado exclusivamente a coordinar los aspectos de esta sección.
[[aviso:obligatorio]]
Cualquier cambio sobre esta sección requiere autorización por escrito del director de gira.`;
      rationale = `Sugerencias de validación, personal de enlace y cláusulas operativas para ${sectionTitle}.`;
    }

    return {
      role: isHosp ? 'hospitality' : isSec ? 'security' : 'audio_foh',
      roleName: isHosp ? AGENT_PROFILES.hospitality.name : isSec ? AGENT_PROFILES.security.name : AGENT_PROFILES.audio_foh.name,
      roleAvatar: isHosp ? '☕' : isSec ? '🛡️' : '🎛️',
      message: `He analizado la sección **"${sectionTitle}"** y he redactado sugerencias de mejora y requisitos técnicos clave aplicados directamente al documento. Al inicio de la modificación encontrarás los botones para aprobar o revertir.`,
      suggestions: [{
        kind: 'insert',
        sectionId: targetSectionId,
        baseText: '',
        proposedText,
        rationale
      }],
      gatewayProvider: 'production_expert_engine'
    };
  }

  // 7. Requerimiento general dinámico para cualquier otra instrucción de edición
  const isEditIntent = /agrega|añade|pon|incluye|inserta|coloca|escribe|modifica|quita|cambia|actualiza|corrige|reemplaza|ajusta|requisito|aviso|nota/i.test(prompt);

  if (isEditIntent && editorContext) {
    const isModifyOrChange = /modifica|cambia|actualiza|corrige|reemplaza|ajusta/i.test(prompt) || Boolean(editorContext.selection);
    const cleanRequirement = prompt
      .replace(/^(?:por favor\s+)?(?:puedes\s+)?(?:agrega|añade|pon|incluye|inserta|coloca|escribe|modifica|cambia|actualiza|reemplaza|ajusta)\s+(?:un\s+)?(?:requerimiento|texto|aviso|bloque)?\s*(?:de\s+que|que|sobre|:)?\s*/i, '')
      .trim();
    const formattedBody = cleanRequirement.charAt(0).toUpperCase() + cleanRequirement.slice(1);

    const proposedText = `[[requisito:Requerimiento de Producción]]
${formattedBody}
[[aviso:obligatorio]]
Este parámetro debe ser coordinado y validado con la producción local antes del montaje.`;

    const baseText = editorContext.selection || (isModifyOrChange ? (editorContext.sectionText || '') : '');

    return {
      role: activeAgent,
      roleName: profile.name,
      roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
      message: isModifyOrChange
        ? `He modificado directamente la sección **"${sectionTitle}"**. Al inicio de la modificación encontrarás los botones para aprobar o revertir.`
        : `He añadido el requerimiento directamente en la sección **"${sectionTitle}"**. Al inicio de la modificación encontrarás los botones para aprobar o revertir.`,
      suggestions: [{
        kind: isModifyOrChange ? 'replace' : 'insert',
        sectionId: targetSectionId,
        baseText,
        proposedText,
        rationale: `${isModifyOrChange ? 'Modificación' : 'Requerimiento'}: ${formattedBody.slice(0, 60)}${formattedBody.length > 60 ? '...' : ''}`
      }],
      gatewayProvider: 'production_expert_engine'
    };
  }

  // 8. Consulta puramente informativa / conversacional
  return {
    role: activeAgent,
    roleName: profile.name,
    roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
    message: `Hola, soy tu **${profile.title}**. Puedes pedirme agregar o modificar requerimientos técnicos, consolas, microfonía, hospitality o seguridad y los aplicaré directamente en tu documento para que los apruebes con un clic.`,
    actions: [],
    gatewayProvider: 'production_expert_engine'
  };
}
