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

export function locateRangeInDoc(
  doc: PMNode,
  needle: string,
  bounds?: { from: number; to: number } | null
): { from: number; to: number } | null {
  if (!needle || !needle.trim()) return null;
  const start = bounds?.from ?? 0;
  const end = bounds?.to ?? doc.content.size;

  // 1. Coincidencia rápida en un solo nodo de texto
  const single = locateText(doc, needle, true, bounds);
  if (single) return single;

  // 2. Mapeo de caracteres a través de nodos de texto y bloques (multilínea, listas, párrafos)
  const cleanNeedle = needle.trim().replace(/\r\n/g, '\n');
  const textPieces: string[] = [];
  const posMap: number[] = [];

  doc.nodesBetween(start, end, (node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        posMap.push(pos + i);
        textPieces.push(node.text[i]);
      }
    } else if (node.isBlock && textPieces.length > 0 && textPieces[textPieces.length - 1] !== '\n') {
      posMap.push(pos);
      textPieces.push('\n');
    }
  });

  const fullText = textPieces.join('');
  let idx = fullText.toLowerCase().indexOf(cleanNeedle.toLowerCase());

  if (idx >= 0 && idx < posMap.length) {
    const fromPos = posMap[idx];
    const endIdx = Math.min(idx + cleanNeedle.length - 1, posMap.length - 1);
    const toPos = posMap[endIdx] + 1;
    return { from: fromPos, to: toPos };
  }

  // 3. Coincidencia por líneas ancla (primer y último ítem o línea)
  const lines = cleanNeedle
    .split('\n')
    .map((l) => l.trim().replace(/^[•\-\*]\s*/, ''))
    .filter((l) => l.length > 3);

  if (lines.length > 1) {
    const firstLine = lines[0];
    const lastLine = lines[lines.length - 1];
    const firstRange = locateText(doc, firstLine, true, bounds);
    const lastRange = locateText(doc, lastLine, true, bounds);
    if (firstRange && lastRange && firstRange.from < lastRange.to) {
      return { from: firstRange.from, to: lastRange.to };
    }
  }

  return null;
}

export function getSectionContentRange(doc: PMNode, sectionId: string): { from: number; to: number } | null {
  const bounds = findSectionBounds(doc, sectionId);
  if (!bounds) return null;

  let contentFrom = bounds.from;
  const headingNode = doc.nodeAt(bounds.from);
  if (headingNode && headingNode.type.name === 'heading') {
    contentFrom = bounds.from + headingNode.nodeSize;
  }

  if (contentFrom >= bounds.to) {
    return null;
  }

  return { from: contentFrom, to: bounds.to };
}

export function shouldReplaceSectionContent(
  doc: PMNode,
  suggestion: DocumentSuggestion,
  sectionContentRange: { from: number; to: number } | null
): boolean {
  if (!sectionContentRange || sectionContentRange.from >= sectionContentRange.to) {
    return false;
  }
  if (suggestion.kind === 'replace') return true;
  if (suggestion.baseText && suggestion.baseText.trim().length > 0) return true;

  const bounds = findSectionBounds(doc, suggestion.sectionId);
  if (!bounds) return false;
  const headingNode = doc.nodeAt(bounds.from);
  const headingTitle = headingNode?.textContent?.trim().toLowerCase() || '';
  const proposedLower = (suggestion.proposedText || '').toLowerCase();
  const rationaleLower = (suggestion.rationale || '').toLowerCase();

  // Si el título del encabezado aparece en proposedText o rationale
  if (headingTitle && (proposedLower.includes(headingTitle) || rationaleLower.includes(headingTitle))) {
    return true;
  }

  // Palabras significativas del título del encabezado (ej. "artista", "banda", "hospitality")
  const headingWords = headingTitle.split(/\s+/).filter((w) => w.length > 3);
  if (headingWords.some((w) => rationaleLower.includes(w) || proposedLower.includes(w))) {
    return true;
  }

  // Palabras clave de modificación o reemplazo en rationale
  if (/modific|actualiz|cambi|reemplaz|correg|sustitu|ajust/i.test(rationaleLower)) {
    return true;
  }

  // Secciones introductorias o de valor único
  const secId = (suggestion.sectionId || '').toLowerCase();
  if (secId.startsWith('intro') || secId.includes('artist') || secId.includes('banda') || secId.includes('genero')) {
    return true;
  }

  return false;
}

