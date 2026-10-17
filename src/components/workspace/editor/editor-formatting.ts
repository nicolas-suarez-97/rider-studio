import { Extension, Mark, mergeAttributes } from '@tiptap/core';

export interface TextAlignOptions {
  types: string[];
  alignments: string[];
  defaultAlignment: string;
}

export interface FontSizeOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (alignment: string) => ReturnType;
      unsetTextAlign: () => ReturnType;
    };
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const TextAlignExtension = Extension.create<TextAlignOptions>({
  name: 'textAlign',

  addOptions() {
    return {
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
      defaultAlignment: 'left',
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: this.options.defaultAlignment,
            parseHTML: (element) => element.style.textAlign || this.options.defaultAlignment,
            renderHTML: (attributes) => {
              if (!attributes.textAlign || attributes.textAlign === this.options.defaultAlignment) {
                return {};
              }
              return { style: `text-align: ${attributes.textAlign}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextAlign:
        (alignment: string) =>
        ({ commands }) => {
          if (!this.options.alignments.includes(alignment)) {
            return false;
          }
          let hasUpdated = false;
          for (const type of this.options.types) {
            if (commands.updateAttributes(type, { textAlign: alignment })) {
              hasUpdated = true;
            }
          }
          return hasUpdated;
        },

      unsetTextAlign:
        () =>
        ({ commands }) => {
          let hasReset = false;
          for (const type of this.options.types) {
            if (commands.resetAttributes(type, 'textAlign')) {
              hasReset = true;
            }
          }
          return hasReset;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-l': () => this.editor.commands.setTextAlign('left'),
      'Mod-Shift-e': () => this.editor.commands.setTextAlign('center'),
      'Mod-Shift-r': () => this.editor.commands.setTextAlign('right'),
      'Mod-Shift-j': () => this.editor.commands.setTextAlign('justify'),
    };
  },
});

export const FontSizeExtension = Mark.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['text'],
    };
  },

  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.size) {
            return {};
          }
          return {
            style: `font-size: ${attributes.size}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[style*="font-size"]',
        getAttrs: (element) => {
          const size = (element as HTMLElement).style.fontSize;
          return size ? { size } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain, state }) => {
          if (state.selection.empty) {
            if (this.editor.isActive(this.name)) {
              return chain().extendMarkRange(this.name).setMark(this.name, { size }).run();
            }
            const { $from } = state.selection;
            const parent = $from.parent;
            if (parent.isTextblock && parent.content.size > 0) {
              const start = $from.start();
              const end = $from.end();
              return chain()
                .setTextSelection({ from: start, to: end })
                .setMark(this.name, { size })
                .setTextSelection($from.pos)
                .run();
            }
          }
          return chain().setMark(this.name, { size }).run();
        },

      unsetFontSize:
        () =>
        ({ chain, state }) => {
          if (state.selection.empty) {
            const { $from } = state.selection;
            const parent = $from.parent;
            if (parent.isTextblock && parent.content.size > 0) {
              const start = $from.start();
              const end = $from.end();
              return chain()
                .setTextSelection({ from: start, to: end })
                .unsetMark(this.name)
                .setTextSelection($from.pos)
                .run();
            }
          }
          return chain().unsetMark(this.name).run();
        },
    };
  },
});

export interface TextColorOptions {
  types: string[];
}

export const TextColorExtension = Mark.create<TextColorOptions>({
  name: 'textColor',

  addOptions() {
    return {
      types: ['text'],
    };
  },

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).style?.color || null,
        renderHTML: (attributes) => {
          if (!attributes.color) {
            return {};
          }
          return {
            style: `color: ${attributes.color}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[style*="color"]',
        getAttrs: (element) => {
          const color = (element as HTMLElement).style?.color;
          return color ? { color } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

export const HighlightMark = Mark.create({
  name: 'highlight',
  parseHTML() {
    return [{ tag: 'mark' }];
  },
  renderHTML() {
    return ['mark', 0];
  },
});

