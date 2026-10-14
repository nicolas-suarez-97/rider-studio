import { RiderDocumentTheme, RiderType } from '@/core/types/rider.types';

export const RIDER_DOCUMENT_THEMES: Array<{
  id: RiderDocumentTheme;
  label: string;
  description: string;
  swatch: string;
}> = [
  {
    id: 'studio',
    label: 'Estudio claro',
    description: 'Papel blanco y una sola tinta',
    swatch: '#ffffff',
  },
  {
    id: 'festival',
    label: 'Negro de festival',
    description: 'Portada oscura y tablas densas',
    swatch: '#111111',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Portada cálida, títulos grandes',
    swatch: '#c2410c',
  },
];

export function isRiderDocumentTheme(value: unknown): value is RiderDocumentTheme {
  return value === 'studio' || value === 'festival' || value === 'editorial';
}

export function defaultDocumentTheme(type: RiderType): RiderDocumentTheme {
  if (type === 'hospitality') return 'editorial';
  if (type === 'seguridad') return 'studio';
  return 'festival';
}

export function riderKicker(type: RiderType) {
  if (type === 'hospitality') return 'Hospitality';
  if (type === 'seguridad') return 'Seguridad';
  return 'Rider técnico';
}

export function formatRiderDate(date = new Date()) {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
