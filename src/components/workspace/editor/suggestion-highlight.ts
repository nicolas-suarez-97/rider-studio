"use client";

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/core';
import { DocumentSuggestion } from '@/core/types/suggestion.types';

export function findSectionBounds(doc: PMNode, sectionId: string): { from: number; to: number } | null {
  let from: number | null = null;
  let to: number | null = null;
  doc.forEach((node, pos) => {
    if (node.type.name === 'heading' && node.attrs.id === sectionId) {
      from = pos;
      return;
    }
    if (from !== null && to === null && node.type.name === 'heading' && node.attrs.id) {
      to = pos;
    }
  });
  if (from === null) return null;
  return { from, to: to ?? doc.content.size };
}

export function locateText(doc: PMNode, needle: string, ignoreCase = false, bounds?: { from: number; to: number } | null): { from: number; to: number } | null {
  if (!needle) return null;
  const probe = ignoreCase ? needle.toLowerCase() : needle;
  let found: { from: number; to: number } | null = null;
  const start = bounds?.from ?? 0;
  const end = bounds?.to ?? doc.content.size;

  doc.nodesBetween(start, end, (node, pos) => {
    if (found || !node.isText || !node.text) return;
    const haystack = ignoreCase ? node.text.toLowerCase() : node.text;
    const index = haystack.indexOf(probe);
    if (index >= 0) found = { from: pos + index, to: pos + index + needle.length };
  });

  return found;
}

export function applySuggestionToEditor(editor: Editor, suggestion: DocumentSuggestion): boolean {
  if (suggestion.kind === 'add_channel' || suggestion.kind === 'switch_type') return false;
  const bounds = findSectionBounds(editor.state.doc, suggestion.sectionId);
  const range = suggestion.baseText
    ? locateText(editor.state.doc, suggestion.baseText, false, bounds)
    : null;

  if (suggestion.baseText && !range) return false;

  if (suggestion.kind === 'delete' && range) {
    editor.chain().focus().deleteRange(range).run();
    return true;
  }

  if (range) {
    editor.chain().focus().insertContentAt(range, suggestion.proposedText).run();
    return true;
  }

  const insertAt = bounds?.to ?? editor.state.doc.content.size;
  const prefix = insertAt > 1 ? '\n' : '';
  editor.chain().focus().insertContentAt(insertAt, `${prefix}${suggestion.proposedText}`).run();
  return true;
}

const suggestionKey = new PluginKey('riderSuggestions');
const suggestionsByEditor = new WeakMap<object, DocumentSuggestion[]>();

export function setEditorSuggestions(editor: object, suggestions: DocumentSuggestion[]) {
  suggestionsByEditor.set(editor, suggestions);
}

export const SuggestionHighlights = Extension.create({
  name: 'riderSuggestions',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: suggestionKey,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            for (const suggestion of suggestionsByEditor.get(editor) ?? []) {
              if (
                suggestion.status !== 'pending'
                || suggestion.source === 'gap'
                || suggestion.kind === 'add_channel'
                || suggestion.kind === 'switch_type'
              ) {
                continue;
              }
              const bounds = suggestion.sectionId ? findSectionBounds(state.doc, suggestion.sectionId) : null;
              if (!suggestion.baseText) {
                if (!suggestion.proposedText) continue;
                const position = bounds?.to ?? state.doc.content.size;
                decorations.push(Decoration.widget(position, () => {
                  const widget = document.createElement('div');
                  widget.className = 'rider-suggestion-insert rider-suggestion-block';
                  widget.textContent = suggestion.proposedText;
                  return widget;
                }, {
                  side: -1,
                  key: suggestion.id,
                }));
                continue;
              }
              const range = locateText(state.doc, suggestion.baseText, false, bounds);
              if (!range) continue;
              decorations.push(Decoration.inline(range.from, range.to, { class: 'rider-suggestion-delete' }));
              if (suggestion.kind !== 'delete' && suggestion.proposedText) {
                decorations.push(Decoration.widget(range.to, () => {
                  const insert = document.createElement('span');
                  insert.className = 'rider-suggestion-insert';
                  insert.textContent = suggestion.proposedText;
                  return insert;
                }, {
                  side: 1,
                  key: `${suggestion.id}-insert`,
                }));
              }
            }
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
