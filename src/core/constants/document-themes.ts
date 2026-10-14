import { RiderDocumentTheme, RiderType } from '@/core/types/rider.types';

export const RIDER_DOCUMENT_THEMES: Array<{
  id: RiderDocumentTheme;
  label: string;
  description: string;
  swatch: string;
  category: 'Clásico' | 'Escenario' | 'Técnico' | 'Moderno';
}> = [
  {
    id: 'studio',
    label: 'Estudio claro',
    description: 'Documento estándar limpio y universal para producción',
    swatch: '#ffffff',
    category: 'Clásico',
  },
  {
    id: 'festival',
    label: 'Negro de festival',
    description: 'Fondo oscuro de alto contraste para cabina y tarima',
    swatch: '#18181b',
    category: 'Escenario',
  },
  {
    id: 'editorial',
    label: 'Editorial cálido',
    description: 'Tipografía serif y acentos terracota para jazz o teatro',
    swatch: '#ea580c',
    category: 'Clásico',
  },
  {
    id: 'blueprint',
    label: 'Plano técnico',
    description: 'Estilo blueprint azul marino de ingeniería y audio pro',
    swatch: '#0284c7',
    category: 'Técnico',
  },
  {
    id: 'electronic',
    label: 'Electrónica / Club',
    description: 'Obsidiana con acentos violeta para DJs y shows nocturnos',
    swatch: '#8b5cf6',
    category: 'Escenario',
  },
  {
    id: 'carbon',
    label: 'Carbón minimalista',
    description: 'Gris pizarra contemporáneo con diseño suizo pulido',
    swatch: '#475569',
    category: 'Moderno',
  },
  {
    id: 'acoustic',
    label: 'Acústico / Madera',
    description: 'Tonos arena y madera cálida para folk o sets íntimos',
    swatch: '#d97706',
    category: 'Clásico',
  },
  {
    id: 'nordic',
    label: 'Nórdico minimal',
    description: 'Gris escandinavo y acentos verde azulado frescos',
    swatch: '#0d9488',
    category: 'Moderno',
  },
];

export function isRiderDocumentTheme(value: unknown): value is RiderDocumentTheme {
  return (
    value === 'studio' ||
    value === 'festival' ||
    value === 'editorial' ||
    value === 'blueprint' ||
    value === 'electronic' ||
    value === 'carbon' ||
    value === 'acoustic' ||
    value === 'nordic'
  );
}

export function defaultDocumentTheme(): RiderDocumentTheme {
  return 'studio';
}

export function riderKicker(type: RiderType) {
  if (type === 'hospitality') return 'Hospitality';
  if (type === 'seguridad') return 'Seguridad';
  return 'Rider técnico';
}

export function formatRiderDate(date = new Date()) {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
