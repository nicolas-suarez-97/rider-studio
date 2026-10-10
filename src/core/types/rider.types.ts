export type RiderType = 'tecnico' | 'hospitality' | 'seguridad';

export interface SectionItem {
  id: string;
  num: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  iconName: string;
  content?: string;
}

export interface RiderDefinition {
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  sections: SectionItem[];
}

export interface ChannelData {
  id: string;
  ch: string;
  name: string;
  mic: string;
  altMic?: string;
  stand: string;
  phantom?: boolean;
  subSnake?: string;
}

export interface LinkedChatSession {
  id: string;
  title: string;
  updatedAt?: string;
}

export interface RiderMediaItem {
  id: string;
  url: string;
  pathname: string;
  cover: boolean;
}

export interface SavedRiderSummary {
  id: string;
  title: string;
  artist: string;
  tour: string;
  type: RiderType;
  progress: number;
  sectionsCompleted: number;
  totalSections: number;
  status: 'completed' | 'in_progress';
  updatedAt: string;
  lastEdited: string;
  coverUrl?: string;
  channels?: ChannelData[];
  sections?: SectionItem[];
  linkedSessions?: LinkedChatSession[];
}

export interface RiderModuleData {
  sections: SectionItem[];
  channels?: ChannelData[];
  completedSectionIds?: string[];
  stagePlot?: StagePlotConfig;
}

export type ExportScope = 'master' | 'tecnico' | 'hospitality' | 'seguridad';

export type StageElementCategory = 'instrument' | 'vocal' | 'amp' | 'monitor' | 'power' | 'riser' | 'snake';

export interface StageElement {
  id: string;
  name: string;
  category: StageElementCategory;
  icon: string;
  x: number;
  y: number;
  channel?: string;
  notes?: string;
  powerRequirement?: string;
}

export interface StagePlotConfig {
  stageWidth: number;
  stageDepth: number;
  stageHeight: number;
  elements: StageElement[];
  referenceImageUrl?: string;
  referenceImagePath?: string;
}
