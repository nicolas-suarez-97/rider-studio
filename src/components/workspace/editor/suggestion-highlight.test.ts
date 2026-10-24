import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Editor } from '@tiptap/core';
import Heading from '@tiptap/extension-heading';
import StarterKit from '@tiptap/starter-kit';
import type { DocumentSuggestion } from '../../../core/types/suggestion.types.ts';
import { applySuggestionToEditor } from './suggestion-highlight.ts';

const SectionHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: { default: null },
    };
  },
});

function createEditor(paragraph: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ heading: false }),
      SectionHeading.configure({ levels: [1, 2, 3] }),
    ],
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2, id: 'tech-audio' },
          content: [{ type: 'text', text: 'Audio FOH' }],
        },
        {
          type: 'paragraph',
          content: paragraph ? [{ type: 'text', text: paragraph }] : [],
        },
      ],
    },
  });
}

function correction(overrides: Partial<DocumentSuggestion> = {}): DocumentSuggestion {
  return {
    id: 'agent-correction-1',
    sectionId: 'tech-audio',
    kind: 'replace',
    baseText: 'Consola vieja',
    proposedText: 'DiGiCo SD12',
    rationale: 'Corregir la consola FOH.',
    status: 'applied',
    source: 'agent',
    ...overrides,
  };
}

function sectionBody(editor: Editor): string {
  return editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n');
}

describe('applySuggestionToEditor', () => {
  it('corrige el bloque por id estable in-place y no deja una segunda copia', () => {
    const editor = createEditor('Consola vieja');
    const result = applySuggestionToEditor(editor, correction());

    assert.equal(result.success, true);
    const body = sectionBody(editor);
    assert.match(body, /Audio FOH/);
    assert.match(body, /DiGiCo SD12/);
    assert.doesNotMatch(body, /Consola vieja/);
    assert.equal(body.split('DiGiCo SD12').length - 1, 1);
    assert.equal(body.split('Audio FOH').length - 1, 1);
    editor.destroy();
  });

  it('aplicar dos veces la misma corrección deja una sola versión vigente', () => {
    const editor = createEditor('Consola vieja');
    const draft = correction();

    assert.equal(applySuggestionToEditor(editor, draft).success, true);
    assert.equal(applySuggestionToEditor(editor, draft).success, true);

    const body = sectionBody(editor);
    assert.doesNotMatch(body, /Consola vieja/);
    assert.equal(body.split('DiGiCo SD12').length - 1, 1);
    assert.equal(body.split('Audio FOH').length - 1, 1);
    editor.destroy();
  });
});
