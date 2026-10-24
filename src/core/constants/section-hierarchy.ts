import type { SectionItem } from '../types/rider.types';

export const AUDIO_GROUP = 'Audio';
export const CONSOLAS_GROUP = 'Consolas';

export const TECH_PA_ID = 'tech-pa';
export const TECH_CONSOLAS_FOH_ID = 'tech-consolas-foh';
export const TECH_CONSOLAS_MONITORES_ID = 'tech-consolas-monitores';

const PATHS: Record<string, string[]> = {
  [TECH_PA_ID]: [AUDIO_GROUP, 'PA'],
  [TECH_CONSOLAS_FOH_ID]: [AUDIO_GROUP, CONSOLAS_GROUP, 'FOH'],
  [TECH_CONSOLAS_MONITORES_ID]: [AUDIO_GROUP, CONSOLAS_GROUP, 'Monitores'],
};

export function sectionPath(section: { id: string }): string[] {
  return PATHS[section.id] ? [...PATHS[section.id]] : [];
}

export function sectionHierarchyLabel(section: { id: string }): string {
  return sectionPath(section).join(' › ');
}

export function sectionHierarchyDepth(section: { id: string }): number {
  const path = sectionPath(section);
  return path.length > 0 ? path.length - 1 : 0;
}

export function sectionLeafTitle(section: { id: string; title?: string }): string {
  const path = sectionPath(section);
  return path[path.length - 1] || section.title || '';
}

type AudioBucket = 'consolas-foh' | 'consolas-monitores';

const KNOWN_META: Record<string, Pick<SectionItem, 'title' | 'subtitle' | 'tag' | 'tagColor' | 'iconName'>> = {
  [TECH_PA_ID]: {
    title: 'PA',
    subtitle: 'Audio · line array, cobertura y SPL',
    tag: AUDIO_GROUP,
    tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
    iconName: 'speaker',
  },
  [TECH_CONSOLAS_FOH_ID]: {
    title: 'Consolas — FOH',
    subtitle: 'Audio › Consolas',
    tag: CONSOLAS_GROUP,
    tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
    iconName: 'headphones',
  },
  [TECH_CONSOLAS_MONITORES_ID]: {
    title: 'Consolas — Monitores',
    subtitle: 'Audio › Consolas',
    tag: CONSOLAS_GROUP,
    tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
    iconName: 'headphones',
  },
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function lineText(line: string): string {
  return line.replace(/^[•◦\-\d.\s]+/, '').trim();
}

function classifyLine(line: string): AudioBucket | null {
  const text = normalize(lineText(line));
  if (!text) return null;
  if (/consola/.test(text) && /monitor/.test(text)) return 'consolas-monitores';
  if (
    /consola/.test(text)
    && /(foh|sala|preferida|principal|quantum|sd12|s6l|rivage|cl5)/.test(text)
  ) {
    return 'consolas-foh';
  }
  if (/(conectividad|cat6e|ethercon|dante|madi|split pasivo)/.test(text)) {
    return 'consolas-foh';
  }
  return null;
}

function splitLines(content: string): { keep: string[]; moved: Record<AudioBucket, string[]> } {
  const moved: Record<AudioBucket, string[]> = {
    'consolas-foh': [],
    'consolas-monitores': [],
  };
  const keep: string[] = [];
  for (const raw of content.split('\n')) {
    const bucket = classifyLine(raw);
    if (bucket) moved[bucket].push(raw);
    else keep.push(raw);
  }
  return { keep, moved };
}

function nodePlain(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const value = node as { text?: string; content?: unknown[] };
  if (typeof value.text === 'string' && value.text.trim()) return value.text;
  return (value.content || []).map(nodePlain).filter(Boolean).join(' ');
}

function sectionPlain(section: SectionItem): string {
  if (section.content?.trim()) return section.content;
  return (section.contentDoc?.content || []).map(nodePlain).filter(Boolean).join('\n');
}

function applyPlainContent(section: SectionItem, content: string): SectionItem {
  const next: SectionItem = { ...section, content };
  if (section.contentDoc) delete next.contentDoc;
  return next;
}

function seedSection(id: string, content: string): SectionItem {
  const meta = KNOWN_META[id];
  return {
    id,
    num: '',
    title: meta.title,
    subtitle: meta.subtitle,
    tag: meta.tag,
    tagColor: meta.tagColor,
    iconName: meta.iconName,
    content,
    type: 'tecnico',
  };
}

function insertAfter(sections: SectionItem[], afterId: string, extra: SectionItem[]): SectionItem[] {
  const index = sections.findIndex((section) => section.id === afterId);
  if (index < 0) return [...sections, ...extra];
  return [...sections.slice(0, index + 1), ...extra, ...sections.slice(index + 1)];
}

function relabelKnown(section: SectionItem): SectionItem {
  const meta = KNOWN_META[section.id];
  return meta ? { ...section, ...meta } : section;
}

export function migratePaConsolasHierarchy(sections: SectionItem[]): SectionItem[] {
  const byId = new Map(sections.map((section) => [section.id, section]));
  if (!byId.has(TECH_PA_ID) && !byId.has('tech-monitores')) return sections;

  let next = sections.map((section) => ({ ...section }));
  const existingFoh = next.find((section) => section.id === TECH_CONSOLAS_FOH_ID);
  const existingMon = next.find((section) => section.id === TECH_CONSOLAS_MONITORES_ID);

  if (existingFoh || existingMon) {
    return next.map((section) => {
      if (!KNOWN_META[section.id]) return section;
      const title = section.title.trim();
      if (!title || /sistema de pa\s*&\s*consola/i.test(title)) return relabelKnown(section);
      return section;
    });
  }

  const incoming: Record<AudioBucket, string[]> = {
    'consolas-foh': [],
    'consolas-monitores': [],
  };

  next = next.map((section) => {
    if (section.id !== TECH_PA_ID && section.id !== 'tech-monitores') return section;
    const split = splitLines(sectionPlain(section));
    incoming['consolas-foh'].push(...split.moved['consolas-foh']);
    incoming['consolas-monitores'].push(...split.moved['consolas-monitores']);
    const updated = applyPlainContent(section, split.keep.join('\n'));
    return section.id === TECH_PA_ID ? relabelKnown(updated) : updated;
  });

  const created = [
    seedSection(TECH_CONSOLAS_FOH_ID, incoming['consolas-foh'].join('\n')),
    seedSection(TECH_CONSOLAS_MONITORES_ID, incoming['consolas-monitores'].join('\n')),
  ];

  const afterId = next.some((section) => section.id === TECH_PA_ID) ? TECH_PA_ID : next[0]?.id;
  return afterId ? insertAfter(next, afterId, created) : [...next, ...created];
}
