import { mergeAttributes, Node, Extension, type Editor } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { formatRiderDate, riderKicker } from '@/core/constants/document-themes';
import type { RiderType } from '@/core/types/rider.types';
import {
  ColumnsBlock,
  ContactsBlock,
  CoverBlock,
  NoticeBlock,
  PageFrameBlock,
  RequirementBlock,
  TiersBlock,
} from '@/components/workspace/editor/RiderBlockViews';
import { emptyContact, normalizePeople, type ContactPerson, type NoticeTone } from '@/components/workspace/editor/rider-block-model';

export type { ContactPerson, NoticeTone };

export type RiderDocumentMeta = {
  artistName: string;
  riderTitle: string;
  version: string;
  riderType: RiderType;
  uploadImage: ((file: File) => Promise<string | null | undefined>) | null;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    riderBlocks: {
      insertRequirement: (label?: string) => ReturnType;
      insertNotice: (tone?: NoticeTone) => ReturnType;
      insertTiers: () => ReturnType;
      insertContacts: () => ReturnType;
      insertColumns: () => ReturnType;
      insertRiderCover: () => ReturnType;
    };
  }

  interface Storage {
    riderDocumentMeta: RiderDocumentMeta;
  }
}

function stringField(key: string, dataName: string, fallback = '') {
  return {
    default: fallback,
    parseHTML: (element: HTMLElement) => element.getAttribute(dataName) || fallback,
    renderHTML: (attributes: Record<string, string>) => ({ [dataName]: attributes[key] || fallback }),
  };
}

function peopleAttr() {
  return {
    default: [emptyContact(1)],
    parseHTML: (element: HTMLElement) => {
      const raw = element.getAttribute('data-people');
      if (!raw) return [emptyContact(1)];
      try {
        return normalizePeople(JSON.parse(decodeURIComponent(raw)));
      } catch {
        return [emptyContact(1)];
      }
    },
    renderHTML: (attributes: { people?: ContactPerson[] }) => ({
      'data-people': encodeURIComponent(JSON.stringify(normalizePeople(attributes.people))),
    }),
  };
}

function paragraphBlock(labelAttr: Record<string, unknown> = {}) {
  return {
    type: 'paragraph' as const,
    ...labelAttr,
  };
}

export const RiderDocumentMetaExtension = Extension.create({
  name: 'riderDocumentMeta',
  addStorage() {
    return {
      artistName: '',
      riderTitle: '',
      version: 'v1.0',
      riderType: 'tecnico' as RiderType,
      uploadImage: null,
    };
  },
});

export function coverAttrsFromEditor(editor: Editor) {
  const meta = editor.storage.riderDocumentMeta;
  return {
    kicker: riderKicker(meta?.riderType || 'tecnico'),
    artist: meta?.artistName || '',
    title: meta?.riderTitle || '',
    version: meta?.version || 'v1.0',
    date: formatRiderDate(),
    imageSrc: '',
  };
}

export function removeSyntheticHeader(editor: Editor) {
  const { doc } = editor.state;
  let hasCover = false;
  doc.descendants((node) => {
    if (node.type.name === 'riderCover') hasCover = true;
  });
  if (!hasCover) return;
  let cursor = 0;
  for (let index = 0; index < doc.childCount; index += 1) {
    const child = doc.child(index);
    if (child.type.name === 'heading' && child.attrs.level === 1 && !child.attrs.id) {
      let end = cursor + child.nodeSize;
      if (index + 1 < doc.childCount) {
        const second = doc.child(index + 1);
        const title = editor.storage.riderDocumentMeta?.riderTitle?.trim() || '';
        const text = second.textContent.trim();
        const dropSecond = second.type.name === 'paragraph' && (text === '' || (Boolean(title) && text === title));
        if (dropSecond) end += second.nodeSize;
      }
      editor.commands.deleteRange({ from: cursor, to: end });
      return;
    }
    cursor += child.nodeSize;
  }
}

export function insertCoverAtStart(editor: Editor) {
  const inserted = editor.chain().focus().insertContentAt(0, {
    type: 'riderCover',
    attrs: coverAttrsFromEditor(editor),
  }).run();
  if (inserted) removeSyntheticHeader(editor);
  return inserted;
}

