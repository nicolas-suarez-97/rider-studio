"use client";

import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
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

function blockPos(view: EditorView, el: HTMLElement): number | null {
  const probe = el.querySelector('p, h1, h2, h3, li, td, th') || el;
  try {
    const inside = view.posAtDOM(probe, 0);
    const max = view.state.doc.content.size;
    const $pos = view.state.doc.resolve(Math.max(0, Math.min(inside, max)));
    for (let depth = $pos.depth; depth >= 1; depth -= 1) {
      const before = $pos.before(depth);
      if (view.nodeDOM(before) === el) return before;
    }
    if ($pos.depth === 0) return $pos.pos > 0 ? $pos.pos : 0;
    return $pos.before(1);
  } catch {
    return null;
  }
}

function layoutScale(editor: HTMLElement) {
  if (editor.offsetHeight <= 0) return 1;
  const rect = editor.getBoundingClientRect();
  return rect.height > 0 ? rect.height / editor.offsetHeight : 1;
}

function layoutBox(el: HTMLElement, editor: HTMLElement) {
  const origin = editor.getBoundingClientRect().top;
  const scale = layoutScale(editor) || 1;
  const rect = el.getBoundingClientRect();
  const top = (rect.top - origin) / scale;
  const bottom = (rect.bottom - origin) / scale;
  return { top, bottom, height: Math.max(0, bottom - top) };
}

function pageIndexAt(y: number) {
  return Math.max(0, Math.floor(Math.max(0, y) / PAGE_STRIDE));
}

