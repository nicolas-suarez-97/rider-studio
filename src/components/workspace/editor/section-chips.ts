import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as PmNode } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { outlinePromptsForSection, type SectionOutlinePrompt } from '@/core/constants/section-outline-prompts';
import type { RiderType } from '@/core/types/rider.types';

const chipsKey = new PluginKey('sectionChips');

function isRangeEmpty(doc: PmNode, from: number, to: number) {
  let empty = true;
  doc.nodesBetween(from, Math.max(from, to), (node) => {
    if (!empty) return false;
    if (node.type.name === 'image' || node.type.name === 'inputList' || node.type.name === 'transportFleet' || node.type.name === 'table') {
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
) {
  const wrap = document.createElement('div');
  wrap.className = 'docs-section-chips';
  wrap.contentEditable = 'false';
  wrap.setAttribute('data-section-chips', sectionId);

  for (const prompt of prompts) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = prompt.kind === 'chat' ? 'docs-chip docs-chip-chat' : 'docs-chip docs-chip-topic';
    button.setAttribute('aria-label', prompt.label);
    button.title = prompt.label;
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
      onAsk(prompt.prompt, sectionId);
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
        props: {
          decorations(state) {
            if (!options.enabled()) return DecorationSet.empty;
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
              if (!isRangeEmpty(state.doc, from, to)) return [];
              const prompts = outlinePromptsForSection(
                { id: heading.id, title: heading.title },
                options.riderType(),
              );
              if (!prompts.length) return [];
              return [
                Decoration.widget(
                  from,
                  () => renderChips(heading.id, prompts, options.onAsk),
                  {
                    side: -1,
                    key: `chips-${heading.id}`,
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
