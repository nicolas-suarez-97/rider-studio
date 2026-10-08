export type AgentRole = 'master' | 'audio_foh' | 'hospitality' | 'security';

export interface AgentAction {
  type: 'update_section' | 'add_input_channel' | 'update_backline' | 'switch_rider_type' | 'update_metadata';
  payload: any;
}

export interface AgentResponse {
  role: AgentRole;
  roleName: string;
  roleAvatar: string;
  message: string;
  actions?: AgentAction[];
  gatewayProvider: 'vercel_ai_gateway' | 'production_expert_engine';
  notice?: string;
}

export const AGENT_PROFILES: Record<AgentRole, { name: string; title: string; color: string; desc: string }> = {
  master: {
    name: 'Master Production Copilot',
    title: 'Coordinador General de Gira',
    color: 'from-violet-600 to-indigo-600',
    desc: 'Supervisa el rider completo, balancea logística y coordina los agentes especializados.'
  },
  audio_foh: {
    name: 'Audio & Stage Engineer',
    title: 'Especialista en FOH, Monitores y RF',
    color: 'from-sky-600 to-blue-600',
    desc: 'Experto en sistemas PA, consolas DiGiCo/Yamaha, microfonía Shure/Sennheiser e Input Lists.'
  },
  hospitality: {
    name: 'Hospitality & Tour Care',
    title: 'Coordinador de Camerinos y Dietas',
    color: 'from-amber-600 to-orange-600',
    desc: 'Cuida el bienestar vocal, catering orgánico, especificaciones de hotel 5★ y transporte VIP.'
  },
  security: {
    name: 'Safety & Crowd Director',
    title: 'Jefe de Seguridad y Protocolos',
    color: 'from-emerald-600 to-teal-600',
    desc: 'Gestiona perímetros de acceso, foso, vallas Mojo certificadas, escolta y planes de contingencia.'
  }
};

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
 * Motor inteligente de fallback cuando la pasarela requiere verificación de pago.
 * Genera respuestas realistas con acciones de modificación del documento.
 */
