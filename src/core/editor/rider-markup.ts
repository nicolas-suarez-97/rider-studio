import type { JSONContent } from '@tiptap/core';
import type { ContactPerson, NoticeTone } from '@/components/workspace/editor/rider-block-model';

const TAG = /^\[\[(requisito|aviso|tiers|contactos|columnas)(?::([^\]]*))?\]\]\s*$/i;

/**
 * Parses inline markdown: bold (**text** or __text__), italic (*text* or _text_),
 * bold-italic (***text***), and code (`code`).
 */
export function parseInlineMarkdown(text: string): JSONContent[] {
  if (!text) return [];

  const regex = /(\*\*\*(.*?)\*\*\*|\*\*(.*?)\*\*|\*(.*?)\*|`([^`]+)`)/g;
  const result: JSONContent[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({
        type: 'text',
        text: text.slice(lastIndex, match.index),
      });
    }

    if (match[2] !== undefined) {
      result.push({
        type: 'text',
        text: match[2],
        marks: [{ type: 'bold' }, { type: 'italic' }],
      });
    } else if (match[3] !== undefined) {
      result.push({
        type: 'text',
        text: match[3],
        marks: [{ type: 'bold' }],
      });
    } else if (match[4] !== undefined) {
      result.push({
        type: 'text',
        text: match[4],
        marks: [{ type: 'italic' }],
      });
    } else if (match[5] !== undefined) {
      result.push({
        type: 'text',
        text: match[5],
        marks: [{ type: 'code' }],
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push({
      type: 'text',
      text: text.slice(lastIndex),
    });
  }

  return result.filter((node) => node.text && node.text.length > 0);
}

/**
 * Converts a sequence of markdown lines into TipTap JSONContent blocks:
 * headings (h2/h3), bullet lists, ordered lists, and paragraphs with inline marks.
 */
function splitMarkdownTableCells(line: string): string[] {
  let clean = line.trim();
  if (clean.startsWith('|')) clean = clean.slice(1);
  if (clean.endsWith('|')) clean = clean.slice(0, -1);
  return clean.split('|').map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line: string): boolean {
  const cells = splitMarkdownTableCells(line);
  return cells.length >= 2 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

function isMarkdownTableRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  if (isMarkdownTableSeparator(trimmed)) return true;
  return splitMarkdownTableCells(trimmed).length >= 2;
}

function tableCellNode(text: string, header: boolean): JSONContent {
  const inline = parseInlineMarkdown(text);
  return {
    type: header ? 'tableHeader' : 'tableCell',
    content: [{
      type: 'paragraph',
      content: inline.length > 0 ? inline : (text ? [{ type: 'text', text }] : []),
    }],
  };
}

function markdownTableToNode(rows: string[]): JSONContent | null {
  const dataRows = rows.filter((row) => !isMarkdownTableSeparator(row));
  if (dataRows.length === 0) return null;

  const parsed = dataRows.map((row) => splitMarkdownTableCells(row));
  const width = Math.max(...parsed.map((cells) => cells.length), 0);
  if (width < 2) return null;

  return {
    type: 'table',
    content: parsed.map((cells, rowIndex) => ({
      type: 'tableRow',
      content: Array.from({ length: width }, (_, index) => (
        tableCellNode(cells[index] || '', rowIndex === 0)
      )),
    })),
  };
}

export function markdownLinesToBlocks(lines: string[]): JSONContent[] {
  const blocks: JSONContent[] = [];
  let currentList: { type: 'bulletList' | 'orderedList'; items: string[] } | null = null;
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length === 0) return;
    const text = currentParagraph.join(' ').trim();
    currentParagraph = [];
    if (text) {
      const inline = parseInlineMarkdown(text);
      if (inline.length > 0) {
        blocks.push({
          type: 'paragraph',
          content: inline,
        });
      }
    }
  };

  const flushList = () => {
    if (!currentList || currentList.items.length === 0) {
      currentList = null;
      return;
    }
    const listNode: JSONContent = {
      type: currentList.type,
      content: currentList.items.map((itemText) => {
        const inline = parseInlineMarkdown(itemText.trim());
        return {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: inline.length > 0 ? inline : [{ type: 'text', text: '' }],
            },
          ],
        };
      }),
    };
    blocks.push(listNode);
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (isMarkdownTableRow(trimmed)) {
      const tableLines: string[] = [rawLine];
      let look = i + 1;
      while (look < lines.length && isMarkdownTableRow(lines[look])) {
        tableLines.push(lines[look]);
        look += 1;
      }
      const hasSeparator = tableLines.some((line) => isMarkdownTableSeparator(line));
      if (hasSeparator || tableLines.filter((line) => !isMarkdownTableSeparator(line)).length >= 2) {
        flushParagraph();
        flushList();
        const table = markdownTableToNode(tableLines);
        if (table) {
          blocks.push(table);
          i = look - 1;
          continue;
        }
      }
    }

    // Heading: #, ##, ###, ####
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(3, Math.max(2, headingMatch[1].length)) as 2 | 3;
      const headingText = headingMatch[2].trim();
      const inline = parseInlineMarkdown(headingText);
      blocks.push({
        type: 'heading',
        attrs: { level },
        content: inline.length > 0 ? inline : [{ type: 'text', text: headingText }],
      });
      continue;
    }

    // Bullet list: - item, * item, + item
    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (currentList && currentList.type !== 'bulletList') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'bulletList', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Ordered list: 1. item, 2. item
    const orderedMatch = trimmed.match(/^\d+[\.)]\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (currentList && currentList.type !== 'orderedList') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'orderedList', items: [] };
      }
      currentList.items.push(orderedMatch[1]);
      continue;
    }

    // Otherwise, normal prose line
    flushList();
    currentParagraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function noticeTone(value: string): NoticeTone {
  const tone = value.trim().toLowerCase();
  if (tone === 'obligatorio' || tone === 'required') return 'required';
  if (tone === 'veto' || tone === 'rechazado' || tone === 'rejected' || tone === 'no aceptado') return 'rejected';
  return 'note';
}

function splitTrio(raw: string): { preferred: string; alternative: string; rejected: string } {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

  let preferred = '';
  let alternative = '';
  let rejected = '';

  // 1. Check for key-value format (e.g. - **Preferido:** XYZ, or Preferido: XYZ)
  const kvRegex = /^(?:[-*+]\s*)?(?:\*\*)?(preferido|preferred|alternativa|alternative|no\s*aceptado|veto|rechazado|rejected)(?:\*\*)?\s*[:=]\s*(.*)$/i;

  let foundKv = false;
  for (const line of lines) {
    const match = line.match(kvRegex);
    if (match) {
      foundKv = true;
      const key = match[1].toLowerCase().replace(/\s+/g, '');
      const val = match[2].trim().replace(/^\*\*|\*\*$/g, '').trim();
      if (key.includes('prefer')) {
        preferred = preferred ? `${preferred}\n${val}` : val;
      } else if (key.includes('alter')) {
        alternative = alternative ? `${alternative}\n${val}` : val;
      } else if (key.includes('no') || key.includes('veto') || key.includes('recha')) {
        rejected = rejected ? `${rejected}\n${val}` : val;
      }
    }
  }

  if (foundKv && (preferred || alternative || rejected)) {
    return { preferred, alternative, rejected };
  }

  // 2. Filter out table header rows like "preferido | alternativa | no aceptado"
  const isHeaderRow = (line: string) => {
    const clean = line.toLowerCase().replace(/[*_`]/g, '');
    return clean.includes('prefer') && clean.includes('alter');
  };

  const filteredLines = lines.filter((line) => !isHeaderRow(line) && !/^[:\s|-]+$/.test(line));

  if (filteredLines.length === 0) {
    return { preferred: '', alternative: '', rejected: '' };
  }

  // 3. Pipe-separated line
  const pipeLine = filteredLines.find((l) => l.includes('|'));
  if (pipeLine) {
    let clean = pipeLine;
    if (clean.startsWith('|')) clean = clean.slice(1);
    if (clean.endsWith('|')) clean = clean.slice(0, -1);
    const parts = clean.split('|').map((p) => p.trim());
    return {
      preferred: parts[0] || '',
      alternative: parts[1] || '',
      rejected: parts[2] || '',
    };
  }

  return {
    preferred: filteredLines[0] || '',
    alternative: filteredLines[1] || '',
    rejected: filteredLines[2] || '',
  };
}

