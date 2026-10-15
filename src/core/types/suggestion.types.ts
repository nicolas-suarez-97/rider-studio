import { RiderDocumentTheme, RiderType } from '@/core/types/rider.types';

export type SuggestionKind =
  | 'insert'
  | 'replace'
  | 'delete'
  | 'add_channel'
  | 'switch_type'
  | 'add_section'
  | 'switch_theme';

export type SuggestionStatus = 'pending' | 'applied' | 'accepted' | 'rejected' | 'stale';
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
  applied?: boolean;
  appliedRange?: { from: number; to: number };
  oldRange?: { from: number; to: number };
  newSectionTitle?: string;
  theme?: RiderDocumentTheme;
  channel?: { name: string; mic?: string; stand?: string };
  riderType?: RiderType;
}

export interface EditorContextPayload {
  sectionId: string;
  sectionTitle: string;
  sectionText: string;
  selection: string;
  gaps: string[];
  allSections?: Array<{ id: string; title: string }>;
  riderTitle?: string;
  artistName?: string;
  currentTheme?: RiderDocumentTheme;
}
