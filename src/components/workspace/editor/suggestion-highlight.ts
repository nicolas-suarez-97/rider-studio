"use client";

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/core';
import { DocumentSuggestion } from '@/core/types/suggestion.types';
import { previewRiderMarkup, riderMarkupToContent } from '@/core/editor/rider-markup';

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

export interface ApplySuggestionResult {
  success: boolean;
  appliedRange?: { from: number; to: number };
}

export function applySuggestionToEditor(editor: Editor, suggestion: DocumentSuggestion): ApplySuggestionResult {
  if (
    suggestion.kind === 'add_channel' ||
    suggestion.kind === 'switch_type' ||
    suggestion.kind === 'switch_theme' ||
    suggestion.kind === 'add_section'
  ) {
    return { success: false };
  }

  const bounds = findSectionBounds(editor.state.doc, suggestion.sectionId);
  const range = suggestion.baseText
    ? locateText(editor.state.doc, suggestion.baseText, false, bounds)
    : null;

  if (suggestion.baseText && !range) return { success: false };

  const beforeSize = editor.state.doc.content.size;

  if (suggestion.kind === 'delete' && range) {
    editor.chain().focus().deleteRange(range).run();
    return {
      success: true,
      appliedRange: { from: range.from, to: range.from },
    };
  }

  if (range) {
    const blocks = riderMarkupToContent(suggestion.proposedText);
    const content = blocks || suggestion.proposedText;
    editor.chain().focus().insertContentAt(range, content).run();
    const afterSize = editor.state.doc.content.size;
    const diff = afterSize - (beforeSize - (range.to - range.from));
    const to = range.from + Math.max(0, diff);
    return {
      success: true,
      appliedRange: { from: range.from, to },
    };
  }

  const insertAt = bounds?.to ?? editor.state.doc.content.size;
  const blocks = riderMarkupToContent(suggestion.proposedText);
  if (blocks) {
    editor.chain().focus().insertContentAt(insertAt, blocks).run();
    const afterSize = editor.state.doc.content.size;
    const diff = Math.max(0, afterSize - beforeSize);
    return {
      success: true,
      appliedRange: { from: insertAt, to: insertAt + diff },
    };
  }

  const prefix = insertAt > 1 ? '\n' : '';
  const textToInsert = `${prefix}${suggestion.proposedText}`;
  editor.chain().focus().insertContentAt(insertAt, textToInsert).run();
  const afterSize = editor.state.doc.content.size;
  const diff = Math.max(0, afterSize - beforeSize);
  return {
    success: true,
    appliedRange: { from: insertAt, to: insertAt + diff },
  };
}

export function revertSuggestionFromEditor(editor: Editor, suggestion: DocumentSuggestion): boolean {
  if (
    suggestion.kind === 'add_channel' ||
    suggestion.kind === 'switch_type' ||
    suggestion.kind === 'switch_theme' ||
    suggestion.kind === 'add_section'
  ) {
    return false;
  }

  const docSize = editor.state.doc.content.size;

  if (suggestion.appliedRange) {
    const from = Math.max(0, Math.min(suggestion.appliedRange.from, docSize));
    const to = Math.max(from, Math.min(suggestion.appliedRange.to, docSize));

    if (suggestion.kind === 'delete' && suggestion.baseText) {
      editor.chain().focus().insertContentAt(from, suggestion.baseText).run();
      return true;
    }

    if (suggestion.kind === 'replace') {
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, suggestion.baseText).run();
      return true;
    }

    // Default insert revert: delete the inserted range
    editor.chain().focus().deleteRange({ from, to }).run();
    return true;
  }

  // Fallback if appliedRange wasn't tracked: locate proposedText
  if (suggestion.proposedText) {
    const bounds = findSectionBounds(editor.state.doc, suggestion.sectionId);
    const range = locateText(editor.state.doc, suggestion.proposedText, false, bounds);
    if (range) {
      if (suggestion.baseText) {
        editor.chain().focus().insertContentAt(range, suggestion.baseText).run();
      } else {
        editor.chain().focus().deleteRange(range).run();
      }
      return true;
    }
  }

  return false;
}

