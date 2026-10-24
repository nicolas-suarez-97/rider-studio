import { Extension, type Editor } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  NEGOTIABILITY_VALUES,
  negotiabilityLabel,
  readNegotiability,
  readNegotiabilityNote,
  type Negotiability,
} from '@/core/negociabilidad/negociabilidad';

const key = new PluginKey('sectionNegotiability');

function applyAttrs(
  editor: Editor,
  pos: number,
  node: PmNode,
  patch: { negotiability?: Negotiability; negotiabilityNote?: string }
) {
  editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, {
    ...node.attrs,
    ...patch,
  }));
}

function renderBar(editor: Editor, pos: number, node: PmNode) {
  const readOnly = !editor.isEditable;
  const state = readNegotiability(node.attrs.negotiability);
  const note = readNegotiabilityNote(node.attrs.negotiabilityNote);
  const wrap = document.createElement('div');
  wrap.className = `docs-negotiability is-${state}${readOnly ? ' is-readonly' : ''}`;
  wrap.contentEditable = 'false';
  wrap.setAttribute('data-section-negotiability', typeof node.attrs.id === 'string' ? node.attrs.id : '');

  const badge = document.createElement('span');
  badge.className = `docs-negotiability-badge is-${state}`;
  badge.textContent = negotiabilityLabel(state);
  wrap.appendChild(badge);

  if (!readOnly) {
    const group = document.createElement('div');
    group.className = 'docs-negotiability-states';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Negociabilidad del pedido');
    for (const value of NEGOTIABILITY_VALUES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = negotiabilityLabel(value);
      button.setAttribute('aria-pressed', String(state === value));
      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const current = editor.state.doc.nodeAt(pos);
        if (!current) return;
        applyAttrs(editor, pos, current, { negotiability: value });
      });
      group.appendChild(button);
    }
    wrap.appendChild(group);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'docs-negotiability-note';
    input.setAttribute('aria-label', 'Observación de negociabilidad');
    input.placeholder = 'Observación (opcional)';
    input.value = note;
    input.addEventListener('mousedown', (event) => event.stopPropagation());
    input.addEventListener('change', () => {
      const current = editor.state.doc.nodeAt(pos);
      if (!current) return;
      applyAttrs(editor, pos, current, { negotiabilityNote: input.value });
    });
    wrap.appendChild(input);
  } else if (note) {
    const observation = document.createElement('span');
    observation.className = 'docs-negotiability-note-text';
    observation.textContent = note;
    wrap.appendChild(observation);
  }

  return wrap;
}

export const SectionNegotiability = Extension.create({
  name: 'sectionNegotiability',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.forEach((node, pos) => {
              if (node.type.name !== 'heading' || node.attrs.level !== 2) return;
              if (typeof node.attrs.id !== 'string' || !node.attrs.id) return;
              decorations.push(Decoration.widget(
                pos + node.nodeSize,
                () => renderBar(editor, pos, node),
                {
                  side: 1,
                  key: `neg-${node.attrs.id}`,
                  ignoreSelection: true,
                  stopEvent: (event) => {
                    const target = event.target as HTMLElement | null;
                    return Boolean(target?.closest?.('.docs-negotiability'));
                  },
                },
              ));
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
