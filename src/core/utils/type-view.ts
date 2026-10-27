import { isDocumentCover, isDocumentIntro } from '@/core/editor/content-doc';
import {
  emptyTypeViewCounts,
  RIDER_TYPE_ORDER,
  type TypeView,
  type TypeViewCounts,
} from '@/core/constants/rider-type-tokens';
import { collectTransportCardsFromSection } from '@/core/constants/transporte-terrestre';
import { RiderContentNode, RiderType, SectionItem } from '@/core/types/rider.types';
import type { ContraLine } from '@/core/types/contra-rider.types';

function countRequirementNodes(node: RiderContentNode | undefined): number {
  if (!node) return 0;
  const self = node.type === 'requirement' ? 1 : 0;
  return self + (node.content || []).reduce((sum, child) => sum + countRequirementNodes(child), 0);
}

export function countRequestsInSection(section: SectionItem): number {
  const transportCards = collectTransportCardsFromSection(section).length;
  if (transportCards > 0) return transportCards;
  const fromDoc = (section.contentDoc?.content || []).reduce(
    (sum, node) => sum + countRequirementNodes(node),
    0,
  );
  if (fromDoc > 0) return fromDoc;
  return (section.content || '').trim() ? 1 : 0;
}

export function sectionType(section: SectionItem, fallback: RiderType = 'tecnico'): RiderType {
  return section.type || fallback;
}

export function isOutlineSection(section: SectionItem): boolean {
  return !isDocumentIntro(section.id) && !isDocumentCover(section.id);
}

export function countByType(
  sections: SectionItem[],
  fallback: RiderType = 'tecnico',
): TypeViewCounts {
  const result = emptyTypeViewCounts();
  for (const section of sections) {
    if (!isOutlineSection(section)) continue;
    const type = sectionType(section, fallback);
    const requests = countRequestsInSection(section);
    result[type].sections += 1;
    result[type].requests += requests;
    result.all.sections += 1;
    result.all.requests += requests;
  }
  return result;
}

export function filterSections(
  sections: SectionItem[],
  view: TypeView,
  fallback: RiderType = 'tecnico',
): SectionItem[] {
  if (view === 'all') return sections;
  return sections.filter((section) => (
    !isOutlineSection(section) || sectionType(section, fallback) === view
  ));
}

export function mergeVisibleReorder(
  all: SectionItem[],
  visibleOrdered: SectionItem[],
): SectionItem[] {
  const order = new Map(visibleOrdered.map((section, index) => [section.id, index]));
  if (order.size === 0) return all;
  const queue = all
    .filter((section) => order.has(section.id))
    .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
  return all.map((section) => (
    order.has(section.id) ? queue.shift() || section : section
  ));
}

export function countByContraLines(lines: Array<Pick<ContraLine, 'module' | 'response'>>): TypeViewCounts {
  const result = emptyTypeViewCounts();
  for (const line of lines) {
    result[line.module].requests += 1;
    result.all.requests += 1;
    if (line.response) {
      result[line.module].sections += 1;
      result.all.sections += 1;
    }
  }
  return result;
}

export function stampSectionType(section: SectionItem, type: RiderType): SectionItem {
  return { ...section, type: section.type || type };
}

export function flattenTypedSections(
  current: SectionItem[],
  currentType: RiderType,
  modules: Partial<Record<RiderType, { sections?: SectionItem[] }>>,
): SectionItem[] {
  const covers: SectionItem[] = [];
  const buckets: Record<RiderType, SectionItem[]> = {
    tecnico: [],
    hospitality: [],
    seguridad: [],
  };
  const seen = new Set<string>();

  const take = (section: SectionItem, type: RiderType) => {
    const stamped = stampSectionType(section, type);
    if (seen.has(stamped.id)) return;
    seen.add(stamped.id);
    if (isDocumentCover(stamped.id) || isDocumentIntro(stamped.id)) {
      covers.push(stamped);
      return;
    }
    buckets[sectionType(stamped, type)].push(stamped);
  };

  current.forEach((section) => take(section, currentType));
  for (const type of RIDER_TYPE_ORDER) {
    for (const section of modules[type]?.sections || []) {
      take(section, type);
    }
  }

  return [
    ...covers.slice(0, 1),
    ...RIDER_TYPE_ORDER.flatMap((type) => buckets[type]),
  ];
}
