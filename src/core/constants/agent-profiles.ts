import { AgentRole, AgentProfile } from '../types/agent.types';

export const AGENT_PROFILES: Record<AgentRole, AgentProfile> = {
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

export const AGENT_INFO: Record<AgentRole, { badge: string; icon: string; tips: string[] }> = {
  master: {
    badge: 'Coordinación Total',
    icon: '🧠',
    tips: [
      'Valida coherencia técnica y de hospitalidad en festivales',
      'Exporta y formatea cláusulas reglamentarias',
      'Calcula balance de carga eléctrica y dimensiones'
    ]
  },
  audio_foh: {
    badge: 'FOH & RF',
    icon: '🎛️',
    tips: [
      'Presión sonora requerida: 110 dBA continuos',
      'Consolas prioritarias: DiGiCo SD12/Quantum, Yamaha CL5, Avid S6L',
      'Split pasivo con aislamiento galvánico de 48 canales'
    ]
  },
  hospitality: {
    badge: 'Catering & Bienestar',
    icon: '☕',
    tips: [
      'Climatización estable de camerino: 21°C - 22°C',
      'Cuidado vocal: Jengibre fresco, miel orgánica y agua sin gas',
      'Hotelería 5★ con Late Check-out a las 16:00'
    ]
  },
  security: {
    badge: 'Protocolos & Crowd',
    icon: '🛡️',
    tips: [
      'Vallas Mojo certificadas a 1.80m de tarima',
      'Pasillo central libre de extracción rápida en foso',
      'Ambulancia soporte vital fijo con ruta despejada'
    ]
  }
};

export const SAMPLE_FAQS = [
  '¿Cómo añadir 4 canales estéreo de sintetizadores?',
  '¿Qué especificaciones de PA sugieres para 5.000 personas?',
  'Recomienda catering orgánico para 12 personas',
  '¿Cuántas vallas Mojo necesito para tarima de 14 metros?'
];
