"use client";

import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import {
  DEFAULT_INPUT_LIST_COLUMNS,
  formatInputListPlainText,
  type InputListColumn,
  type InputListRow,
} from '@/core/constants/input-list';
import { formatWorkAreasPlainText, normalizeWorkAreas } from '@/core/constants/work-areas';
import { formatTransportFleetPlain, normalizeTransportCards } from '@/core/constants/transporte-terrestre';

export type SearchDirection = 'first' | 'next' | 'prev';

export type SearchMatch = {
  from: number;
  to: number;
  atom?: boolean;
};

export type SearchStats = {
  current: number;
  total: number;
};

type SearchMeta = {
  matches: SearchMatch[];
  activeIndex: number;
};

const searchKey = new PluginKey<DecorationSet>('riderSearch');

function haystack(value: string) {
  return value.toLowerCase();
}

export function findAllDocumentMatches(doc: PMNode, query: string): SearchMatch[] {
  const needle = haystack(query.trim());
  if (!needle) return [];
  const matches: SearchMatch[] = [];

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const text = haystack(node.text);
      let from = 0;
      while (from <= text.length - needle.length) {
        const index = text.indexOf(needle, from);
        if (index < 0) break;
        matches.push({ from: pos + index, to: pos + index + needle.length });
        from = index + Math.max(1, needle.length);
      }
      return;
    }

    if (node.type.name === 'workAreas') {
      if (haystack(formatWorkAreasPlainText(normalizeWorkAreas(node.attrs.areas))).includes(needle)) {
        matches.push({ from: pos, to: pos + node.nodeSize, atom: true });
      }
      return false;
    }

    if (node.type.name === 'inputList') {
      const rows = Array.isArray(node.attrs.rows) ? (node.attrs.rows as InputListRow[]) : [];
      const columns = Array.isArray(node.attrs.columns)
        ? (node.attrs.columns as InputListColumn[])
        : DEFAULT_INPUT_LIST_COLUMNS;
      if (haystack(formatInputListPlainText(rows, columns)).includes(needle)) {
        matches.push({ from: pos, to: pos + node.nodeSize, atom: true });
      }
      return false;
    }

    if (node.type.name === 'transportFleet') {
      const text = formatTransportFleetPlain(normalizeTransportCards(node.attrs.cards));
      if (haystack(text).includes(needle)) {
        matches.push({ from: pos, to: pos + node.nodeSize, atom: true });
      }
      return false;
    }

    if (node.type.name === 'image') {
      const alt = typeof node.attrs.alt === 'string' ? node.attrs.alt : '';
      if (alt && haystack(alt).includes(needle)) {
        matches.push({ from: pos, to: pos + node.nodeSize, atom: true });
      }
    }
  });

  return matches;
}

function decorationsFor(doc: PMNode, meta: SearchMeta) {
  const decorations = meta.matches.flatMap((match, index) => {
    const className = index === meta.activeIndex ? 'docs-search-hit is-current' : 'docs-search-hit';
    if (match.atom) return [Decoration.node(match.from, match.to, { class: className })];
    if (match.from >= match.to) return [];
    return [Decoration.inline(match.from, match.to, { class: className })];
  });
  return DecorationSet.create(doc, decorations);
}

export function setSearchHits(editor: Editor, matches: SearchMatch[], activeIndex: number) {
  if (editor.isDestroyed) return;
  editor.view.dispatch(editor.state.tr.setMeta(searchKey, { matches, activeIndex }));
}

export function scrollMatchIntoView(scroller: HTMLElement | null, editor: Editor, pos: number) {
  if (!scroller || editor.isDestroyed) return;
  let top: number;
  let bottom: number;
  try {
    const coords = editor.view.coordsAtPos(Math.min(Math.max(pos, 0), editor.state.doc.content.size));
    top = coords.top;
    bottom = coords.bottom;
  } catch {
    const nodeDom = editor.view.nodeDOM(pos);
    if (!(nodeDom instanceof HTMLElement)) return;
    const rect = nodeDom.getBoundingClientRect();
    top = rect.top;
    bottom = rect.bottom;
  }
  const box = scroller.getBoundingClientRect();
  const margin = Math.min(140, box.height * 0.28);
  if (top >= box.top + 56 && bottom <= box.bottom - 40) return;
  scroller.scrollTop += top - box.top - margin;
}

export const SearchHits = Extension.create({
  name: 'riderSearch',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(searchKey) as SearchMeta | undefined;
            if (meta) return decorationsFor(tr.doc, meta);
            if (tr.docChanged) return old.map(tr.mapping, tr.doc);
            return old;
          },
        },
        props: {
          decorations(state) {
            return searchKey.getState(state);
          },
        },
      }),
    ];
  },
});
