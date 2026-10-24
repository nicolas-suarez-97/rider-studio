import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  chatReplyAfterDocumentApply,
  ensureChatDocumentSuggestions,
  extractTransferableRiderText,
  isExplicitRiderTransferIntent,
  isSparseEditorContext,
  planChatDocumentApply,
  resolveStableBlock,
  shouldUseDocumentJsonMode,
} from './chat-document-sync.ts';

describe('isExplicitRiderTransferIntent', () => {
  it('detecta «añade esto al rider»', () => {
    assert.equal(isExplicitRiderTransferIntent('añade esto al rider'), true);
  });

  it('no trata una consulta como transferencia', () => {
    assert.equal(isExplicitRiderTransferIntent('¿qué consola me recomiendas?'), false);
  });
});

describe('extractTransferableRiderText', () => {
  it('usa el contenido técnico del mensaje anterior aunque no tenga heading', () => {
    const prior = [
      '**Recomendaciones sobre Consolas de Sala (FOH):**',
      '',
      '1. **DiGiCo SD12:** estándar de giras internacionales.',
      '2. **Yamaha CL5:** integración Dante redundante.',
      '',
      '💡 Si deseas que lo incorpore, pídemelo.',
    ].join('\n');

    const extracted = extractTransferableRiderText(prior);
    assert.match(extracted, /DiGiCo SD12/);
    assert.doesNotMatch(extracted, /Si deseas que lo incorpore/);
  });
});

describe('resolveStableBlock', () => {
  const sections = [
    { id: 'tech-audio', title: 'Audio FOH' },
    { id: 'hosp-hotel', title: 'Hotel' },
  ];

  it('resuelve por id exacto y no por un párrafo parecido', () => {
    assert.deepEqual(resolveStableBlock('tech-audio', sections), sections[0]);
  });

  it('resuelve por título exacto cuando el id no coincide', () => {
    assert.deepEqual(resolveStableBlock('Audio FOH', sections), sections[0]);
  });

  it('no adivina un bloque si la referencia no existe', () => {
    assert.equal(resolveStableBlock('el último párrafo', sections), null);
  });
});

describe('ensureChatDocumentSuggestions', () => {
  it('convierte «añade esto al rider» en un insert sobre el bloque activo', () => {
    const result = ensureChatDocumentSuggestions({
      userText: 'añade esto al rider',
      priorAssistantText: '**Consola FOH**\n- DiGiCo SD12 con fuente redundante',
      suggestions: [],
      sections: [{ id: 'tech-audio', title: 'Audio FOH' }],
      activeSectionId: 'tech-audio',
    });

    assert.equal(result.error, undefined);
    assert.equal(result.suggestions.length, 1);
    assert.equal(result.suggestions[0].kind, 'insert');
    assert.equal(result.suggestions[0].sectionId, 'tech-audio');
    assert.match(result.suggestions[0].proposedText || '', /DiGiCo SD12/);
  });

  it('crea un bloque nuevo con id estable si el rider no tiene secciones', () => {
    const result = ensureChatDocumentSuggestions({
      userText: 'añade esto al rider',
      priorAssistantText: '- **Late check-out** a las 14:00',
      suggestions: [],
      sections: [],
      activeSectionId: '',
    });

    assert.equal(result.error, undefined);
    assert.equal(result.suggestions[0].kind, 'add_section');
    assert.ok(result.suggestions[0].newSectionTitle);
    assert.match(result.suggestions[0].proposedText || '', /Late check-out/);
  });

  it('informa el fallo y no inventa contenido si no hay texto que transferir', () => {
    const result = ensureChatDocumentSuggestions({
      userText: 'añade esto al rider',
      priorAssistantText: '',
      suggestions: [],
      sections: [{ id: 'tech-audio', title: 'Audio FOH' }],
      activeSectionId: 'tech-audio',
    });

    assert.equal(result.suggestions.length, 0);
    assert.match(result.error || '', /no pude/i);
  });

  it('conserva sugerencias ya resueltas por id y no las sustituye', () => {
    const result = ensureChatDocumentSuggestions({
      userText: 'añade esto al rider',
      priorAssistantText: 'texto viejo del chat',
      suggestions: [{
        kind: 'insert',
        sectionId: 'hosp-hotel',
        proposedText: 'Check-out 16:00',
        rationale: 'pedido del usuario',
      }],
      sections: [
        { id: 'tech-audio', title: 'Audio FOH' },
        { id: 'hosp-hotel', title: 'Hotel' },
      ],
      activeSectionId: 'tech-audio',
    });

    assert.equal(result.suggestions[0].sectionId, 'hosp-hotel');
    assert.equal(result.suggestions[0].proposedText, 'Check-out 16:00');
  });
});

