import { RiderType } from '@/core/types/rider.types';

export type TypeView = 'all' | RiderType;

export const TYPE_VIEW_PARAM = 'tipo';

export const RIDER_TYPE_ORDER: RiderType[] = ['tecnico', 'hospitality', 'seguridad'];

export const TYPE_VIEW_ORDER: TypeView[] = ['all', ...RIDER_TYPE_ORDER];

export interface TypeViewCount {
  sections: number;
  requests: number;
}

export type TypeViewCounts = Record<TypeView, TypeViewCount>;

export interface TypeViewOption {
  id: TypeView;
  label: string;
  shortcut: string;
  icon: string;
  buttonClass: string;
  iconClass: string;
}

export const TYPE_VIEW_OPTIONS: TypeViewOption[] = [
  {
    id: 'all',
    label: 'Todo',
    shortcut: '0',
    icon: 'layers',
    buttonClass: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300',
    iconClass: 'text-slate-500',
  },
  {
    id: 'tecnico',
    label: 'Técnico',
    shortcut: 'T',
    icon: 'speaker',
    buttonClass: 'bg-violet-50 border-violet-200 text-violet-700',
    iconClass: 'text-violet-700',
  },
  {
    id: 'hospitality',
    label: 'Hospitality',
    shortcut: 'H',
    icon: 'coffee',
    buttonClass: 'bg-sky-50 border-sky-200 text-sky-700',
    iconClass: 'text-sky-700',
  },
  {
    id: 'seguridad',
    label: 'Seguridad',
    shortcut: 'S',
    icon: 'shield',
    buttonClass: 'bg-amber-50 border-amber-200 text-amber-700',
    iconClass: 'text-amber-700',
  },
];

export const TYPE_VIEW_BY_ID = Object.fromEntries(
  TYPE_VIEW_OPTIONS.map((option) => [option.id, option]),
) as Record<TypeView, TypeViewOption>;

export function emptyTypeViewCounts(): TypeViewCounts {
  return {
    all: { sections: 0, requests: 0 },
    tecnico: { sections: 0, requests: 0 },
    hospitality: { sections: 0, requests: 0 },
    seguridad: { sections: 0, requests: 0 },
  };
}

export function parseTipoParam(value: string | null | undefined): TypeView {
  if (value === 'tecnico' || value === 'hospitality' || value === 'seguridad') return value;
  return 'all';
}

export function isRiderType(value: TypeView): value is RiderType {
  return value !== 'all';
}