function pageContentEnd(page: number) {
  return page * PAGE_STRIDE + PAGE_PADDING + PAGE_INNER;
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

function hasForcedPageBreak(el: HTMLElement) {
  const heading = el.tagName === 'H2' ? el : el.querySelector(':scope > h2');
  return heading?.getAttribute('data-page-break') === 'before';
}

function breaksAfterPage(el: HTMLElement) {
  return el.getAttribute('data-page-break-after') === 'true'
    || Boolean(el.querySelector('[data-page-break-after="true"]'));
}

function flowElements(root: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  const visit = (parent: HTMLElement) => {
    for (const child of Array.from(parent.children)) {
      if (!(child instanceof HTMLElement) || isSpacer(child)) continue;
      if (child.classList.contains('docs-page-frame')) {
        const body = child.querySelector(':scope > .docs-page-frame-body');
        if (body instanceof HTMLElement) {
          visit(body);
          continue;
        }
      }
      blocks.push(child);
    }
  };
  visit(root);
  return blocks;
}

function collectBlocks(view: EditorView): { pos: number; el: HTMLElement }[] {
  const blocks: { pos: number; el: HTMLElement }[] = [];
  const seen = new Set<HTMLElement>();

  for (const child of flowElements(view.dom)) {
    const pos = blockPos(view, child);
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

function isSplittableElement(el: HTMLElement) {
  return el.classList.contains('tableWrapper')
    || el.tagName === 'TABLE'
    || el.tagName === 'UL'
    || el.tagName === 'OL';
}

function isHeadingEl(el: HTMLElement) {
  return el.tagName === 'H2' || el.tagName === 'H3';
}

function collapsedMargin(el: HTMLElement, edge: 'top' | 'bottom') {
  const style = window.getComputedStyle(el);
  const own = parseFloat(edge === 'top' ? style.marginTop : style.marginBottom) || 0;
  const pad = parseFloat(edge === 'top' ? style.paddingTop : style.paddingBottom) || 0;
  const border = parseFloat(edge === 'top' ? style.borderTopWidth : style.borderBottomWidth) || 0;
  if (pad > 0 || border > 0) return own;
  const child = edge === 'top' ? el.firstElementChild : el.lastElementChild;
  if (!(child instanceof HTMLElement)) return own;
  const childStyle = window.getComputedStyle(child);
  const inner = parseFloat(edge === 'top' ? childStyle.marginTop : childStyle.marginBottom) || 0;
  return Math.max(own, inner);
}

function measureBreaks(view: EditorView): PageBreak[] {
  const breaks: PageBreak[] = [];
  const blocks = collectBlocks(view);
  let borderEnd = PAGE_PADDING;
  let previousBottomMargin = 0;
  let hasContent = false;
  let carryForce = false;

  for (let index = 0; index < blocks.length; index += 1) {
    const { pos, el } = blocks[index];
    const marginTop = collapsedMargin(el, 'top');
    const marginBottom = collapsedMargin(el, 'bottom');
    const height = el.offsetHeight;
    if (height <= 0 && marginTop <= 0 && marginBottom <= 0) continue;

    const gap = hasContent ? Math.max(previousBottomMargin, marginTop) : marginTop;
    const borderStart = borderEnd + gap;
    const startPage = pageIndexAt(borderStart);
    const pageBottom = pageContentEnd(startPage);
    const pageUsed = borderStart - startPage * PAGE_STRIDE;
    const forced = hasContent && pageUsed > PAGE_PADDING + 220 && (hasForcedPageBreak(el) || carryForce);
    let overflows = hasContent && (borderStart > pageBottom + 0.5 || borderStart + height > pageBottom + 0.5);
    const room = pageBottom - borderStart;
    const canSplit = !forced && overflows && room >= 120 && height > room && isSplittableElement(el);

    const next = blocks[index + 1]?.el;
    if (!overflows && !forced && hasContent && next && isHeadingEl(el) && !isSplittableElement(next)) {
      const nextMargin = collapsedMargin(next, 'top');
      const nextHeight = next.offsetHeight;
      const nextGap = Math.max(marginBottom, nextMargin);
      const together = height + nextGap + nextHeight;
      if (borderStart + together > pageBottom + 0.5 && together <= PAGE_INNER) {
        overflows = true;
      }
    }

    if ((forced || overflows) && !canSplit) {
      const spacerStart = borderEnd + previousBottomMargin;
      const endPage = pageIndexAt(Math.max(0, spacerStart - 1));
      const targetBorder = (endPage + 1) * PAGE_STRIDE + PAGE_PADDING + marginTop;
      const spacer = Math.round(targetBorder - marginTop - spacerStart);
      if (spacer > 0) breaks.push({ pos, height: spacer });
      borderEnd = targetBorder + height;
    } else {
      borderEnd = borderStart + height;
    }

    previousBottomMargin = marginBottom;
    hasContent = true;
    carryForce = breaksAfterPage(el);
  }

  return breaks;
}

const SPLITTABLE = new Set(['table', 'bulletList', 'orderedList', 'taskList']);

function cloneTree(node: PMNode) {
  return node.type.create(node.attrs, node.content, node.marks);
}

function rowIsHeader(row: PMNode) {
  if (row.childCount === 0) return false;
  let header = true;
  row.forEach((cell) => {
    if (cell.type.name !== 'tableHeader') header = false;
  });
  return header;
}

function childElements(node: PMNode, el: HTMLElement): HTMLElement[] {
  if (node.type.name === 'table') {
    const table = el.tagName === 'TABLE' ? el : el.querySelector('table');
    return table ? Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > tr')) as HTMLElement[] : [];
  }
  return Array.from(el.querySelectorAll(':scope > li')) as HTMLElement[];
}

function splitOverflowingBlocks(view: EditorView): boolean {
  if (!view.editable || view.composing) return false;
  const editor = view.dom;
  const pieces: { from: number; to: number; nodes: PMNode[] }[] = [];

  view.state.doc.descendants((node, pos) => {
    if (!SPLITTABLE.has(node.type.name) || node.childCount < 2) return true;
    const dom = view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) return false;
    const rows = childElements(node, dom);
    if (rows.length !== node.childCount) return false;

    const first = layoutBox(rows[0], editor);
    const limit = pageContentEnd(pageIndexAt(first.top + 1));
    if (limit - first.top < 120) return false;
    let fit = 0;
    for (let index = 0; index < rows.length; index += 1) {
      const box = layoutBox(rows[index], editor);
      if (box.bottom <= limit + 1) fit = index + 1;
      else break;
    }

    const header = node.type.name === 'table' && rowIsHeader(node.child(0));
    const minKeep = header ? 2 : 1;
    if (fit < minKeep || fit >= node.childCount) return false;

    const kept: PMNode[] = [];
    const rest: PMNode[] = [];
    for (let index = 0; index < node.childCount; index += 1) {
      const child = node.child(index);
      if (index < fit) kept.push(child);
      else rest.push(child);
    }
    if (header) rest.unshift(cloneTree(node.child(0)));
    if (rest.length === 0) return false;

    pieces.push({
      from: pos,
      to: pos + node.nodeSize,
      nodes: [
        node.type.create(node.attrs, kept, node.marks),
        node.type.create(node.attrs, rest, node.marks),
      ],
    });
    return false;
  });

  if (pieces.length === 0) return false;
  let tr = view.state.tr;
  for (const piece of pieces.reverse()) {
    tr = tr.replaceWith(piece.from, piece.to, piece.nodes);
  }
  view.dispatch(tr.setMeta('addToHistory', false));
  return true;
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
          let structural = 0;
          let ownDoc: PMNode | null = null;
          let observer: ResizeObserver | null = null;
          let mutations: MutationObserver | null = null;

          const run = () => {
            if (view.isDestroyed || !view.dom.isConnected) return;
            if (ownDoc && view.state.doc !== ownDoc) structural = 0;
            if (structural < 24 && splitOverflowingBlocks(view)) {
              structural += 1;
              ownDoc = view.state.doc;
              return;
            }
            const breaks = measureBreaks(view);
            const pages = Math.max(1, breaks.length + 1);
            const current = pageKey.getState(view.state);
            applyPageMetrics(view, pages);
            if (current && sameBreaks(current.breaks, breaks) && current.pages === pages) {
              ownDoc = view.state.doc;
              return;
            }
            view.dispatch(view.state.tr.setMeta(pageKey, { breaks, pages }).setMeta('addToHistory', false));
            ownDoc = view.state.doc;
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
