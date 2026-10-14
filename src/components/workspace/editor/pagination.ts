"use client";

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

export const PAGE_WIDTH = 816;
export const PAGE_HEIGHT = 1056;
export const PAGE_PADDING = 96;
export const PAGE_GAP = 36;
export const PAGE_INNER = PAGE_HEIGHT - PAGE_PADDING * 2;

const pageKey = new PluginKey<{ breaks: number[]; pages: number }>('riderPages');

function spacer(height: number) {
  const el = document.createElement('div');
  el.className = 'docs-page-break';
  el.style.height = `${height}px`;
  el.contentEditable = 'false';
  return el;
}

function measureBreaks(view: EditorView): number[] {
  const breaks: number[] = [];
  let used = 0;
  view.state.doc.forEach((node, pos) => {
    const dom = view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement) || dom.classList.contains('docs-page-break')) return;
    const height = Math.ceil(dom.getBoundingClientRect().height);
    if (height <= 0) return;
    if (used > 0 && used + height > PAGE_INNER) {
      breaks.push(pos);
      used = height;
    } else {
      used += height;
    }
  });
  return breaks;
}

function sameBreaks(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export const Pagination = Extension.create({
  name: 'riderPagination',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pageKey,
        state: {
          init: () => ({ breaks: [] as number[], pages: 1 }),
          apply(tr, value) {
            const next = tr.getMeta(pageKey) as { breaks: number[]; pages: number } | undefined;
            if (next) return next;
            if (!tr.docChanged) return value;
            return {
              breaks: value.breaks.map((pos) => tr.mapping.map(pos)).filter((pos) => pos > 0),
              pages: value.pages,
            };
          },
        },
        props: {
          decorations(state) {
            const data = pageKey.getState(state);
            if (!data?.breaks.length) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              data.breaks.map((pos) => Decoration.widget(pos, () => spacer(PAGE_GAP + PAGE_PADDING * 2), {
                side: -1,
                key: `page-${pos}`,
                ignoreSelection: true,
              }))
            );
          },
        },
        view(view) {
          let frame = 0;
          const run = () => {
            if (view.isDestroyed || !view.dom.isConnected) return;
            const breaks = measureBreaks(view);
            const pages = Math.max(1, breaks.length + 1);
            const current = pageKey.getState(view.state);
            if (current && sameBreaks(current.breaks, breaks) && current.pages === pages) return;
            view.dispatch(view.state.tr.setMeta(pageKey, { breaks, pages }).setMeta('addToHistory', false));
            view.dom.style.minHeight = `${pages * PAGE_HEIGHT + (pages - 1) * PAGE_GAP}px`;
            view.dom.dataset.pages = String(pages);
          };
          const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(run);
          };
          schedule();
          return {
            update: schedule,
            destroy() {
              cancelAnimationFrame(frame);
            },
          };
        },
      }),
    ];
  },
});

export function pageCountFromEditor(dom: HTMLElement | null) {
  const pages = Number(dom?.dataset.pages || '1');
  return Number.isFinite(pages) && pages > 0 ? pages : 1;
}
