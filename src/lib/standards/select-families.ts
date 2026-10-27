import type { StandardsFamilyId } from './types';

export const ALL_STANDARD_FAMILIES: StandardsFamilyId[] = [
  'sistema_pa',
  'procesamiento',
  'medicion',
  'consola_foh',
  'perifericos_foh',
  'consola_monitores',
  'personal_audio',
];

export const HOSPITALITY_STANDARD_FAMILIES: StandardsFamilyId[] = [
  'transporte_terrestre',
];

const FAMILY_KEYWORDS: Record<StandardsFamilyId, string[]> = {
  sistema_pa: [
    'pa', 'p.a', 'line array', 'linearray', 'subwoofer', 'subwoofers', 'subs',
    'front fill', 'frontfill', 'outfill', 'delays', 'cobertura', 'spl', 'dba', 'dbc',
    'vatios', 'vatios', 'watts', 'watt', 'l-acoustics', 'l acoustics', 'd&b', 'db audio',
    'meyer', 'jbl', 'adamson', 'martin audio', 'coda', 'nexo', 'rcf', 'electro-voice',
    'clair', 'cohesion', 'outline', 'k1', 'k2', 'kara', 'gsl', 'ksl', 'panther',
    'sistema de pa', 'sistema de sonido', 'sonorización', 'sonorizacion',
  ],
  procesamiento: [
    'procesamiento', 'procesador', 'procesadores', 'lake', 'galileo', 'preset',
    'presets', 'dante', 'aes3', 'milan', 'amplificador', 'amplificadores',
    'controlador', 'la8', 'envíos', 'envios', 'aes',
  ],
  medicion: [
    'medición', 'medicion', 'alineación', 'alineacion', 'alinear', 'smaart',
    'system tech', 'técnico de sistemas', 'tecnico de sistemas', 'micrófono de medición',
    'microfono de medicion', 'laeq',
  ],
  consola_foh: [
    'consola', 'consolas', 'foh', 'sala', 'digico', 'di gi co', 'quantum', 'sd12',
    'sd10', 'avid', 's6l', 'yamaha', 'rivage', 'cl5', 'ql5', 'allen', 'dlive',
    'midas', 'behringer', 'soundcraft', 'ssl', 'show file', 'showfile', 'stage rack',
    'mezcladora',
  ],
  perifericos_foh: [
    'outboard', 'periférico', 'periferico', 'periféricos', 'grabación', 'grabacion',
    'multitrack', 'virtual soundcheck', 'plugin', 'plugins', 'waves', 'soundgrid',
    '1176', 'la2a', 'h90',
  ],
  consola_monitores: [
    'monitores', 'monitor', 'iem', 'in-ear', 'inear', 'wedge', 'cuñas', 'cunas',
    'side fill', 'drum fill', 'mezclas de monitor', 'talkback',
  ],
  personal_audio: [
    'personal', 'crew', 'técnico', 'tecnico', 'ingeniero', 'system tech',
    'traductor', 'horario', 'montaje', 'modo de producción', 'modo de produccion',
    'contactos',
  ],
  transporte_terrestre: [
    'transporte', 'transporte terrestre', 'van', 'vans', 'suv', 'sprinter',
    'runner', 'transfer', 'transfers', 'trayecto', 'trayectos', 'chofer',
    'luggage', 'luggage van', 'cargo van', 'aeropuerto', 'hospitality transporte',
    'hosp-transporte', 'hosp transporte', 'vehículo', 'vehiculo', 'vehículos',
    'vehiculos', 'conductor', 'party',
  ],
};

const TRANSPORT_STRONG_KEYWORDS = [
  'transporte',
  'transporte terrestre',
  'hosp-transporte',
  'hosp transporte',
  'hospitality transporte',
  'sprinter',
  'runner',
  'transfer',
  'transfers',
  'trayecto',
  'trayectos',
  'chofer',
  'cargo van',
  'luggage van',
  'luggage',
  'suv',
  'van',
  'vans',
  'vehiculo',
  'vehículo',
  'vehiculos',
  'vehículos',
];

const TRANSPORT_HOSPITALITY_SUPPORTING = [
  'party',
  'conductor',
  'aeropuerto',
];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function keywordMatches(haystack: string, keyword: string): boolean {
  const needle = normalize(keyword);
  if (needle.length <= 4 || needle === 'party' || needle === 'vans') {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
  }
  return haystack.includes(needle);
}

function scoreFamily(haystack: string, familyId: StandardsFamilyId): number {
  return FAMILY_KEYWORDS[familyId].reduce((score, keyword) => {
    return keywordMatches(haystack, keyword) ? score + 1 : score;
  }, 0);
}

function hasAnyKeyword(haystack: string, keywords: string[]): boolean {
  return keywords.some((keyword) => keywordMatches(haystack, keyword));
}

export function isGroundTransportFocus(input: {
  query?: string;
  sectionTitle?: string;
  sectionText?: string;
  selection?: string;
  sectionTitles?: string[];
  riderType?: string;
}): boolean {
  const haystack = normalize(
    [
      input.query,
      input.sectionTitle,
      input.selection,
      input.sectionText?.slice(0, 500),
      ...(input.sectionTitles || []),
    ]
      .filter(Boolean)
      .join(' \n '),
  );

  if (hasAnyKeyword(haystack, TRANSPORT_STRONG_KEYWORDS)) {
    return true;
  }

  if (input.riderType === 'hospitality' && hasAnyKeyword(haystack, TRANSPORT_HOSPITALITY_SUPPORTING)) {
    return true;
  }

  return false;
}

export function selectStandardFamilies(input: {
  query?: string;
  sectionTitle?: string;
  sectionText?: string;
  selection?: string;
  sectionTitles?: string[];
  riderType?: string;
  mode?: 'chat' | 'review';
  limit?: number;
}): StandardsFamilyId[] {
  const haystack = normalize(
    [
      input.query,
      input.sectionTitle,
      input.selection,
      input.sectionText?.slice(0, 500),
      ...(input.sectionTitles || []),
    ]
      .filter(Boolean)
      .join(' \n '),
  );

  const transportFocus = isGroundTransportFocus(input);
  if (transportFocus && (input.mode !== 'review' || input.riderType === 'hospitality')) {
    return ['transporte_terrestre'];
  }

  const ranked = ALL_STANDARD_FAMILIES
    .map((id) => ({ id, score: scoreFamily(haystack, id) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.id);

  if (input.mode === 'review' && input.riderType !== 'hospitality' && input.riderType !== 'seguridad') {
    return ALL_STANDARD_FAMILIES;
  }

  if (ranked.length > 0) {
    return ranked.slice(0, input.limit ?? 3);
  }

  if (input.riderType === 'hospitality' || input.riderType === 'seguridad') {
    return [];
  }

  return ['sistema_pa', 'consola_foh', 'personal_audio'];
}
