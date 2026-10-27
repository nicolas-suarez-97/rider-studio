export type ComboboxFocusOption = {
  freeText?: boolean;
  label?: string;
};

export const NO_ACTIVE_INDEX = -1;

export function firstUsefulIndex(options: ComboboxFocusOption[]): number {
  const matchIndex = options.findIndex((option) => !option.freeText);
  if (matchIndex >= 0) return matchIndex;
  return options.findIndex((option) => option.freeText);
}

export function nextActiveIndexOnArrowDown(
  current: number,
  options: ComboboxFocusOption[],
  wrap = false,
): number {
  if (options.length === 0) return NO_ACTIVE_INDEX;
  if (current < 0) return firstUsefulIndex(options);
  if (wrap) return (current + 1) % options.length;
  return Math.min(current + 1, options.length - 1);
}
