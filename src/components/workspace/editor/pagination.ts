"use client";

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

export const PAGE_WIDTH = 816;
export const PAGE_HEIGHT = 1056;
export const PAGE_PADDING = 96;
export const PAGE_GAP = 36;
/** Keep the last line above the page number. */
const PAGE_FOOTER = 28;
export const PAGE_INNER = PAGE_HEIGHT - PAGE_PADDING * 2 - PAGE_FOOTER;
const PAGE_STRIDE = PAGE_HEIGHT + PAGE_GAP;

type PageBreak = { pos: number; height: number };

const pageKey = new PluginKey<{ breaks: PageBreak[]; pages: number }>('riderPages');

function spacer(height: number) {
  const el = document.createElement('div');
  el.className = 'docs-page-break';
  el.style.height = `${height}px`;
  el.style.pointerEvents = 'none';
  el.contentEditable = 'false';
  return el;
}

function isSpacer(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.classList.contains('docs-page-break')) return true;
  if (el.classList.contains('docs-section-chips')) return false;
  if (el.classList.contains('ProseMirror-widget')) {
    return !el.querySelector('.docs-section-chips');
  }
  return false;
}

function topLevelPos(view: EditorView, el: HTMLElement): number | null {
  try {
    const inside = view.posAtDOM(el, 0);
    const max = view.state.doc.content.size;
    const $pos = view.state.doc.resolve(Math.max(0, Math.min(inside, max)));
    if ($pos.depth === 0) return $pos.pos > 0 ? $pos.pos : 0;
    return $pos.before(1);
  } catch {
    return null;
  }
}

function blockElementFromPos(view: EditorView, pos: number): HTMLElement | null {
  for (const candidate of [pos, pos + 1]) {
    let dom: Node | null | undefined = view.nodeDOM(candidate);
    if (dom && !(dom instanceof HTMLElement)) dom = dom.parentElement;
    if (!(dom instanceof HTMLElement)) continue;
    let current: HTMLElement = dom;
    while (current.parentElement && current.parentElement !== view.dom) {
      current = current.parentElement;
    }
    if (current === view.dom || isSpacer(current)) continue;
    return current;
  }
  return null;
}

function collapsedSize(el: HTMLElement, previousBottomMargin: number, isFirst: boolean) {
  const style = window.getComputedStyle(el);
  const marginTop = parseFloat(style.marginTop) || 0;
  const marginBottom = parseFloat(style.marginBottom) || 0;
  const height = el.offsetHeight;
  const topGap = isFirst ? marginTop : Math.max(previousBottomMargin, marginTop);
  return { size: topGap + height, nextMargin: marginBottom };
}

function hasForcedPageBreak(el: HTMLElement) {
  const heading = el.tagName === 'H2' ? el : el.querySelector(':scope > h2');
  return heading?.getAttribute('data-page-break') === 'before';
}

function collectBlocks(view: EditorView): { pos: number; el: HTMLElement }[] {
  const blocks: { pos: number; el: HTMLElement }[] = [];
  const seen = new Set<HTMLElement>();

  for (const child of Array.from(view.dom.children)) {
    if (!(child instanceof HTMLElement) || isSpacer(child)) continue;
    const pos = topLevelPos(view, child);
    if (pos == null || pos < 0) continue;
    seen.add(child);
    blocks.push({ pos, el: child });
  }

  if (blocks.length > 0) return blocks;

  view.state.doc.forEach((_node, pos) => {
    const el = blockElementFromPos(view, pos);
    if (!el || seen.has(el)) return;
    seen.add(el);
    blocks.push({ pos, el });
  });

  return blocks;
}

function measureBreaks(view: EditorView): PageBreak[] {
  const breaks: PageBreak[] = [];
  let used = 0;
  let previousBottomMargin = 0;
  let isFirst = true;

  for (const { pos, el } of collectBlocks(view)) {
    const { size, nextMargin } = collapsedSize(el, previousBottomMargin, isFirst);
    const forceNewPage = used > 0 && (used + size > PAGE_INNER || hasForcedPageBreak(el));
    isFirst = false;
    previousBottomMargin = nextMargin;
    if (size <= 0) continue;
    if (forceNewPage) {
      const filled = Math.min(used, PAGE_INNER);
      breaks.push({
        pos,
        height: Math.max(0, PAGE_STRIDE - filled),
      });
      used = Math.min(size, PAGE_INNER);
    } else {
      used += size;
    }
  }

  return breaks;
}

function sameBreaks(a: PageBreak[], b: PageBreak[]) {
  return a.length === b.length && a.every((value, index) => (
    value.pos === b[index].pos && value.height === b[index].height
  ));
}

function applyPageMetrics(view: EditorView, pages: number) {
  view.dom.style.minHeight = `${PAGE_HEIGHT}px`;
  view.dom.dataset.pages = String(pages);
}

export const Pagination = Extension.create({
  name: 'riderPagination',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pageKey,
        state: {
          init: () => ({ breaks: [] as PageBreak[], pages: 1 }),
          apply(tr, value) {
            const next = tr.getMeta(pageKey) as { breaks: PageBreak[]; pages: number } | undefined;
            if (next) return next;
            if (!tr.docChanged) return value;
            return {
              breaks: value.breaks
                .map((item) => ({ pos: tr.mapping.map(item.pos), height: item.height }))
                .filter((item) => item.pos > 0),
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
              data.breaks.map((item) => Decoration.widget(item.pos, () => spacer(item.height), {
                side: -1,
                key: `page-${item.pos}-${item.height}`,
                ignoreSelection: true,
              }))
            );
          },
        },
        view(view) {
          let measureFrame = 0;
          let retryFrame = 0;
          let retries = 0;
          let observer: ResizeObserver | null = null;
          let mutations: MutationObserver | null = null;

          const run = () => {
            if (view.isDestroyed || !view.dom.isConnected) return;
            const breaks = measureBreaks(view);
            const pages = Math.max(1, breaks.length + 1);
            const current = pageKey.getState(view.state);
            applyPageMetrics(view, pages);
            if (current && sameBreaks(current.breaks, breaks) && current.pages === pages) return;
            view.dispatch(view.state.tr.setMeta(pageKey, { breaks, pages }).setMeta('addToHistory', false));
          };

          const schedule = () => {
            cancelAnimationFrame(measureFrame);
            measureFrame = requestAnimationFrame(run);
          };

          const watchChildren = () => {
            if (!observer) return;
            for (const child of Array.from(view.dom.children)) {
              observer.observe(child);
              if (child instanceof HTMLElement) {
                for (const img of child.querySelectorAll('img')) observer.observe(img);
              }
            }
          };

          const retry = () => {
            retries += 1;
            schedule();
            if (retries < 8) retryFrame = requestAnimationFrame(retry);
          };

          schedule();
          retryFrame = requestAnimationFrame(retry);
          observer = new ResizeObserver(schedule);
          observer.observe(view.dom);
          watchChildren();
          mutations = new MutationObserver(() => {
            watchChildren();
            schedule();
          });
          mutations.observe(view.dom, { childList: true, subtree: true });
          view.dom.addEventListener('load', schedule, true);

          return {
            update: schedule,
            destroy() {
              cancelAnimationFrame(measureFrame);
              cancelAnimationFrame(retryFrame);
              view.dom.removeEventListener('load', schedule, true);
              observer?.disconnect();
              mutations?.disconnect();
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