function parseContacts(raw: string): ContactPerson[] {
  const lines = raw.split('\n').map((row) => row.trim()).filter(Boolean);
  const people: ContactPerson[] = [];

  for (const line of lines) {
    let clean = line;
    if (clean.startsWith('|')) clean = clean.slice(1);
    if (clean.endsWith('|')) clean = clean.slice(0, -1);
    clean = clean.trim();

    // Skip markdown table separators: --- | --- | ---
    if (/^[:\s|-]+$/.test(clean)) continue;

    const parts = clean.split('|').map((part) => part.trim());

    // Skip table header row: "Rol | Nombre | Teléfono | Correo"
    const rowStr = clean.toLowerCase();
    const first = (parts[0] || '').toLowerCase();
    if (
      (first.includes('rol') || first.includes('cargo') || first.includes('puesto')) &&
      (rowStr.includes('nom') || rowStr.includes('tel') || rowStr.includes('cor') || rowStr.includes('mail'))
    ) {
      continue;
    }

    if (parts.length > 0 && parts.some((p) => p.length > 0)) {
      people.push({
        id: `contact-${people.length + 1}`,
        role: parts[0] || '',
        name: parts[1] || '',
        phone: parts[2] || '',
        email: parts[3] || '',
      });
    }
  }

  return people.length ? people : [{ id: 'contact-1', role: '', name: '', phone: '', email: '' }];
}

