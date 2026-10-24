import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SectionItem } from '../types/rider.types.ts';
import {
  applyProposedToConfirmedText,
  confirmProposedOnSection,
  overlayProposedOnSections,
  previewSectionText,
  proposalTargetKey,
  replaceActiveProposed,
} from './proposed-confirmed.ts';
import { isSafeOldRangeToDelete, proposalLocateNeedles, trustedStoredRange } from './proposed-ranges.ts';

function sectionDocText(section: SectionItem): string {
  return JSON.stringify(section.contentDoc || { content: section.content || '' });
}

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

  it('alternativas sucesivas del mismo sectionId actualizan proposedText y el preview', () => {
    const confirmed = 'Backline original';
    const first = proposal({
      id: 'sug-1',
      sectionId: 'tech-backline',
      proposedText: 'Banda completa: 2× Marshall, 1× Ampeg',
    });
    const second = proposal({
      id: 'sug-2',
      sectionId: 'tech-backline',
      proposedText: 'Trío acústico: 1× combo Fender, 1× contrabajo',
    });

    const afterFirst = replaceActiveProposed([], [first]);
    const afterSecond = replaceActiveProposed(afterFirst.next, [second]);
    const preview = previewSectionText(confirmed, afterSecond.next[0]);
    const approved = applyProposedToConfirmedText(confirmed, afterSecond.next[0], { confirm: true });

    assert.equal(afterSecond.next.length, 1);
    assert.equal(afterSecond.next[0].proposedText, 'Trío acústico: 1× combo Fender, 1× contrabajo');
    assert.deepEqual(afterSecond.superseded.map((item) => item.proposedText), [
      'Banda completa: 2× Marshall, 1× Ampeg',
    ]);
    assert.match(preview, /Trío acústico/);
    assert.doesNotMatch(preview, /Banda completa/);
    assert.equal(applyProposedToConfirmedText(confirmed, afterSecond.next[0]), confirmed);
    assert.match(approved, /Trío acústico/);
    assert.doesNotMatch(approved, /Banda completa/);
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

  it('alternativas sucesivas reemplazan el body overlayeado aunque el bloque tenga contentDoc confirmado', () => {
    const confirmedDoc = {
      type: 'doc' as const,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Backline original' }] }],
    };
    const sections = [section({
      id: 'tech-backline',
      title: 'Backline',
      content: 'Backline original',
      contentDoc: confirmedDoc,
    })];
    const first = proposal({
      id: 'sug-1',
      sectionId: 'tech-backline',
      proposedText: 'Banda completa: 2× Marshall',
    });
    const second = proposal({
      id: 'sug-2',
      sectionId: 'tech-backline',
      proposedText: 'Trío acústico: combo Fender',
    });

    const afterFirst = overlayProposedOnSections(sections, replaceActiveProposed([], [first]).next);
    const afterSecond = overlayProposedOnSections(
      sections,
      replaceActiveProposed(replaceActiveProposed([], [first]).next, [second]).next,
    );

    assert.match(afterFirst[0].content || '', /Banda completa/);
    assert.match(sectionDocText(afterFirst[0]), /Banda completa/);
    assert.match(afterSecond[0].content || '', /Trío acústico/);
    assert.match(sectionDocText(afterSecond[0]), /Trío acústico/);
    assert.doesNotMatch(sectionDocText(afterSecond[0]), /Banda completa/);
    assert.equal(sections[0].content, 'Backline original');
    assert.match(sectionDocText(sections[0]), /Backline original/);
  });

  it('aplicar alt1 → sustituir alt2 → aceptar deja confirmado y contentDoc en alt2', () => {
    const confirmedText = 'Lista de backline. Batería: por confirmar';
    const confirmedDoc = {
      type: 'doc' as const,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: confirmedText }] }],
    };
    const sections = [section({
      id: 'tech-backline',
      title: 'Backline',
      content: confirmedText,
      contentDoc: confirmedDoc,
    })];
    const first = proposal({
      id: 'sug-1',
      sectionId: 'tech-backline',
      proposedText: 'Banda completa: 2× Marshall, 1× Ampeg',
    });
    const second = proposal({
      id: 'sug-2',
      sectionId: 'tech-backline',
      proposedText: 'Guitarra Acústica\nContrabajo\nCajón',
    });

    const afterFirst = replaceActiveProposed([], [first]);
    const afterSecond = replaceActiveProposed(afterFirst.next, [second]);
    const preview = overlayProposedOnSections(sections, afterSecond.next);
    const accepted = confirmProposedOnSection(sections[0], afterSecond.next[0]);
    const persisted = overlayProposedOnSections([accepted], []);

    assert.match(preview[0].content || '', /Cajón/);
    assert.doesNotMatch(preview[0].content || '', /Marshall/);
    assert.match(accepted.content, /Cajón/);
    assert.doesNotMatch(accepted.content, /Marshall/);
    assert.match(sectionDocText(accepted), /Cajón/);
    assert.doesNotMatch(sectionDocText(accepted), /Marshall/);
    assert.match(persisted[0].content || '', /Cajón/);
    assert.doesNotMatch(sectionDocText(persisted[0]), /Banda completa/);
    assert.notEqual(accepted.contentDoc, confirmedDoc);
  });
});

describe('rangos propuestos', () => {
  it('no conserva un appliedRange pegado al texto viejo si el proposedText ya no está ahí', () => {
    const needles = proposalLocateNeedles('Trío acústico: combo Fender');
    const located = null;
    const stale = trustedStoredRange(
      located,
      { from: 10, to: 40 },
      'Banda completa: 2× Marshall',
      'Trío acústico: combo Fender',
    );

    assert.ok(needles.some((needle) => needle.includes('Trío acústico')));
    assert.equal(stale, undefined);
  });

  it('sí usa el rango guardado si el slice todavía coincide con el proposed activo', () => {
    const trusted = trustedStoredRange(
      null,
      { from: 12, to: 30 },
      'Trío acústico: combo Fender',
      'Trío acústico: combo Fender',
    );
    assert.deepEqual(trusted, { from: 12, to: 30 });
  });

  it('no borra el proposed activo si oldRange quedó pegado al texto de alt2', () => {
    assert.equal(
      isSafeOldRangeToDelete({
        oldSlice: 'Guitarra Acústica\nContrabajo\nCajón',
        proposedText: 'Guitarra Acústica\nContrabajo\nCajón',
        baseText: 'Lista de backline. Batería: por confirmar',
      }),
      false,
    );
  });

  it('sí permite borrar el confirmed sombreado cuando es distinto del proposed', () => {
    assert.equal(
      isSafeOldRangeToDelete({
        oldSlice: 'Lista de backline. Batería: por confirmar',
        proposedText: 'Guitarra Acústica\nContrabajo\nCajón',
        baseText: 'Lista de backline. Batería: por confirmar',
      }),
      true,
    );
  });
});