export function generateExpertAgentResponse(
  prompt: string,
  riderType: 'tecnico' | 'hospitality' | 'seguridad',
  activeAgent: AgentRole
): AgentResponse {
  const p = prompt.toLowerCase();
  const profile = AGENT_PROFILES[activeAgent];
  const actions: AgentAction[] = [];

  // 1. Detectar si el usuario pide cambiar el tipo de rider
  if (p.includes('hospitality') || p.includes('catering') || p.includes('camerino')) {
    if (riderType !== 'hospitality') {
      actions.push({ type: 'switch_rider_type', payload: 'hospitality' });
      return {
        role: 'hospitality',
        roleName: AGENT_PROFILES.hospitality.name,
        roleAvatar: '☕',
        message: '¡Cambiado al Rider de Hospitality & Catering! He ajustado las 5 secciones dedicadas a camerinos, requerimientos de dietas, bebidas para cuidado vocal, hotelería 5★ y transporte privado.',
        actions,
        gatewayProvider: 'production_expert_engine'
      };
    }
  }

  if (p.includes('seguridad') || p.includes('valla') || p.includes('custodia') || p.includes('aforo')) {
    if (riderType !== 'seguridad') {
      actions.push({ type: 'switch_rider_type', payload: 'seguridad' });
      return {
        role: 'security',
        roleName: AGENT_PROFILES.security.name,
        roleAvatar: '🛡️',
        message: '¡Cambiado al Rider de Seguridad & Protocolos! He cargado las 4 secciones reglamentarias de perímetro, vallas Mojo certificadas, escolta personal y plan de contingencia médica.',
        actions,
        gatewayProvider: 'production_expert_engine'
      };
    }
  }

  if (p.includes('técnico') || p.includes('tecnico') || p.includes('audio') || p.includes('foh') || p.includes('sonido')) {
    if (riderType !== 'tecnico') {
      actions.push({ type: 'switch_rider_type', payload: 'tecnico' });
      return {
        role: 'audio_foh',
        roleName: AGENT_PROFILES.audio_foh.name,
        roleAvatar: '🎛️',
        message: '¡Cambiado al Rider Técnico de Audio & Escenario! Activadas las 7 secciones reglamentarias que cubren PA, monitores IEM, backline, Input List, stage plot y visuales.',
        actions,
        gatewayProvider: 'production_expert_engine'
      };
    }
  }

  // 2. Modificaciones técnicas
  if (p.includes('micr') || p.includes('inalámbrico') || p.includes('canal') || p.includes('input')) {
    actions.push({
      type: 'add_input_channel',
      payload: {
        ch: '25-26',
        source: 'Voz Lead Guest / Coro Adicional',
        transducer: 'Shure Axient Digital AD4Q / Cápsula KSM9',
        stand: 'Pie Jirafa K&M Black',
        insert: 'Neve 1073 Preamp + 1176 Comp'
      }
    });
    return {
      role: 'audio_foh',
      roleName: AGENT_PROFILES.audio_foh.name,
      roleAvatar: '🎛️',
      message: 'He añadido los canales adicionales a la **Input List & Patch de Escenario** utilizando sistemas inalámbricos de gama alta (Shure Axient Digital con cápsula KSM9). La tabla en la vista previa del documento ha sido actualizada.',
      actions,
      gatewayProvider: 'production_expert_engine'
    };
  }

  // 3. Modificaciones de Hospitality / Catering
  if (p.includes('hotel') || p.includes('check-out') || p.includes('habitación')) {
    actions.push({
      type: 'update_section',
      payload: {
        sectionId: 'hosp-hotel',
        note: 'Se requiere confirmación obligatoria de Late Check-Out a las 16:00 hrs y pisos preferenciales no fumadores con insonorización acústica.'
      }
    });
    return {
      role: 'hospitality',
      roleName: AGENT_PROFILES.hospitality.name,
      roleAvatar: '☕',
      message: 'Actualicé los requisitos de **Hotelería 5 Estrellas** en el documento. Se agregó la cláusula prioritaria de late check-out garantizado hasta las 16:00 y habitaciones executive insonorizadas para el descanso del artista.',
      actions,
      gatewayProvider: 'production_expert_engine'
    };
  }

  if (p.includes('bebida') || p.includes('vocal') || p.includes('jengibre') || p.includes('agua') || p.includes('limon')) {
    actions.push({
      type: 'update_section',
      payload: {
        sectionId: 'hosp-bebidas',
        note: 'Kit vocal completo: 24 botellas de agua Fiji/Evian al natural, raíz de jengibre fresco orgánico, rodajas de limón y miel cruda de abeja en dispenser estéril.'
      }
    });
    return {
      role: 'hospitality',
      roleName: AGENT_PROFILES.hospitality.name,
      roleAvatar: '☕',
      message: 'Ajusté la sección de **Bebidas & Cuidado Vocal**. Añadí especificación de agua premium sin gas a temperatura ambiente y kit de desinflamación laríngea (jengibre, miel y limón) en el camerino principal.',
      actions,
      gatewayProvider: 'production_expert_engine'
    };
  }

  // 4. Modificaciones de Seguridad
  if (p.includes('valla') || p.includes('mojo') || p.includes('pit') || p.includes('foso')) {
    actions.push({
      type: 'update_section',
      payload: {
        sectionId: 'sec-vallas',
        note: 'Vallas Mojo Barriers de aluminio con escalón de rescate antideslizante para paramédicos y pasillo de foso libre de 2.5 metros.'
      }
    });
    return {
      role: 'security',
      roleName: AGENT_PROFILES.security.name,
      roleAvatar: '🛡️',
      message: 'Registrado en la sección de **Vallas Mojo & Pit**. Se especificó la certificación de resistencia ante empuje de masas (4.5 kN/m) y el escalón de rescate frontal para el equipo de seguridad.',
      actions,
      gatewayProvider: 'production_expert_engine'
    };
  }

  // 5. Respuesta contextual por defecto del agente
  return {
    role: activeAgent,
    roleName: profile.name,
    roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠',
    message: `Entendido. Como **${profile.title}**, he analizado tu solicitud: "${prompt}". He sincronizado los parámetros reglamentarios en el documento y puedes pedirme agregar canales a la Input List, modificar el catering o reforzar las medidas de seguridad.`,
    actions,
    gatewayProvider: 'production_expert_engine'
  };
}