export function createAppliedBanner(suggestion: DocumentSuggestion): HTMLElement {
  const banner = document.createElement('div');
  banner.className = 'rider-applied-banner';
  banner.dataset.suggestionId = suggestion.id;

  const info = document.createElement('div');
  info.className = 'rider-applied-banner-info';

  const pill = document.createElement('span');
  pill.className = 'rider-applied-pill';
  pill.innerHTML = `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
    </svg>
    <span>Modificación aplicada</span>
  `;

  const text = document.createElement('span');
  text.className = 'rider-applied-rationale';
  text.textContent = suggestion.rationale || 'Cambio propuesto por el Asistente';

  info.appendChild(pill);
  info.appendChild(text);

  const actions = document.createElement('div');
  actions.className = 'rider-applied-actions';

  const acceptBtn = document.createElement('button');
  acceptBtn.type = 'button';
  acceptBtn.className = 'rider-applied-btn-accept';
  acceptBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span>Aceptar</span>
  `;
  acceptBtn.title = 'Aceptar permanentemente en el documento';
  acceptBtn.onmousedown = (e) => e.stopPropagation();
  acceptBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('rider:accept-suggestion', { detail: { id: suggestion.id } }));
  };

  const rejectBtn = document.createElement('button');
  rejectBtn.type = 'button';
  rejectBtn.className = 'rider-applied-btn-reject';
  rejectBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
    <span>Rechazar</span>
  `;
  rejectBtn.title = 'Deshacer y restaurar texto anterior';
  rejectBtn.onmousedown = (e) => e.stopPropagation();
  rejectBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('rider:reject-suggestion', { detail: { id: suggestion.id } }));
  };

  actions.appendChild(acceptBtn);
  actions.appendChild(rejectBtn);

  banner.appendChild(info);
  banner.appendChild(actions);

  return banner;
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
            const docSize = state.doc.content.size;

            for (const suggestion of suggestionsByEditor.get(editor) ?? []) {
              if (
                suggestion.source === 'gap' ||
                suggestion.kind === 'add_channel' ||
                suggestion.kind === 'switch_type' ||
                suggestion.kind === 'switch_theme' ||
                suggestion.kind === 'add_section'
              ) {
                continue;
              }

              // Caso 1: Sugerencia directamente aplicada en el documento -> Widget con botones Aceptar/Rechazar
              if (suggestion.status === 'applied') {
                if (suggestion.appliedRange && suggestion.appliedRange.from < suggestion.appliedRange.to) {
                  const from = Math.max(0, Math.min(suggestion.appliedRange.from, docSize));
                  const to = Math.max(from, Math.min(suggestion.appliedRange.to, docSize));
                  if (from < to) {
                    decorations.push(Decoration.inline(from, to, { class: 'rider-applied-highlight' }));
                  }
                  decorations.push(
                    Decoration.widget(to, () => createAppliedBanner(suggestion), {
                      side: 1,
                      key: `applied-banner-${suggestion.id}`,
                    })
                  );
                } else {
                  const bounds = suggestion.sectionId ? findSectionBounds(state.doc, suggestion.sectionId) : null;
                  const pos = Math.min(bounds?.to ?? docSize, docSize);
                  decorations.push(
                    Decoration.widget(pos, () => createAppliedBanner(suggestion), {
                      side: 1,
                      key: `applied-banner-${suggestion.id}`,
                    })
                  );
                }
                continue;
              }

              // Caso 2: Sugerencia pendiente en modo preview
              if (suggestion.status === 'pending') {
                const bounds = suggestion.sectionId ? findSectionBounds(state.doc, suggestion.sectionId) : null;
                if (!suggestion.baseText) {
                  if (!suggestion.proposedText) continue;
                  const position = Math.min(bounds?.to ?? docSize, docSize);
                  decorations.push(Decoration.widget(position, () => {
                    const widget = document.createElement('div');
                    widget.className = 'rider-suggestion-insert rider-suggestion-block';
                    widget.textContent = previewRiderMarkup(suggestion.proposedText);
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
                    insert.textContent = previewRiderMarkup(suggestion.proposedText);
                    return insert;
                  }, {
                    side: 1,
                    key: `${suggestion.id}-insert`,
                  }));
                }
              }
            }
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