export interface ApplySuggestionResult {
  success: boolean;
  appliedRange?: { from: number; to: number };
  oldRange?: { from: number; to: number };
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
  const sectionContent = getSectionContentRange(editor.state.doc, suggestion.sectionId);

  // ¿Es una modificación o reemplazo?
  const isReplaceIntent =
    suggestion.kind === 'replace' ||
    (Boolean(suggestion.baseText) && suggestion.baseText.trim().length > 0) ||
    shouldReplaceSectionContent(editor.state.doc, suggestion, sectionContent);

  // 1. Caso DELETE puro:
  if (suggestion.kind === 'delete') {
    const deleteRange = locateRangeInDoc(editor.state.doc, suggestion.baseText, bounds);
    if (!deleteRange) return { success: false };
    return {
      success: true,
      oldRange: deleteRange,
      appliedRange: { from: deleteRange.to, to: deleteRange.to },
    };
  }

  // 2. Caso REPLACE / MODIFICACIÓN:
  // La versión vieja se deja en el documento y se sombrea en rojo (oldRange).
  // La versión nueva se inserta a continuación y se sombrea en verde (appliedRange).
  // Al dar en Aprobar, acceptSuggestionInEditor borrará oldRange.
  // Al dar en Rechazar, revertSuggestionFromEditor borrará appliedRange.
  if (isReplaceIntent) {
    let oldRange: { from: number; to: number } | null = null;
    if (suggestion.baseText && suggestion.baseText.trim()) {
      oldRange = locateRangeInDoc(editor.state.doc, suggestion.baseText, bounds);
    }
    // Si no encontró por baseText específico, pero la sección tiene contenido previo:
    if (!oldRange && sectionContent && sectionContent.from < sectionContent.to) {
      oldRange = sectionContent;
    }

    if (oldRange && oldRange.from < oldRange.to) {
      const $from = editor.state.doc.resolve(oldRange.from);
      const $to = editor.state.doc.resolve(oldRange.to);
      const blocks = riderMarkupToContent(suggestion.proposedText);

      let finalOldRange = oldRange;
      if ($from.sameParent($to) && $from.parent.isTextblock && blocks) {
        if ($from.parentOffset === 0 && $to.parentOffset === $from.parent.content.size) {
          finalOldRange = {
            from: $from.before($from.depth),
            to: $from.after($from.depth),
          };
        }
      }

      const insertAt = finalOldRange.to;
      const beforeSize = editor.state.doc.content.size;
      const content = blocks || suggestion.proposedText;

      editor.chain().focus().insertContentAt(insertAt, content).run();
      const afterSize = editor.state.doc.content.size;
      const diff = Math.max(0, afterSize - beforeSize);
      const appliedRange = { from: insertAt, to: insertAt + diff };

      return {
        success: true,
        oldRange: finalOldRange,
        appliedRange,
      };
    }
  }

