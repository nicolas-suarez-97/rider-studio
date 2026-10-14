import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { cloneInputListRows, SAMPLE_INPUT_LIST_ROWS, type InputListRow } from '@/core/constants/input-list';
import { InputListBlock } from '@/components/workspace/editor/InputListBlock';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inputList: {
      insertInputList: (rows?: InputListRow[]) => ReturnType;
    };
  }
}

export const InputList = Node.create({
  name: 'inputList',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      rows: {
        default: cloneInputListRows(),
        parseHTML: (element) => {
          const raw = element.getAttribute('data-rows');
          if (!raw) return cloneInputListRows();
          try {
            return JSON.parse(decodeURIComponent(raw)) as InputListRow[];
          } catch {
            return cloneInputListRows();
          }
        },
        renderHTML: (attributes) => ({
          'data-rows': encodeURIComponent(JSON.stringify(attributes.rows || [])),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="input-list"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'input-list' }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(InputListBlock, {
      as: 'div',
      className: 'docs-input-list-node',
    });
  },
  addCommands() {
    return {
      insertInputList:
        (rows) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { rows: cloneInputListRows(rows ?? SAMPLE_INPUT_LIST_ROWS) },
          }),
    };
  },
});
