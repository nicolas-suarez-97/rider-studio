export interface CategoryOption {
  id: string;
  label: string;
  prefix?: string;
}

export interface CategoryNavState {
  items: CategoryOption[];
  activeId: string | null;
  drafts: Record<string, string>;
}

export type NavigateCategoryResult =
  | {
      ok: true;
      state: CategoryNavState;
      action: 'generate' | 'activate';
      regenerate: boolean;
      resetFlow: false;
    }
  | {
      ok: false;
      state: CategoryNavState;
      error: string;
    };

export function createCategoryNav(items: CategoryOption[]): CategoryNavState {
  return { items: items.slice(), activeId: null, drafts: {} };
}

export function visibleCategories(state: CategoryNavState): CategoryOption[] {
  return state.items;
}

export function categorySelectorItems<T extends { kind: 'chat' | 'topic' }>(
  prompts: T[],
  sectionEmpty: boolean,
): T[] {
  if (sectionEmpty) return prompts.slice();
  return prompts.filter((prompt) => prompt.kind === 'topic');
}

export function categoryHasContent(body: string, option: CategoryOption): boolean {
  const needle = (option.prefix || option.label).trim().toLowerCase();
  if (!needle) return false;
  return body.toLowerCase().includes(needle);
}

function persistActiveDraft(state: CategoryNavState, currentDraft?: string): CategoryNavState {
  if (!state.activeId || currentDraft === undefined) return state;
  return {
    ...state,
    drafts: {
      ...state.drafts,
      [state.activeId]: currentDraft,
    },
  };
}

function hasStoredContent(
  state: CategoryNavState,
  option: CategoryOption,
  sectionText?: string,
): boolean {
  if (state.drafts[option.id]?.trim()) return true;
  if (sectionText) return categoryHasContent(sectionText, option);
  return false;
}

export function navigateCategory(
  state: CategoryNavState,
  nextId: string,
  options?: { currentDraft?: string; sectionText?: string; visitedIds?: string[] },
): NavigateCategoryResult {
  const next = persistActiveDraft(state, options?.currentDraft);
  const option = next.items.find((item) => item.id === nextId);

  if (!option) {
    return {
      ok: false,
      state: next,
      error: 'No pude cambiar de categoría. Sigues en la categoría actual con el contenido intacto.',
    };
  }

  const visited = options?.visitedIds?.includes(option.id);
  const known = visited || hasStoredContent(next, option, options?.sectionText);
  return {
    ok: true,
    state: {
      ...next,
      activeId: option.id,
    },
    action: known ? 'activate' : 'generate',
    regenerate: !known,
    resetFlow: false,
  };
}
