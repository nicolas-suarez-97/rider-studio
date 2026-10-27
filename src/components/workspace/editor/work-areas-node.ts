import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { WorkAreasBlock } from '@/components/workspace/editor/WorkAreasBlock';
import { createWorkArea, normalizeWorkAreas, type WorkArea } from '@/core/constants/work-areas';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    workAreas: {
      insertWorkAreas: (areas?: WorkArea[]) => ReturnType;
    };
  }
}

export const WorkAreas = Node.create({
  name: 'workAreas',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      areas: {
        default: [],
        parseHTML: (element) => {
          const raw = element.getAttribute('data-areas');
          if (!raw) return [];
          try {
            return normalizeWorkAreas(JSON.parse(decodeURIComponent(raw)));
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => ({
          'data-areas': encodeURIComponent(JSON.stringify(normalizeWorkAreas(attributes.areas))),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="work-areas"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'work-areas' }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(WorkAreasBlock, {
      as: 'div',
      className: 'docs-work-areas-node',
    });
  },
  addCommands() {
    return {
      insertWorkAreas:
        (areas) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { areas: normalizeWorkAreas(areas ?? [createWorkArea()]) },
          }),
    };
  },
});
