import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ALTERNATIVA_NO_NEGOCIABLE_COPY,
  effectiveNegotiability,
  exceptionDecisionForAnswer,
  extractRequirementNegotiability,
  isFinalAgreement,
  mergeContraAnswer,
  negotiabilityLabel,
  readExceptionDecision,
  readNegotiability,
  readNegotiabilityNote,
} from './negociabilidad.ts';
import type { SectionItem } from '../types/rider.types.ts';

describe('readNegotiability', () => {
  it('usa sin_definir por defecto', () => {
    assert.equal(readNegotiability(undefined), 'sin_definir');
    assert.equal(readNegotiability('otro'), 'sin_definir');
  });

  it('acepta negociable y no_negociable', () => {
    assert.equal(readNegotiability('negociable'), 'negociable');
    assert.equal(readNegotiability('no_negociable'), 'no_negociable');
  });
});

describe('readNegotiabilityNote', () => {
  it('guarda observación recortada y omite vacíos', () => {
    assert.equal(readNegotiabilityNote('  solo DiGiCo  '), 'solo DiGiCo');
    assert.equal(readNegotiabilityNote('   '), '');
    assert.equal(readNegotiabilityNote('x'.repeat(600)).length, 500);
  });
});

describe('negotiabilityLabel', () => {
  it('expone texto, no solo color', () => {
    assert.equal(negotiabilityLabel('negociable'), 'Negociable');
    assert.equal(negotiabilityLabel('no_negociable'), 'No negociable');
    assert.equal(negotiabilityLabel('sin_definir'), 'Sin definir');
  });
});

describe('effectiveNegotiability', () => {
  it('cualquier requisito no negociable gana', () => {
    const section: SectionItem = {
      id: 'tech-audio',
      num: '01',
      title: 'Audio',
      subtitle: '',
      tag: 'Audio',
      tagColor: '',
      iconName: 'mic',
      negotiability: 'negociable',
      contentDoc: {
        type: 'doc',
        content: [
          {
            type: 'requirement',
            attrs: { label: 'Consola', negotiability: 'no_negociable', negotiabilityNote: 'solo DiGiCo' },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'DiGiCo SD12' }] }],
          },
        ],
      },
    };
    const effective = effectiveNegotiability(section);
    assert.equal(effective.negotiability, 'no_negociable');
    assert.equal(effective.note, 'solo DiGiCo');
  });

  it('sin requisitos usa el estado del pedido/sección', () => {
    const section: SectionItem = {
      id: 'tech-power',
      num: '02',
      title: 'Energía',
      subtitle: '',
      tag: 'Power',
      tagColor: '',
      iconName: 'zap',
      negotiability: 'negociable',
      negotiabilityNote: 'equivalente listado',
    };
    const effective = effectiveNegotiability(section);
    assert.equal(effective.negotiability, 'negociable');
    assert.equal(effective.note, 'equivalente listado');
  });
});

describe('extractRequirementNegotiability', () => {
  it('lee estado y observación de cada requisito', () => {
    const items = extractRequirementNegotiability({
      type: 'doc',
      content: [
        {
          type: 'requirement',
          attrs: { label: 'PA', negotiability: 'negociable', negotiabilityNote: 'misma gama' },
        },
      ],
    });
    assert.equal(items.length, 1);
    assert.equal(items[0].label, 'PA');
    assert.equal(items[0].negotiability, 'negociable');
    assert.equal(items[0].note, 'misma gama');
  });
});

describe('exceptionDecisionForAnswer', () => {
  it('Alternativa sobre no negociable queda pendiente del aprobador', () => {
    assert.equal(
      exceptionDecisionForAnswer('no_negociable', 'alternativa'),
      'pending_approver'
    );
  });

  it('negociable y sin definir no exigen el paso extra', () => {
    assert.equal(exceptionDecisionForAnswer('negociable', 'alternativa'), null);
    assert.equal(exceptionDecisionForAnswer('sin_definir', 'alternativa'), null);
    assert.equal(exceptionDecisionForAnswer('no_negociable', 'cubro'), null);
  });
});

describe('mergeContraAnswer', () => {
  it('una Alternativa nueva en no negociable marca pendiente y no cierra acuerdo', () => {
    const next = mergeContraAnswer({
      negotiability: 'no_negociable',
      next: { response: 'alternativa', offer: 'd&b KSL', note: '' },
    });
    assert.equal(next.exceptionDecision, 'pending_approver');
    assert.equal(next.offer, 'd&b KSL');
    assert.equal(isFinalAgreement(next), false);
  });

  it('no borra una respuesta ya guardada al cambiar negociabilidad', () => {
    const next = mergeContraAnswer({
      negotiability: 'no_negociable',
      previous: { response: 'alternativa', offer: 'd&b KSL', note: 'ok inventario', exceptionDecision: null },
      next: { response: 'alternativa', offer: 'd&b KSL', note: 'ok inventario' },
    });
    assert.equal(next.response, 'alternativa');
    assert.equal(next.offer, 'd&b KSL');
    assert.equal(next.note, 'ok inventario');
    assert.equal(next.exceptionDecision, null);
  });

  it('Alternativa en negociable sigue siendo acuerdo del flujo normal', () => {
    const next = mergeContraAnswer({
      negotiability: 'negociable',
      next: { response: 'alternativa', offer: 'Meyer', note: '' },
    });
    assert.equal(next.exceptionDecision, null);
    assert.equal(isFinalAgreement(next), true);
  });
});

describe('readExceptionDecision', () => {
  it('lee pendiente y descarta valores desconocidos', () => {
    assert.equal(readExceptionDecision('pending_approver'), 'pending_approver');
    assert.equal(readExceptionDecision('accepted'), 'accepted');
    assert.equal(readExceptionDecision('nope'), null);
  });
});

describe('copy no negociable', () => {
  it('explica que hace falta ok del artista', () => {
    assert.match(ALTERNATIVA_NO_NEGOCIABLE_COPY, /artista/i);
    assert.match(ALTERNATIVA_NO_NEGOCIABLE_COPY, /excepci[oó]n/i);
  });
});
