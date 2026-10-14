"use client";

import { SectionItem, ChannelData, StagePlotConfig, RiderMediaItem } from '@/core/types/rider.types';
import { ChannelInput } from '@/core/models/ChannelInput';
import { SectionCommentItem } from '@/lib/share/comments';
import { DocumentSuggestion } from '@/core/types/suggestion.types';
import { EditorBridge, RiderDocumentSurface } from './editor/RiderDocumentSurface';
import type { SectionDocumentPatch } from '@/core/editor/content-doc';
import type { RiderType, RiderDocumentTheme } from '@/core/types/rider.types';

interface DocumentEditorPanelProps {
  riderTitle: string;
  artistName: string;
  season?: string;
  riderType?: RiderType;
  documentTheme?: RiderDocumentTheme;
  version?: string;
  onThemeChange?: (theme: RiderDocumentTheme) => void;
  sections: SectionItem[];
  channels?: ChannelInput[];
  completedSectionIds?: string[];
  activeSectionId?: string;
  onActivateSection?: (id: string) => void;
  onReorderSections?: (sections: SectionItem[]) => void;
  onToggleComplete?: (id: string, e?: React.MouseEvent) => void;
  onDeleteSection?: (sectionId: string, title: string) => void;
  onDocumentChange?: (patches: SectionDocumentPatch[]) => void;
  onSelectionChange?: (sectionId: string, text: string) => void;
  suggestions?: DocumentSuggestion[];
  onRegisterBridge?: (bridge: EditorBridge) => void;
  onInsertSection?: () => void;
  onUploadDocumentImage?: (file: File) => Promise<string | null | undefined>;
  onImageError?: (message: string) => void;
  isBlankDocument?: boolean;
  isAssistantThinking?: boolean;
  onAskAssistant?: (text: string, sectionId?: string) => void;
  onUpdateChannel?: (chId: string, field: keyof ChannelData, val: string | boolean) => void;
  onAddChannel?: () => void;
  onDeleteChannel?: (chId: string) => void;
  onExport?: () => void;
  onOpenStagePlot?: () => void;
  onSaveRider?: () => void;
  isSaving?: boolean;
  dbSyncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  onUpdateArtistName?: (val: string) => void;
  onUpdateSeason?: (val: string) => void;
  stagePlot?: StagePlotConfig;
  onUpdateStagePlot?: (newConfig: StagePlotConfig) => void;
  onUploadReferenceImage?: (file: File) => Promise<void>;
  onRemoveReferenceImage?: () => Promise<void>;
  media?: RiderMediaItem[];
  onAddMedia?: (file: File) => Promise<void> | void;
  onRemoveMedia?: (id: string) => Promise<void> | void;
  onMakeCover?: (id: string) => Promise<void> | void;
  mediaBusy?: boolean;
  readOnly?: boolean;
  sectionComments?: SectionCommentItem[];
  openCommentSectionId?: string | null;
  onToggleSectionComments?: (sectionId: string) => void;
  commentAuthorName?: string;
  onSubmitSectionComment?: (sectionId: string, authorName: string, body: string) => Promise<void>;
}

export function DocumentEditorPanel({
  riderTitle,
  artistName,
  sections,
  activeSectionId,
  onActivateSection,
  onDocumentChange,
  onSelectionChange,
  suggestions = [],
  onRegisterBridge,
  onInsertSection,
  onUploadDocumentImage,
  onImageError,
  riderType,
  documentTheme,
  version,
  onThemeChange,
  isBlankDocument = false,
  isAssistantThinking = false,
  onAskAssistant,
  readOnly = false,
}: DocumentEditorPanelProps) {
  return (
    <main className="flex-1 h-full min-h-0 min-w-0 overflow-hidden flex flex-col">
      <RiderDocumentSurface
        riderTitle={riderTitle}
        artistName={artistName}
        sections={sections}
        activeSectionId={activeSectionId}
        readOnly={readOnly}
        suggestions={suggestions}
        onInsertSection={onInsertSection}
        onDocumentChange={onDocumentChange}
        onActivateSection={onActivateSection}
        onSelectionChange={onSelectionChange}
        onRegisterBridge={onRegisterBridge}
        onUploadDocumentImage={onUploadDocumentImage}
        onImageError={onImageError}
        riderType={riderType}
        documentTheme={documentTheme}
        version={version}
        onThemeChange={onThemeChange}
        isBlankDocument={isBlankDocument}
        isAssistantThinking={isAssistantThinking}
        onAskAssistant={onAskAssistant}
      />
    </main>
  );
}
