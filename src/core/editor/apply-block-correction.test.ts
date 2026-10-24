import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  alreadyHasProposedText,
  mergeAppliedDocumentSuggestions,
  nextSectionContent,
  nextSectionRevision,
} from './apply-block-correction.ts';

describe('apply-block-correction', () => {
  it('una corrección replace no deja el texto previo ni una segunda copia', () => {
    const next = nextSectionContent('Consola vieja', {
      kind: 'replace',
      baseText: 'Consola vieja',
      proposedText: 'DiGiCo SD12',
    });
    assert.equal(next, 'DiGiCo SD12');
    assert.equal(nextSectionContent(next, {
      kind: 'replace',
      baseText: 'Consola vieja',
      proposedText: 'DiGiCo SD12',
    }), 'DiGiCo SD12');
  });

  it('un confirmed pasa a proposed al corregir el mismo id', () => {
    assert.equal(nextSectionRevision('confirmed', {
      kind: 'replace',
      proposedText: 'DiGiCo SD12',
    }), 'proposed');
  });

  it('alreadyHasProposedText detecta la versión vigente sin contar un substring interno', () => {
    assert.equal(alreadyHasProposedText('DiGiCo SD12', 'DiGiCo SD12'), true);
    assert.equal(alreadyHasProposedText('Yamaha CL5\nDiGiCo SD12', 'DiGiCo SD12'), true);
    assert.equal(alreadyHasProposedText('DiGiCo SD12 con Dante', 'DiGiCo SD12'), false);
  });

  it('mergeAppliedDocumentSuggestions deja una sola sugerencia por id de bloque', () => {
    const merged = mergeAppliedDocumentSuggestions(
      [{ id: 'old', sectionId: 'tech-audio' }],
      [{ id: 'new', sectionId: 'tech-audio' }],
    );
    assert.deepEqual(merged, [{ id: 'new', sectionId: 'tech-audio' }]);
  });
});
