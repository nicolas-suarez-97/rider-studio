import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AUDIO_GROUP,
  CONSOLAS_GROUP,
  TECH_CONSOLAS_FOH_ID,
  TECH_CONSOLAS_MONITORES_ID,
  TECH_PA_ID,
  sectionHierarchyLabel,
  sectionPath,
} from './section-hierarchy.ts';

describe('jerarquía técnica PA / consolas', () => {
  it('sitúa PA bajo Audio, independiente de Consolas', () => {
    assert.deepEqual(sectionPath({ id: TECH_PA_ID }), [AUDIO_GROUP, 'PA']);
    assert.equal(sectionHierarchyLabel({ id: TECH_PA_ID }), 'Audio › PA');
  });

  it('sitúa FOH y Monitores como subapartados de Consolas', () => {
    assert.deepEqual(sectionPath({ id: TECH_CONSOLAS_FOH_ID }), [AUDIO_GROUP, CONSOLAS_GROUP, 'FOH']);
    assert.deepEqual(
      sectionPath({ id: TECH_CONSOLAS_MONITORES_ID }),
      [AUDIO_GROUP, CONSOLAS_GROUP, 'Monitores'],
    );
    assert.equal(sectionHierarchyLabel({ id: TECH_CONSOLAS_FOH_ID }), 'Audio › Consolas › FOH');
    assert.equal(
      sectionHierarchyLabel({ id: TECH_CONSOLAS_MONITORES_ID }),
      'Audio › Consolas › Monitores',
    );
  });

  it('no inventa jerarquía para secciones ajenas', () => {
    assert.deepEqual(sectionPath({ id: 'tech-backline' }), []);
    assert.equal(sectionHierarchyLabel({ id: 'tech-backline' }), '');
  });

  it('expone los IDs de sección de la taxonomía nueva', () => {
    assert.equal(TECH_PA_ID, 'tech-pa');
    assert.equal(TECH_CONSOLAS_FOH_ID, 'tech-consolas-foh');
    assert.equal(TECH_CONSOLAS_MONITORES_ID, 'tech-consolas-monitores');
  });
});
