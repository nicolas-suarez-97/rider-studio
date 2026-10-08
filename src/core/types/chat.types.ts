import { AgentRole } from './agent.types';

export interface ChatMessageItem {
  id?: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  role?: AgentRole;
  roleName?: string;
  roleAvatar?: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  date: string;
  active: boolean;
  riderId?: string;
  lastMessage?: string;
}
