import type { RiderContentDoc, RiderContentNode, SectionItem } from '../types/rider.types';

export const WORK_AREAS_SECTION_ID = 'tech-areas-trabajo';

export const WORK_AREA_LOCATIONS = [
  { id: 'foh', label: 'FOH' },
  { id: 'backstage', label: 'Backstage' },
  { id: 'lateral', label: 'Lateral' },
  { id: 'oficina', label: 'Oficina' },
  { id: 'otro', label: 'Otro' },
] as const;

export type WorkAreaLocation = (typeof WORK_AREA_LOCATIONS)[number]['id'];

export type WorkArea = {
  id: string;
  name: string;
  location: WorkAreaLocation;
  notes: string;
};

const LOCATION_IDS = new Set<string>(WORK_AREA_LOCATIONS.map((item) => item.id));

function uid(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function workAreaLocationLabel(location: WorkAreaLocation): string {
  return WORK_AREA_LOCATIONS.find((item) => item.id === location)?.label || 'Otro';
}

export function parseWorkAreaLocation(value: unknown): WorkAreaLocation {
  if (typeof value !== 'string') return 'otro';
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (LOCATION_IDS.has(normalized)) return normalized as WorkAreaLocation;
  if (normalized === 'foh' || normalized.includes('front of house') || normalized === 'sala') return 'foh';
  if (normalized.includes('backstage')) return 'backstage';
  if (normalized.includes('lateral') || normalized.includes('wing')) return 'lateral';
  if (normalized.includes('oficina') || normalized.includes('office')) return 'oficina';
  return 'otro';
}

export function createWorkArea(partial?: Partial<WorkArea>): WorkArea {
  return {
    id: partial?.id || uid('area'),
    name: typeof partial?.name === 'string' ? partial.name : '',
    location: parseWorkAreaLocation(partial?.location),
    notes: typeof partial?.notes === 'string' ? partial.notes : '',
  };
}

export function normalizeWorkAreas(raw: unknown): WorkArea[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (!item || typeof item !== 'object') return createWorkArea();
    const row = item as Record<string, unknown>;
    return createWorkArea({
      id: typeof row.id === 'string' ? row.id : undefined,
      name: typeof row.name === 'string' ? row.name : '',
      location: parseWorkAreaLocation(row.location),
      notes: typeof row.notes === 'string' ? row.notes : '',
    });
  });
}

export function updateWorkArea(areas: WorkArea[], id: string, patch: Partial<WorkArea>): WorkArea[] {
  return areas.map((area) => (
    area.id === id
      ? createWorkArea({
          ...area,
          ...patch,
          id: area.id,
        })
      : area
  ));
}

export function removeWorkArea(areas: WorkArea[], id: string): WorkArea[] {
  return areas.filter((area) => area.id !== id);
}

export function moveWorkArea(areas: WorkArea[], id: string, direction: 'up' | 'down'): WorkArea[] {
  const index = areas.findIndex((area) => area.id === id);
  if (index < 0) return areas;
  const nextIndex = direction === 'up' ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= areas.length) return areas;
  const next = [...areas];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

export function formatWorkAreasPlainText(areas: WorkArea[]): string {
  return areas
    .map((area) => {
      const name = area.name.trim() || 'Área sin nombre';
      const location = workAreaLocationLabel(area.location);
      const notes = area.notes.trim();
      return notes ? `${name} · ${location} — ${notes}` : `${name} · ${location}`;
    })
    .join('\n');
}

export function workAreasNode(areas: WorkArea[] = []): RiderContentNode {
  return {
    type: 'workAreas',
    attrs: { areas: normalizeWorkAreas(areas) },
  };
}

export function workAreasDoc(areas: WorkArea[] = []): RiderContentDoc {
  return { type: 'doc', content: [workAreasNode(areas)] };
}

export function parseWorkAreasFromDoc(doc: RiderContentDoc | RiderContentNode | undefined): WorkArea[] {
  if (!doc) return [];
  const nodes = doc.type === 'doc' ? (doc.content || []) : [doc];
  for (const node of nodes) {
    if (node.type === 'workAreas') {
      return normalizeWorkAreas(node.attrs?.areas);
    }
    if (node.content?.length) {
      const nested = parseWorkAreasFromDoc({ type: 'doc', content: node.content });
      if (nested.length) return nested;
    }
  }
  return [];
}

export function workAreasTemplateSection(): SectionItem {
  return {
    id: WORK_AREAS_SECTION_ID,
    num: '07',
    title: 'Áreas de trabajo',
    subtitle: 'FOH, backstage, laterales y oficinas técnicas',
    tag: 'Áreas',
    tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
    iconName: 'door',
    content: '',
    type: 'tecnico',
  };
}

export function shouldInsertWorkAreasSection(sections: Array<{ id: string }>): boolean {
  if (sections.some((section) => section.id === WORK_AREAS_SECTION_ID)) return false;
  return sections.some((section) => section.id === 'tech-pa' || section.id === 'tech-backline');
}

export function insertWorkAreasSection<T extends { id: string }>(sections: T[]): Array<T | SectionItem> {
  if (!shouldInsertWorkAreasSection(sections)) return sections;
  const section: SectionItem = {
    ...workAreasTemplateSection(),
    contentDoc: workAreasDoc(),
  };
  const after = sections.findIndex((item) => item.id === 'tech-stageplot');
  if (after >= 0) {
    return [...sections.slice(0, after + 1), section, ...sections.slice(after + 1)];
  }
  const backline = sections.findIndex((item) => item.id === 'tech-backline');
  if (backline >= 0) {
    return [...sections.slice(0, backline + 1), section, ...sections.slice(backline + 1)];
  }
  return [...sections, section];
}

export function isWorkAreasSectionId(id: string): boolean {
  return id === WORK_AREAS_SECTION_ID;
}

export function isWorkAreasTitle(title: string): boolean {
  return title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .includes('areas de trabajo');
}
