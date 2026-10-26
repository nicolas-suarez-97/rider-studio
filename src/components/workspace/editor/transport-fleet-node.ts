import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { emptyTransportCard, normalizeTransportCards } from '@/core/constants/transporte-terrestre';
import { TransportFleetBlock } from '@/components/workspace/editor/TransportFleetBlock';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    transportFleet: {
      insertTransportFleet: () => ReturnType;
    };
  }
}

export const TransportFleet = Node.create({
  name: 'transportFleet',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      cards: {
        default: [],
        parseHTML: (element) => {
          const raw = element.getAttribute('data-cards');
          if (!raw) return [];
          try {
            return normalizeTransportCards(JSON.parse(decodeURIComponent(raw)));
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => ({
          'data-cards': encodeURIComponent(JSON.stringify(normalizeTransportCards(attributes.cards))),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="transport-fleet"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'transport-fleet' }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TransportFleetBlock, {
      as: 'div',
      className: 'docs-transport-fleet-node',
    });
  },
  addCommands() {
    return {
      insertTransportFleet: () => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: { cards: [] },
      }),
    };
  },
});

export { emptyTransportCard };
