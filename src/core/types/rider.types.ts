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
  stand: string;
}

export interface LinkedChatSession {
  id: string;
  title: string;
  updatedAt?: string;
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
  lastEdited: string;
  channels?: ChannelData[];
  sections?: SectionItem[];
  linkedSessions?: LinkedChatSession[];
}
