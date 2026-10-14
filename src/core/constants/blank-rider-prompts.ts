import { RiderType } from '@/core/types/rider.types';

export interface BlankRiderPrompt {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

export const BLANK_RIDER_PROMPTS: Record<RiderType, BlankRiderPrompt[]> = {
  tecnico: [
    {
      id: 'outline',
      label: 'Estructura base',
      icon: 'fileText',
      prompt: '__outline__',
    },
    {
      id: 'full',
      label: 'Redactar rider técnico',
      icon: 'sparkles',
      prompt: 'Arma un rider técnico completo para este artista: contactos, PA y consola FOH, monitores e IEM, backline, input list, stage plot, iluminación y cláusulas. Usa el formato de secciones del documento y deja placeholders claros donde falte un dato.',
    },
    {
      id: 'pa',
      label: 'PA y consola FOH',
      icon: 'speaker',
      prompt: 'Propón el sistema de PA, cobertura SPL y consola FOH típicos para un rider técnico profesional, listos para pegar en el documento.',
    },
    {
      id: 'inputlist',
      label: 'Input list de banda',
      icon: 'list',
      prompt: 'Genera un input list típico de banda (voz, batería, bajo, guitarras, keys, playback) con microfonía y notas de phantom, para incluir en el rider.',
    },
    {
      id: 'stage',
      label: 'Stage plot y RF',
      icon: 'map',
      prompt: 'Describe el stage plot, acometida eléctrica, IEM y coordinación RF que debería llevar este rider técnico.',
    },
  ],
  hospitality: [
    {
      id: 'outline',
      label: 'Estructura base',
      icon: 'fileText',
      prompt: '__outline__',
    },
    {
      id: 'full',
      label: 'Redactar hospitality',
      icon: 'sparkles',
      prompt: 'Arma un rider de hospitality completo: camerinos, catering, dietas, hotel, transporte y wellness. Usa secciones claras y placeholders donde falte un dato.',
    },
    {
      id: 'green',
      label: 'Camerinos y catering',
      icon: 'coffee',
      prompt: 'Propón camerinos, green room y catering para una banda en gira, con cantidades y restricciones alimentarias típicas.',
    },
    {
      id: 'hotel',
      label: 'Hotel y transporte',
      icon: 'hotel',
      prompt: 'Define requisitos de hotel, late checkout, ground transportation y runners para el rider de hospitality.',
    },
    {
      id: 'voice',
      label: 'Cuidado vocal',
      icon: 'heartPulse',
      prompt: 'Incluye cláusulas de cuidado vocal, climatización de camerino y kit de wellness para el rider de hospitality.',
    },
  ],
  seguridad: [
    {
      id: 'outline',
      label: 'Estructura base',
      icon: 'fileText',
      prompt: '__outline__',
    },
    {
      id: 'full',
      label: 'Redactar seguridad',
      icon: 'sparkles',
      prompt: 'Arma un rider de seguridad completo: perímetro, foso, acreditaciones, crowd, emergencias y escolta. Usa secciones claras y placeholders donde falte un dato.',
    },
    {
      id: 'mojo',
      label: 'Foso y vallas',
      icon: 'barrier',
      prompt: 'Define el foso, vallas Mojo, distancias a tarima y pasillos de extracción para este rider de seguridad.',
    },
    {
      id: 'access',
      label: 'Accesos y pases',
      icon: 'badge',
      prompt: 'Propón el esquema de acreditaciones, backstage, parkings y control de accesos del rider de seguridad.',
    },
    {
      id: 'emergency',
      label: 'Emergencias',
      icon: 'shield',
      prompt: 'Redacta el protocolo de emergencias, ambulancia y puntos de reunión para el rider de seguridad.',
    },
  ],
};

export const BLANK_COMPOSER_PLACEHOLDER = 'Escribir con el asistente…';