function markdownToParagraphs(raw: string): JSONContent[] {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  return lines.map((line) => {
    const clean = line.replace(/^[-*+]\s+/, '').replace(/^\d+[\.)]\s+/, '');
    const inline = parseInlineMarkdown(clean);
    return {
      type: 'paragraph',
      content: inline.length > 0 ? inline : [{ type: 'text', text: clean }],
    };
  });
}

/**
 * Turns assistant text into structured TipTap blocks:
 * handles markdown headings, bullet/numbered lists, inline bold/italic,
 * and custom rider blocks [[requisito]], [[aviso]], [[tiers]], [[contactos]], [[columnas]].
 */
export function riderMarkupToContent(text: string): JSONContent[] | null {
  if (!text || !text.trim()) return null;

  const lines = text.split('\n');
  const blocks: JSONContent[] = [];
  let pendingLines: string[] = [];
  let sawTag = false;

  const flushPending = () => {
    if (pendingLines.length === 0) return;
    const mdBlocks = markdownLinesToBlocks(pendingLines);
    pendingLines = [];
    if (mdBlocks.length > 0) {
      blocks.push(...mdBlocks);
    }
  };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const match = line.trim().match(TAG);
    if (!match) {
      pendingLines.push(line);
      index += 1;
      continue;
    }

    sawTag = true;
    flushPending();
    const kind = match[1].toLowerCase();
    const arg = (match[2] || '').trim();
    index += 1;

    const body: string[] = [];
    while (index < lines.length && !TAG.test(lines[index].trim())) {
      body.push(lines[index]);
      index += 1;
    }
    const raw = body.join('\n').trim();

    if (kind === 'requisito') {
      const pNodes = markdownToParagraphs(raw);
      blocks.push({
        type: 'requirement',
        attrs: { label: arg || 'Requisito' },
        content: pNodes.length ? pNodes : [{ type: 'paragraph', content: [] }],
      });
    } else if (kind === 'aviso') {
      const pNodes = markdownToParagraphs(raw);
      blocks.push({
        type: 'notice',
        attrs: { tone: noticeTone(arg) },
        content: pNodes.length ? pNodes : [{ type: 'paragraph', content: [] }],
      });
    } else if (kind === 'tiers') {
      blocks.push({ type: 'tiers', attrs: splitTrio(raw) });
    } else if (kind === 'contactos') {
      blocks.push({
        type: 'contacts',
        attrs: {
          people: parseContacts(raw),
        },
      });
    } else if (kind === 'columnas') {
      const [left, right] = raw.split(/\n---\n/);
      blocks.push({
        type: 'columns',
        attrs: { left: (left || '').trim(), right: (right || '').trim(), imageSrc: '' },
      });
    }
  }

  flushPending();

  if (sawTag && blocks.length > 0) return blocks;

  // If no [[ tags were present, check if text contains block-level markdown:
  const trimmed = text.trim();
  const hasMarkdown =
    /(?:^|\n)\s*#{1,6}\s+/.test(trimmed) ||
    /(?:^|\n)\s*[-*+]\s+/.test(trimmed) ||
    /(?:^|\n)\s*\d+[\.)]\s+/.test(trimmed) ||
    trimmed.includes('\n\n') ||
    trimmed.includes('\n');

  if (hasMarkdown) {
    const mdBlocks = markdownLinesToBlocks(lines);
    return mdBlocks.length > 0 ? mdBlocks : null;
  }

  // Single line with inline formatting
  if (/\*\*.*?\*\*|\*.*?\*|`.*?`/.test(trimmed)) {
    const inline = parseInlineMarkdown(trimmed);
    return [{
      type: 'paragraph',
      content: inline,
    }];
  }

  return null;
}

export function previewRiderMarkup(text: string): string {
  if (!text) return '';
  return text
    .replace(/^\[\[requisito:([^\]]*)\]\]\s*$/gm, '$1')
    .replace(/^\[\[aviso:([^\]]*)\]\]\s*$/gm, '[$1]')
    .replace(/^\[\[(?:tiers|contactos|columnas)(?::[^\]]*)?\]\]\s*$/gm, '')
    .replace(/^\|?[\s-:]+\|[\s-:]+\|?.*$/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
