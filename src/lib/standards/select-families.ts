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
};

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function scoreFamily(haystack: string, familyId: StandardsFamilyId): number {
  return FAMILY_KEYWORDS[familyId].reduce((score, keyword) => {
    return haystack.includes(normalize(keyword)) ? score + 1 : score;
  }, 0);
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
