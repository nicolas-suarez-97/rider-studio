import { RiderType } from '@/core/types/rider.types';

export type SuggestionKind = 'insert' | 'replace' | 'delete' | 'add_channel' | 'switch_type';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'stale';
export type SuggestionSource = 'agent' | 'gap';

export interface DocumentSuggestion {
  id: string;
  sectionId: string;
  kind: SuggestionKind;
  baseText: string;
  proposedText: string;
  rationale: string;
  status: SuggestionStatus;
  source: SuggestionSource;
  channel?: { name: string; mic?: string; stand?: string };
  riderType?: RiderType;
}

export interface EditorContextPayload {
  sectionId: string;
  sectionTitle: string;
  sectionText: string;
  selection: string;
  gaps: string[];
}