describe('planChatDocumentApply', () => {
  it('aplica sobre el id existente y no pide crear otra sección', () => {
    const plan = planChatDocumentApply({
      draft: { kind: 'insert', sectionId: 'tech-audio', proposedText: 'DiGiCo SD12' },
      sections: [{ id: 'tech-audio', title: 'Audio FOH' }],
      activeSectionId: 'tech-audio',
    });

    assert.equal(plan.action, 'apply');
    assert.equal(plan.sectionId, 'tech-audio');
    assert.equal(plan.error, undefined);
  });

  it('crea un bloque con id nuevo si la referencia no existe', () => {
    const plan = planChatDocumentApply({
      draft: { kind: 'insert', sectionId: 'inexistente', proposedText: 'Mojo Barriers' },
      sections: [{ id: 'tech-audio', title: 'Audio FOH' }],
      activeSectionId: 'tech-audio',
    });

    assert.equal(plan.action, 'create_section');
    assert.ok(plan.newSectionTitle);
    assert.notEqual(plan.sectionId, 'tech-audio');
  });

  it('falla con mensaje claro si no hay texto que aplicar', () => {
    const plan = planChatDocumentApply({
      draft: { kind: 'insert', sectionId: 'tech-audio', proposedText: '' },
      sections: [{ id: 'tech-audio', title: 'Audio FOH' }],
      activeSectionId: 'tech-audio',
    });

    assert.equal(plan.action, 'fail');
    assert.match(plan.error || '', /no pude/i);
  });
});

describe('empty rider chat context', () => {
  it('detecta un rider sin secciones como contexto disperso', () => {
    assert.equal(isSparseEditorContext(undefined), false);
    assert.equal(isSparseEditorContext({
      sectionId: '',
      sectionText: '',
      allSections: [],
    }), true);
    assert.equal(shouldUseDocumentJsonMode({
      sectionId: '',
      sectionText: '',
      allSections: [],
    }), false);
  });

  it('sigue pidiendo JSON cuando hay un bloque activo', () => {
    assert.equal(isSparseEditorContext({
      sectionId: 'tech-audio',
      sectionText: 'DiGiCo SD12',
      allSections: [{ id: 'tech-audio', title: 'Audio FOH' }],
    }), false);
    assert.equal(shouldUseDocumentJsonMode({
      sectionId: 'tech-audio',
      sectionText: 'DiGiCo SD12',
      allSections: [{ id: 'tech-audio', title: 'Audio FOH' }],
    }), true);
  });
});

describe('chatReplyAfterDocumentApply', () => {
  it('no deja el error genérico de IA si el apply al documento tuvo éxito', () => {
    const reply = chatReplyAfterDocumentApply({
      aiText: '⚠️ No se pudo obtener una respuesta del servicio de IA en este momento. Por favor, vuelve a intentar.',
      isError: true,
      applied: true,
    });

    assert.equal(reply.isError, false);
    assert.match(reply.text, /documento/i);
    assert.doesNotMatch(reply.text, /servicio de IA/i);
  });

  it('conserva el error de IA si no se aplicó nada al documento', () => {
    const reply = chatReplyAfterDocumentApply({
      aiText: '⚠️ No se pudo obtener una respuesta del servicio de IA en este momento. Por favor, vuelve a intentar.',
      isError: true,
      applied: false,
    });

    assert.equal(reply.isError, true);
    assert.match(reply.text, /servicio de IA/i);
  });
});
