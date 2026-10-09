/**
 * Constantes y directrices oficiales de calidad para riders en Rider Studio.
 */

import { RedFlagType, RedFlagSeverity } from '../types/rider-evaluation.types';

export interface RedFlagRule {
  type: RedFlagType;
  title: string;
  penaltyPoints: number;
  severity: RedFlagSeverity;
  description: string;
}

export const RIDER_RED_FLAG_RULES: Record<RedFlagType, RedFlagRule> = {
  WATTS_COMO_POTENCIA: {
    type: 'WATTS_COMO_POTENCIA',
    title: 'Definición Acústica por Vatios/Watts',
    penaltyPoints: 25,
    severity: 'CRITICA',
    description: 'El rider solicita potencia en Watts en lugar de especificar SPL (dBA/dBC), cobertura y sistemas line array homologados.'
  },
  SIN_INPUT_LIST: {
    type: 'SIN_INPUT_LIST',
    title: 'Ausencia de Input List Tabular',
    penaltyPoints: 20,
    severity: 'CRITICA',
    description: 'No se proporciona una lista estructurada de canales con micrófonos, cajas directas, tipo de atril y alimentación phantom.'
  },
  SIN_STAGE_PLOT: {
    type: 'SIN_STAGE_PLOT',
    title: 'Ausencia de Stage Plot / Plano de Escenario',
    penaltyPoints: 15,
    severity: 'ALTA',
    description: 'Falta el plano o croquis de escenario con cotas métricas, ubicación de músicos, tarimas y tomas eléctricas.'
  },
  SIN_CONTACTOS: {
    type: 'SIN_CONTACTOS',
    title: 'Falta de Contactos Técnicos y Versión',
    penaltyPoints: 15,
    severity: 'ALTA',
    description: 'El documento no incluye datos de contacto directo (FOH, Monitores, PM) ni fecha de revisión del documento.'
  },
  HOSPITALIDAD_MEZCLADA: {
    type: 'HOSPITALIDAD_MEZCLADA',
    title: 'Contaminación con Requerimientos de Hospitalidad',
    penaltyPoints: 10,
    severity: 'MEDIA',
    description: 'El rider técnico intercala requerimientos de catering, toallas, bebidas o camerinos en lugar de mantener un documento separado.'
  },
  INFLEXIBLE_SIN_ALTERNATIVAS: {
    type: 'INFLEXIBLE_SIN_ALTERNATIVAS',
    title: 'Inflexibilidad sin Alternativas Homologadas',
    penaltyPoints: 10,
    severity: 'MEDIA',
    description: 'Se exige un único modelo o marca sin ofrecer opciones secundarias equivalentes para la negociación del contra-rider.'
  },
  INCOHERENCIA_CRUZADA: {
    type: 'INCOHERENCIA_CRUZADA',
    title: 'Inconsistencia Cruzada entre Secciones',
    penaltyPoints: 10,
    severity: 'MEDIA',
    description: 'Discrepancia evidente entre el número de canales del Input List, la dotación del Stage Plot o la capacidad de las consolas.'
  },
  ELECTRICO_SIN_TIERRA_AISLADA: {
    type: 'ELECTRICO_SIN_TIERRA_AISLADA',
    title: 'Falta de Tierra Física Aislada para Audio',
    penaltyPoints: 10,
    severity: 'MEDIA',
    description: 'No se especifica línea de acometida eléctrica con tierra técnica aislada para sonido, propiciando bucles de masa y ruido.'
  }
};

export const APPROVED_HARDWARE_CATALOG = {
  paSystems: {
    tier1: ['L-Acoustics (K1, K2, Kara II)', 'd&b audiotechnik (GSL, KSL, V-Series)', 'Meyer Sound (Panther, Lyon, Leopard)'],
    tier2: ['JBL Professional (VTX V25, A12)', 'Adamson Systems (E15, E12, S10)', 'Clair Brothers (C12, i212)'],
    banned: ['Sistemas autoamplificados plásticos de gama baja', 'Sistemas sin rigging certificado', 'Sistemas analógicos sin DSP']
  },
  fohConsoles: {
    tier1: ['DiGiCo Quantum (338, 225, 7)', 'DiGiCo SD-Series (SD12, SD10, SD5)', 'Avid Venue (S6L)', 'Yamaha Rivage PM (PM5, PM7, PM10)'],
    tier2: ['Yamaha CL5 / QL5', 'Allen & Heath dLive (S5000, S7000, C3500)', 'Midas PRO Series'],
    banned: ['Behringer X32 / Wing para shows de gran formato', 'Consolas analógicas con fallas de aislamiento']
  },
  microphonesAndDI: {
    preferredBrands: ['Shure', 'Sennheiser', 'DPA Microphones', 'Neumann', 'AKG', 'Audix', 'Earthworks'],
    directBoxes: ['Radial Engineering (J48, JDI, ProDI)', 'BSS Audio (AR-133)', 'Rupert Neve RNDI']
  },
  inEarSystems: {
    preferred: ['Shure PSM1000', 'Shure PSM900', 'Sennheiser 2000 Series', 'Sennheiser ew G4 IEM']
  }
};
