export type ChatPanelSize = 'compact' | 'expanded';

export const CHAT_PANEL_RAIL_CLASS = 'xl:w-12';
export const CHAT_PANEL_COMPACT_CLASS = 'xl:w-96';
export const CHAT_PANEL_EXPANDED_CLASS = 'xl:w-[32rem]';

export function chatPanelWidthClass(options: {
  collapsed: boolean;
  expanded: boolean;
}): string {
  if (options.collapsed) return CHAT_PANEL_RAIL_CLASS;
  return options.expanded ? CHAT_PANEL_EXPANDED_CLASS : CHAT_PANEL_COMPACT_CLASS;
}

export function chatExpandControlLabel(expanded: boolean): string {
  return expanded ? 'Contraer chat' : 'Expandir chat';
}