  // 3. Caso INSERT puro (adición al final de la sección):
  const insertAt = bounds?.to ?? editor.state.doc.content.size;
  const beforeSize = editor.state.doc.content.size;
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

export function acceptSuggestionInEditor(editor: Editor, suggestion: DocumentSuggestion): boolean {
  if (
    suggestion.kind === 'add_channel' ||
    suggestion.kind === 'switch_type' ||
    suggestion.kind === 'switch_theme' ||
    suggestion.kind === 'add_section'
  ) {
    return true;
  }

  const docSize = editor.state.doc.content.size;

  // Si había una versión anterior sombreada en rojo (oldRange):
  // ¡Se elimina del documento para dejar únicamente lo nuevo!
  if (suggestion.oldRange && suggestion.oldRange.from < suggestion.oldRange.to) {
    const from = Math.max(0, Math.min(suggestion.oldRange.from, docSize));
    const to = Math.max(from, Math.min(suggestion.oldRange.to, docSize));
    if (from < to) {
      editor.chain().focus().deleteRange({ from, to }).run();
      return true;
    }
  }

  return true;
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

  // Si había una versión nueva agregada/propuesta (appliedRange):
  // Se elimina la versión nueva, restaurando la versión anterior
  if (suggestion.appliedRange && suggestion.appliedRange.from < suggestion.appliedRange.to) {
    const from = Math.max(0, Math.min(suggestion.appliedRange.from, docSize));
    const to = Math.max(from, Math.min(suggestion.appliedRange.to, docSize));
    if (from < to) {
      editor.chain().focus().deleteRange({ from, to }).run();
      return true;
    }
  }

  return false;
}

export function createAppliedBanner(suggestion: DocumentSuggestion): HTMLElement {
  const banner = document.createElement('div');
  banner.className = 'rider-applied-banner';
  banner.dataset.suggestionId = suggestion.id;
  banner.setAttribute('contenteditable', 'false');
  banner.onmousedown = (e) => e.stopPropagation();

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
    <span>Aprobar</span>
  `;
  acceptBtn.title = 'Aprobar e incorporar al documento';
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

function addInlineDecorationsForRange(
  decorations: Decoration[],
  doc: PMNode,
  from: number,
  to: number,
  className: string
) {
  if (from >= to) return;
  let textFound = false;
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.isText) {
      const start = Math.max(from, pos);
      const end = Math.min(to, pos + node.nodeSize);
      if (start < end) {
        decorations.push(Decoration.inline(start, end, { class: className }));
        textFound = true;
      }
    }
  });

  if (!textFound) {
    try {
      decorations.push(Decoration.inline(from, to, { class: className }));
    } catch {
      // Ignorar si el rango no admite decoración inline
    }
  }
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

              // Caso 1: Sugerencia directamente aplicada en el documento
              if (suggestion.status === 'applied') {
                // 1. Versión anterior que se está modificando: sombreada en rojito
                if (suggestion.oldRange && suggestion.oldRange.from < suggestion.oldRange.to) {
                  const oldFrom = Math.max(0, Math.min(suggestion.oldRange.from, docSize));
                  const oldTo = Math.max(oldFrom, Math.min(suggestion.oldRange.to, docSize));
                  if (oldFrom < oldTo) {
                    addInlineDecorationsForRange(decorations, state.doc, oldFrom, oldTo, 'rider-diff-old');
                  }
                }

                // 2. Versión nueva con propuesta: sombreada en verdecito + Banner de Aprobación
                if (suggestion.appliedRange && suggestion.appliedRange.from < suggestion.appliedRange.to) {
                  const from = Math.max(0, Math.min(suggestion.appliedRange.from, docSize));
                  const to = Math.max(from, Math.min(suggestion.appliedRange.to, docSize));
                  if (from < to) {
                    addInlineDecorationsForRange(decorations, state.doc, from, to, 'rider-applied-highlight');
                  }
                  decorations.push(
                    Decoration.widget(from, () => createAppliedBanner(suggestion), {
                      side: -1,
                      key: `applied-banner-${suggestion.id}`,
                    })
                  );
                } else if (suggestion.oldRange) {
                  const pos = Math.min(suggestion.oldRange.from, docSize);
                  decorations.push(
                    Decoration.widget(pos, () => createAppliedBanner(suggestion), {
                      side: -1,
                      key: `applied-banner-${suggestion.id}`,
                    })
                  );
                } else {
                  const bounds = suggestion.sectionId ? findSectionBounds(state.doc, suggestion.sectionId) : null;
                  const pos = Math.min(bounds?.from ?? 0, docSize);
                  decorations.push(
                    Decoration.widget(pos, () => createAppliedBanner(suggestion), {
                      side: -1,
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
