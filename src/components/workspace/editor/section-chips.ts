import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { outlinePromptsForSection, type SectionOutlinePrompt } from '@/core/constants/section-outline-prompts';
import { categorySelectorItems, createCategoryNav, navigateCategory } from '@/core/editor/category-navigation';
import type { RiderType } from '@/core/types/rider.types';

type SectionChipsState = Record<string, { activeId: string | null; visited: string[] }>;

const chipsKey = new PluginKey<SectionChipsState>('sectionChips');

function isRangeEmpty(doc: PmNode, from: number, to: number) {
  let empty = true;
  doc.nodesBetween(from, Math.max(from, to), (node) => {
    if (!empty) return false;
    if (node.type.name === 'image' || node.type.name === 'inputList' || node.type.name === 'table') {
      empty = false;
      return false;
    }
    if (node.isText && node.text?.trim()) {
      empty = false;
      return false;
    }
    if (node.isTextblock && node.textContent.trim()) {
      empty = false;
      return false;
    }
    return true;
  });
  return empty;
}

function sparkleSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', 'docs-chip-icon');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'm12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z',
  );
  svg.appendChild(path);
  return svg;
}

function renderChips(
  sectionId: string,
  prompts: SectionOutlinePrompt[],
  onAsk: (prompt: string, sectionId: string) => void,
  options: {
    activeId: string | null;
    visited: string[];
    sectionText: string;
    view: EditorView;
  },
) {
  const wrap = document.createElement('div');
  wrap.className = 'docs-section-chips';
  wrap.contentEditable = 'false';
  wrap.setAttribute('data-section-chips', sectionId);
  wrap.setAttribute('role', 'toolbar');
  wrap.setAttribute('aria-label', 'Categorías del apartado');

  for (const prompt of prompts) {
    const isActive = prompt.kind === 'topic' && prompt.id === options.activeId;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = [
      'docs-chip',
      prompt.kind === 'chat' ? 'docs-chip-chat' : 'docs-chip-topic',
      isActive ? 'docs-chip-active' : '',
    ].filter(Boolean).join(' ');
    button.setAttribute('aria-label', prompt.label);
    button.title = prompt.label;
    button.setAttribute('data-category', prompt.id);
    if (prompt.kind === 'topic') {
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
    if (prompt.kind === 'chat') {
      button.appendChild(sparkleSvg());
    } else {
      const label = document.createElement('span');
      label.textContent = prompt.label;
      button.appendChild(label);
    }
    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (prompt.kind === 'chat') {
        onAsk(prompt.prompt, sectionId);
        return;
      }
      const topics = prompts
        .filter((item) => item.kind === 'topic')
        .map((item) => ({ id: item.id, label: item.label, prefix: item.prefix }));
      const current = createCategoryNav(topics);
      current.activeId = options.activeId;
      const result = navigateCategory(current, prompt.id, {
        sectionText: options.sectionText,
        visitedIds: options.visited,
      });
      if (!result.ok) return;
      options.view.dispatch(options.view.state.tr.setMeta(chipsKey, {
        sectionId,
        activeId: prompt.id,
      }));
      if (result.action === 'generate') onAsk(prompt.prompt, sectionId);
    });
    wrap.appendChild(button);
  }

  return wrap;
}

interface SectionChipsOptions {
  riderType: () => RiderType;
  enabled: () => boolean;
  onAsk: (prompt: string, sectionId: string) => void;
}

export const SectionChips = Extension.create<SectionChipsOptions>({
  name: 'sectionChips',
  addOptions() {
    return {
      riderType: () => 'tecnico' as RiderType,
      enabled: () => true,
      onAsk: () => undefined,
    };
  },
  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        key: chipsKey,
        state: {
          init: () => ({}),
          apply(tr, value) {
            const next = tr.getMeta(chipsKey) as { sectionId: string; activeId: string } | undefined;
            if (!next?.sectionId || !next.activeId) return value;
            const prev = value[next.sectionId] || { activeId: null, visited: [] };
            return {
              ...value,
              [next.sectionId]: {
                activeId: next.activeId,
                visited: prev.visited.includes(next.activeId)
                  ? prev.visited
                  : [...prev.visited, next.activeId],
              },
            };
          },
        },
        props: {
          decorations(state) {
            if (!options.enabled()) return DecorationSet.empty;
            const activeBySection = chipsKey.getState(state) ?? {};
            const headings: { id: string; title: string; pos: number; size: number }[] = [];
            state.doc.forEach((node, pos) => {
              if (node.type.name !== 'heading' || node.attrs.level !== 2) return;
              const id = typeof node.attrs.id === 'string' ? node.attrs.id : '';
              if (!id) return;
              headings.push({
                id,
                title: node.textContent,
                pos,
                size: node.nodeSize,
              });
            });
            const decorations = headings.flatMap((heading, index) => {
              const from = heading.pos + heading.size;
              const to = index + 1 < headings.length ? headings[index + 1].pos : state.doc.content.size;
              const prompts = outlinePromptsForSection(
                { id: heading.id, title: heading.title },
                options.riderType(),
              );
              if (!prompts.length) return [];
              const sectionText = state.doc.textBetween(from, Math.max(from, to), '\n');
              const empty = isRangeEmpty(state.doc, from, to);
              const visiblePrompts = categorySelectorItems(prompts, empty);
              const sectionState = activeBySection[heading.id];
              const activeId = sectionState?.activeId ?? null;
              const visited = sectionState?.visited ?? [];
              return [
                Decoration.widget(
                  from,
                  (view) => renderChips(heading.id, visiblePrompts, options.onAsk, {
                    activeId,
                    visited,
                    sectionText,
                    view,
                  }),
                  {
                    side: -1,
                    key: `chips-${heading.id}-${activeId || 'none'}`,
                    ignoreSelection: true,
                    stopEvent: (event) => {
                      const target = event.target as HTMLElement | null;
                      return Boolean(target?.closest?.('.docs-section-chips'));
                    },
                  },
                ),
              ];
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