export const RiderCover = Node.create({
  name: 'riderCover',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      kicker: stringField('kicker', 'data-kicker', 'Rider técnico'),
      artist: stringField('artist', 'data-artist'),
      title: stringField('title', 'data-title'),
      version: stringField('version', 'data-version', 'v1.0'),
      date: stringField('date', 'data-date'),
      imageSrc: stringField('imageSrc', 'data-image'),
      plate: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-plate') === 'true',
        renderHTML: (attributes: { plate?: boolean }) => (attributes.plate ? { 'data-plate': 'true' } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'section[data-type="rider-cover"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes({ 'data-type': 'rider-cover', 'data-page-break-after': 'true' }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CoverBlock, { as: 'section', className: 'docs-cover-node' });
  },
  addCommands() {
    return {
      insertRiderCover: () => ({ editor }) => insertCoverAtStart(editor),
    };
  },
});

export const PageFrame = Node.create({
  name: 'pageFrame',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      backgroundSrc: stringField('backgroundSrc', 'data-background'),
      backgroundColor: stringField('backgroundColor', 'data-background-color'),
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="page-frame"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'page-frame' }, HTMLAttributes), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PageFrameBlock);
  },
});

export const Requirement = Node.create({
  name: 'requirement',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  isolating: false,
  addAttributes() {
    return {
      label: stringField('label', 'data-label', 'Requisito'),
      negotiability: {
        default: 'sin_definir',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-negotiability') || 'sin_definir',
        renderHTML: (attributes: { negotiability?: string }) => ({
          'data-negotiability': attributes.negotiability || 'sin_definir',
        }),
      },
      negotiabilityNote: stringField('negotiabilityNote', 'data-negotiability-note'),
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="requirement"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'requirement' }, HTMLAttributes), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(RequirementBlock);
  },
  addCommands() {
    return {
      insertRequirement: (label) => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: { label: label || 'Requisito', negotiability: 'sin_definir', negotiabilityNote: '' },
        content: [paragraphBlock()],
      }),
    };
  },
});

export const Notice = Node.create({
  name: 'notice',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  isolating: false,
  addAttributes() {
    return {
      tone: {
        default: 'note' as NoticeTone,
        parseHTML: (element) => {
          const tone = element.getAttribute('data-tone');
          return tone === 'required' || tone === 'rejected' ? tone : 'note';
        },
        renderHTML: (attributes) => ({ 'data-tone': attributes.tone || 'note' }),
      },
      backgroundColor: stringField('backgroundColor', 'data-background-color'),
    };
  },
  parseHTML() {
    return [{ tag: 'aside[data-type="notice"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['aside', mergeAttributes({ 'data-type': 'notice' }, HTMLAttributes), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(NoticeBlock, { as: 'aside' });
  },
  addCommands() {
    return {
      insertNotice: (tone) => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: { tone: tone || 'note' },
        content: [paragraphBlock()],
      }),
    };
  },
});

export const Tiers = Node.create({
  name: 'tiers',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      preferred: stringField('preferred', 'data-preferred'),
      alternative: stringField('alternative', 'data-alternative'),
      rejected: stringField('rejected', 'data-rejected'),
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="tiers"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'tiers' }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TiersBlock);
  },
  addCommands() {
    return {
      insertTiers: () => ({ commands }) => commands.insertContent({ type: this.name }),
    };
  },
});

export const Contacts = Node.create({
  name: 'contacts',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return { people: peopleAttr() };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="contacts"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'contacts' }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ContactsBlock);
  },
  addCommands() {
    return {
      insertContacts: () => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: { people: [emptyContact(1)] },
      }),
    };
  },
});

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      left: stringField('left', 'data-left'),
      right: stringField('right', 'data-right'),
      imageSrc: stringField('imageSrc', 'data-image'),
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'columns' }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ColumnsBlock);
  },
  addCommands() {
    return {
      insertColumns: () => ({ commands }) => commands.insertContent({ type: this.name }),
    };
  },
});
