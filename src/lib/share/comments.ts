import { Rider } from '@/core/models/Rider';

export interface SectionCommentItem {
  id: string;
  sectionId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export function collectRiderSectionIds(rider: Rider): Set<string> {
  const ids = new Set<string>();
  for (const moduleData of Object.values(rider.getAllModules())) {
    for (const section of moduleData.sections || []) {
      if (section.id) ids.add(section.id);
    }
  }
  return ids;
}
