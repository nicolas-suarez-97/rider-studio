import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SectionItem } from '../types/rider.types.ts';
import {
  applyProposedToConfirmedText,
  overlayProposedOnSections,
  previewSectionText,
  proposalTargetKey,
  replaceActiveProposed,
} from './proposed-confirmed.ts';

function proposal(partial: {
  id: string;
  sectionId: string;
  proposedText: string;
  kind?: string;
  status?: string;
  baseText?: string;
  newSectionTitle?: string;
}) {
  return {
    kind: 'insert',
    status: 'applied',
    ...partial,
  };
}

function section(partial: Partial<SectionItem> & Pick<SectionItem, 'id' | 'title'>): SectionItem {
  return {
    num: '01',
    subtitle: '',
    tag: 'Audio',
    tagColor: '',
    iconName: 'mic',
    content: '',
    ...partial,
  };
}

describe('proposalTargetKey', () => {
  it('agrupa por id estable de bloque', () => {
    assert.equal(
      proposalTargetKey(proposal({ id: 'a', sectionId: 'tech-audio', proposedText: 'A' })),
      proposalTargetKey(proposal({ id: 'b', sectionId: 'tech-audio', proposedText: 'B' })),
    );
  });
});

describe('replaceActiveProposed', () => {
  it('sustituye el proposed activo del mismo bloque y no apila previews', () => {
    const first = proposal({ id: 'sug-1', sectionId: 'tech-audio', proposedText: 'DiGiCo SD12' });
    const second = proposal({ id: 'sug-2', sectionId: 'tech-audio', proposedText: 'Avid S6L' });

    const result = replaceActiveProposed([first], [second]);

    assert.deepEqual(result.next.map((item) => item.id), ['sug-2']);
    assert.deepEqual(result.superseded.map((item) => item.id), ['sug-1']);
    assert.equal(result.next.length, 1);
  });

  it('en un mismo lote deja solo la última sugerencia por bloque', () => {
    const first = proposal({ id: 'sug-1', sectionId: 'tech-audio', proposedText: 'Opción 1' });
    const second = proposal({ id: 'sug-2', sectionId: 'tech-audio', proposedText: 'Opción 2' });

    const result = replaceActiveProposed([], [first, second]);

    assert.deepEqual(result.next.map((item) => item.id), ['sug-2']);
    assert.deepEqual(result.superseded.map((item) => item.id), ['sug-1']);
  });

  it('dos alternativas sucesivas dejan solo la sugerencia activa', () => {
    const first = proposal({ id: 'sug-1', sectionId: 'tech-audio', proposedText: 'Opción 1' });
    const second = proposal({ id: 'sug-2', sectionId: 'tech-audio', proposedText: 'Opción 2' });
    const third = proposal({ id: 'sug-3', sectionId: 'tech-audio', proposedText: 'Opción 3' });

    const afterFirst = replaceActiveProposed([], [first]);
    const afterSecond = replaceActiveProposed(afterFirst.next, [second]);
    const afterThird = replaceActiveProposed(afterSecond.next, [third]);

    assert.deepEqual(afterThird.next.map((item) => item.proposedText), ['Opción 3']);
    assert.equal(afterThird.next.length, 1);
  });

  it('no toca un proposed de otro bloque', () => {
    const audio = proposal({ id: 'sug-audio', sectionId: 'tech-audio', proposedText: 'SD12' });
    const hotel = proposal({ id: 'sug-hotel', sectionId: 'hosp-hotel', proposedText: 'Late check-out' });
    const nextAudio = proposal({ id: 'sug-audio-2', sectionId: 'tech-audio', proposedText: 'S6L' });

    const result = replaceActiveProposed([audio, hotel], [nextAudio]);

    assert.deepEqual(result.next.map((item) => item.id).sort(), ['sug-audio-2', 'sug-hotel']);
    assert.deepEqual(result.superseded.map((item) => item.id), ['sug-audio']);
  });
});

describe('confirmed vs preview', () => {
  it('el rider confirmado no cambia al pedir otra sugerencia', () => {
    const confirmed = 'Yamaha CL5 con Dante redundante';
    const first = { kind: 'insert', proposedText: 'DiGiCo SD12' };
    const second = { kind: 'insert', proposedText: 'Avid S6L' };

    const afterFirst = applyProposedToConfirmedText(confirmed, first);
    const afterSecond = applyProposedToConfirmedText(confirmed, second);

    assert.equal(afterFirst, confirmed);
    assert.equal(afterSecond, confirmed);
    assert.equal(confirmed, 'Yamaha CL5 con Dante redundante');
  });

  it('el preview muestra solo el proposed activo más el documento confirmado', () => {
    const confirmed = 'Yamaha CL5';
    const obsolete = previewSectionText(confirmed, { kind: 'insert', proposedText: 'DiGiCo SD12' });
    const active = previewSectionText(confirmed, { kind: 'insert', proposedText: 'Avid S6L' });

    assert.match(obsolete, /Yamaha CL5/);
    assert.match(obsolete, /DiGiCo SD12/);
    assert.match(active, /Yamaha CL5/);
    assert.match(active, /Avid S6L/);
    assert.doesNotMatch(active, /DiGiCo SD12/);
  });

  it('confirmar sí incorpora el proposed al confirmed', () => {
    const confirmed = 'Yamaha CL5';
    const next = applyProposedToConfirmedText(confirmed, {
      kind: 'insert',
      proposedText: 'DiGiCo SD12',
    }, { confirm: true });

    assert.match(next, /Yamaha CL5/);
    assert.match(next, /DiGiCo SD12/);
  });
});

describe('overlayProposedOnSections', () => {
  it('no muta las sections confirmadas y el overlay no apila un proposed obsoleto', () => {
    const sections = [section({ id: 'tech-audio', title: 'Audio FOH', content: 'Yamaha CL5' })];
    const first = proposal({ id: 'sug-1', sectionId: 'tech-audio', proposedText: 'DiGiCo SD12' });
    const second = proposal({ id: 'sug-2', sectionId: 'tech-audio', proposedText: 'Avid S6L' });
    const { next } = replaceActiveProposed([first], [second]);

    const preview = overlayProposedOnSections(sections, next);

    assert.equal(sections[0].content, 'Yamaha CL5');
    assert.match(preview[0].content || '', /Yamaha CL5/);
    assert.match(preview[0].content || '', /Avid S6L/);
    assert.doesNotMatch(preview[0].content || '', /DiGiCo SD12/);
  });
});
