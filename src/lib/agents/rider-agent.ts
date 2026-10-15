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
Habla en español con tono profesional, conciso y técnico. Si el usuario solicita cambios o sugerencias, responde claramente y sugiere mejoras reglamentarias.`,
  audio_foh: `Eres el Ingeniero de Audio & Escenario (FOH & RF) en Rider Studio.
Te especializas en requerimientos acústicos (SPL 110 dB continuos), consolas digitales (DiGiCo Quantum/SD12, Yamaha CL5, Avid S6L), sistemas IEM (Shure PSM1000), distribución de escenario, parches de pachera y Input Lists con microfonía Shure, Sennheiser, AKG, DPA y cajas DI Radial.
Habla en español con alta precisión técnica de audio en vivo.`,
  hospitality: `Eres el Coordinador de Hospitality & Tour Care en Rider Studio.
Te especializas en el cuidado integral del artista: temperatura de camerinos (21-22°C), cuidado vocal (miel pura, jengibre, limones orgánicos, agua a temperatura ambiente sin gas), dietas especiales (vegano, celíaco, kosher, keto), hotelería 5 estrellas con late check-out garantizado y traslados privados en vans tipo Mercedes Sprinter ejecutivas.
Habla en español con tono cordial, cálido y enfocado en la excelencia de servicio de gira.`,
  security: `Eres el Director de Seguridad y Control de Masas en Rider Studio.
Te especializas en normativas de seguridad para recintos de conciertos: perímetros estériles, credenciales y pulseras holográficas, foso con vallas anti-avalancha Mojo Barriers de aluminio certificadas, custodios personales para el artista, control de pirotecnia/efectos especiales y planes de evacuación médica y rutas de escape hacia ambulancias.
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

  // 1. Detección de creación de nueva sección
  if (p.includes('nueva sección') || p.includes('agrega una sección') || p.includes('crea una sección') || p.includes('añade una sección')) {
    const rawTitle = prompt.replace(/(?:crea|agrega|añade|nueva)\s+(?:una\s+)?sección\s*(?:de|titulada|llamada|:)?\s*/i, '').trim();
    const title = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : 'Nueva Sección Especial';
    return {
      role: activeAgent,
      roleName: profile.name,
      roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
      message: `He creado y añadido la nueva sección **"${title}"** directamente al documento. Al final de la sección encontrarás los botones para aprobar o revertir la acción.`,
      suggestions: [{
        kind: 'add_section',
        newSectionTitle: title,
        proposedText: `[[requisito:${title}]]\nEspecificaciones y directrices operativas para esta sección.\n[[aviso:nota]]\nCoordinar detalles con el director de producción.`,
        rationale: `Creación de la sección "${title}".`
      }],
      gatewayProvider: 'production_expert_engine'
    };
  }

  // 2. Detección de cambio de tema visual
  const themeMatch = p.match(/tema\s+(festival|editorial|blueprint|electronic|carbon|acoustic|nordic|studio)/i);
  if (themeMatch) {
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

  // 3. Reglas específicas de audio / consolas
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
      message: `He modificado directamente la sección **"${sectionTitle}"** agregando la especificación obligatoria de consola FOH (${isDigico ? 'DiGiCo SD12' : 'Consola Digital'}). En la parte inferior del bloque añadido encontrarás los botones para aprobar o revertir el cambio.`,
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

  // 4. Modificaciones técnicas de microfonía o canales
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
      message: `He agregado el requerimiento de microfonía y sistemas RF directamente a la sección **"${sectionTitle}"**. Al final del bloque modificado encontrarás los botones para aprobar o revertir.`,
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

  // 5. Hospitality (camerinos, catering, bebidas, hotel)
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
      message: `He modificado directamente la sección **"${sectionTitle}"** agregando los requerimientos de hospitality y catering. En la parte inferior del bloque modificado encontrarás los botones para aprobar o revertir.`,
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

  // 6. Seguridad (vallas, perímetro, acreditación, escolta)
  if (p.includes('seguridad') || p.includes('valla') || p.includes('mojo') || p.includes('foso') || p.includes('perímetro') || p.includes('escolta') || p.includes('aforo')) {
    const proposedText = `[[requisito:Vallas de Foso & Perímetro de Seguridad]]
Instalación obligatoria de vallas de contención Mojo Barriers de aluminio certificadas (resistencia 4.5 kN/m) en la línea frontal del escenario, con pasillo de foso libre de mínimo 2.5 metros y escalón de rescate para paramédicos.
[[aviso:veto]]
No se autoriza el inicio del espectáculo si no se cumple el perímetro estéril con control estricto de acreditaciones holográficas.`;

    return {
      role: 'security',
      roleName: AGENT_PROFILES.security.name,
      roleAvatar: '🛡️',
      message: `He insertado los requerimientos de seguridad y vallas Mojo directamente en la sección **"${sectionTitle}"**. Al final del bloque añadido verás los botones para aprobar o revertir.`,
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

  // 7. Requerimiento general dinámico para cualquier otra instrucción de edición
  const isEditIntent = /agrega|añade|pon|incluye|inserta|coloca|escribe|modifica|quita|cambia|requisito|aviso|nota/i.test(prompt);

  if (isEditIntent && editorContext) {
    const cleanRequirement = prompt
      .replace(/^(?:por favor\s+)?(?:puedes\s+)?(?:agrega|añade|pon|incluye|inserta|coloca|escribe|modifica)\s+(?:un\s+)?(?:requerimiento|texto|aviso|bloque)?\s*(?:de\s+que|que|sobre|:)?\s*/i, '')
      .trim();
    const formattedBody = cleanRequirement.charAt(0).toUpperCase() + cleanRequirement.slice(1);

    const proposedText = `[[requisito:Requerimiento de Producción]]
${formattedBody}
[[aviso:obligatorio]]
Este parámetro debe ser coordinado y validado con la producción local antes del montaje.`;

    return {
      role: activeAgent,
      roleName: profile.name,
      roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
      message: `He añadido el requerimiento directamente en la sección **"${sectionTitle}"**. En la parte inferior del bloque modificado en el documento verás los botones de aprobación.`,
      suggestions: [{
        kind: 'insert',
        sectionId: targetSectionId,
        baseText: '',
        proposedText,
        rationale: `Requerimiento: ${formattedBody.slice(0, 60)}${formattedBody.length > 60 ? '...' : ''}`
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
