import { AgentRole } from './agent.types';
import { RiderType } from './rider.types';

export interface LinkedRiderInfo {
  id: string;
  title: string;
  artistName: string;
  riderType: RiderType;
}

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: 'image' | 'pdf' | 'text' | 'document';
  previewUrl?: string;
  extractedText?: string;
  truncated?: boolean;
}

export interface ChatMessageItem {
  id?: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  role?: AgentRole;
  roleName?: string;
  roleAvatar?: string;
  attachments?: ChatAttachment[];
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  date: string;
  active: boolean;
  riderId?: string | null;
  riderInfo?: LinkedRiderInfo | null;
  lastMessage?: string;
}
