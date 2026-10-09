import {
  AgentRole,
  AgentAction,
  AgentResponse,
  AgentProfile
} from '@/core/types/agent.types';
import { AGENT_PROFILES } from '@/core/constants/agent-profiles';
import { RiderType } from '@/core/types/rider.types';

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
  activeAgent: AgentRole
): AgentResponse {
  const p = prompt.toLowerCase();
  const profile = AGENT_PROFILES[activeAgent] || AGENT_PROFILES.master;

  // Buscar regla que coincida
  for (const rule of AGENT_RULES) {
    if (rule.matches(p, riderType)) {
      return rule.execute(p, riderType);
    }
  }

  // Respuesta contextual por defecto
  const avatar = activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠';

  return {
    role: activeAgent,
    roleName: profile.name,
    roleAvatar: avatar,
    message: `Entendido. Como **${profile.title}**, he analizado tu solicitud: "${prompt}". He sincronizado los parámetros reglamentarios en el documento y puedes pedirme agregar canales a la Input List, modificar el catering o reforzar las medidas de seguridad.`,
    actions: [],
    gatewayProvider: 'production_expert_engine'
  };
}
