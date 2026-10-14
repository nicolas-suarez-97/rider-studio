import type { JSONContent } from '@tiptap/core';

const TAG = /^\[\[(requisito|aviso|tiers|contactos|columnas)(?::([^\]]*))?\]\]\s*$/;

function textParagraph(text: string): JSONContent {
  const trimmed = text.trim();
  return {
    type: 'paragraph',
    content: trimmed ? [{ type: 'text', text: trimmed }] : [],
  };
}

function noticeTone(value: string) {
  const tone = value.trim().toLowerCase();
  if (tone === 'obligatorio' || tone === 'required') return 'required';
  if (tone === 'veto' || tone === 'rechazado' || tone === 'rejected' || tone === 'no aceptado') return 'rejected';
  return 'note';
}

function splitTrio(raw: string) {
  const parts = (raw.includes('|') ? raw.split('|') : raw.split('\n')).map((part) => part.trim());
  return {
    preferred: parts[0] || '',
    alternative: parts[1] || '',
    rejected: parts[2] || '',
  };
}

/**
 * Turns assistant text into rider blocks when it uses [[requisito]], [[aviso]],
 * [[tiers]], [[contactos]] or [[columnas]]. Plain prose returns null.
 */
export function riderMarkupToContent(text: string): JSONContent[] | null {
  if (!text.includes('[[')) return null;
  const lines = text.split('\n');
  const blocks: JSONContent[] = [];
  const paragraph: string[] = [];
  let sawTag = false;

  const flushParagraph = () => {
    const body = paragraph.join('\n').trim();
    paragraph.length = 0;
    if (body) blocks.push(textParagraph(body));
  };

  let index = 0;
  while (index < lines.length) {
    const match = lines[index].trim().match(TAG);
    if (!match) {
      paragraph.push(lines[index]);
      index += 1;
      continue;
    }
    sawTag = true;
    flushParagraph();
    const kind = match[1];
    const arg = (match[2] || '').trim();
    index += 1;
    const body: string[] = [];
    while (index < lines.length && !TAG.test(lines[index].trim())) {
      body.push(lines[index]);
      index += 1;
    }
    const raw = body.join('\n').trim();
    if (kind === 'requisito') {
      blocks.push({
        type: 'requirement',
        attrs: { label: arg || 'Requisito' },
        content: [textParagraph(raw)],
      });
    } else if (kind === 'aviso') {
      blocks.push({
        type: 'notice',
        attrs: { tone: noticeTone(arg) },
        content: [textParagraph(raw)],
      });
    } else if (kind === 'tiers') {
      blocks.push({ type: 'tiers', attrs: splitTrio(raw) });
    } else if (kind === 'contactos') {
      const people = raw.split('\n').map((row) => row.trim()).filter(Boolean).map((row, rowIndex) => {
        const [role, name, phone, email] = row.split('|').map((part) => part.trim());
        return {
          id: `contact-${rowIndex + 1}`,
          role: role || '',
          name: name || '',
          phone: phone || '',
          email: email || '',
        };
      });
      blocks.push({
        type: 'contacts',
        attrs: {
          people: people.length ? people : [{ id: 'contact-1', role: '', name: '', phone: '', email: '' }],
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
  flushParagraph();
  return sawTag && blocks.length > 0 ? blocks : null;
}

export function previewRiderMarkup(text: string) {
  if (!text.includes('[[')) return text;
  return text
    .replace(/^\[\[requisito:([^\]]*)\]\]\s*$/gm, '$1')
    .replace(/^\[\[aviso:([^\]]*)\]\]\s*$/gm, '[$1]')
    .replace(/^\[\[(?:tiers|contactos|columnas)(?::[^\]]*)?\]\]\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
