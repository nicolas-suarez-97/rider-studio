import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { findSectionConfig } from './section-fields.ts';
import {
  WORK_AREAS_SECTION_ID,
  WORK_AREA_LOCATIONS,
  createWorkArea,
  formatWorkAreasPlainText,
  insertWorkAreasSection,
  moveWorkArea,
  normalizeWorkAreas,
  parseWorkAreasFromDoc,
  removeWorkArea,
  shouldInsertWorkAreasSection,
  updateWorkArea,
  workAreasDoc,
} from './work-areas.ts';

describe('Áreas de trabajo', () => {
  it('tiene un apartado propio distinto de PA y Backline', () => {
    const templates = readFileSync(new URL('./rider-templates.ts', import.meta.url), 'utf8');
    const model = readFileSync(new URL('./work-areas.ts', import.meta.url), 'utf8');
    assert.match(templates, /workAreasTemplateSection\(\)/);
    assert.match(templates, /id: 'tech-pa'/);
    assert.match(templates, /id: 'tech-backline'/);
    assert.match(model, /WORK_AREAS_SECTION_ID = 'tech-areas-trabajo'/);
    assert.match(model, /title: 'Áreas de trabajo'/);
    assert.notEqual(WORK_AREAS_SECTION_ID, 'tech-pa');
    assert.notEqual(WORK_AREAS_SECTION_ID, 'tech-backline');
    assert.equal(findSectionConfig(WORK_AREAS_SECTION_ID)?.sectionTitleHint.includes('Áreas de trabajo'), true);
  });

  it('añade, edita, elimina y reordena áreas y persiste en el documento', () => {
    let areas = [
      createWorkArea({ name: 'FOH', location: 'foh', notes: 'Mezcla de sala' }),
      createWorkArea({ name: 'Camerino técnico', location: 'backstage' }),
    ];
    areas = [...areas, createWorkArea({ name: 'Wing SL', location: 'lateral' })];
    areas = updateWorkArea(areas, areas[1].id, { notes: 'Lock-out' });
    areas = moveWorkArea(areas, areas[2].id, 'up');
    areas = removeWorkArea(areas, areas[0].id);

    const doc = workAreasDoc(areas);
    const restored = parseWorkAreasFromDoc(doc);

    assert.equal(restored.length, 2);
    assert.equal(restored[0].name, 'Wing SL');
    assert.equal(restored[0].location, 'lateral');
    assert.equal(restored[1].name, 'Camerino técnico');
    assert.equal(restored[1].notes, 'Lock-out');
    assert.match(formatWorkAreasPlainText(restored), /Wing SL/);
    assert.match(formatWorkAreasPlainText(restored), /Lock-out/);
    assert.doesNotMatch(JSON.stringify(doc), /tech-pa|tech-backline/);
  });

  it('normaliza ubicación/tipo a FOH, backstage, lateral, oficina u otro', () => {
    const areas = normalizeWorkAreas([
      { name: 'Sala', location: 'FOH' },
      { name: 'Prod', location: 'oficina' },
      { name: 'Extra', location: 'camerino' },
    ]);
    assert.deepEqual(areas.map((area) => area.location), ['foh', 'oficina', 'otro']);
    assert.deepEqual(WORK_AREA_LOCATIONS.map((item) => item.id), [
      'foh',
      'backstage',
      'lateral',
      'oficina',
      'otro',
    ]);
  });

  it('no inyecta el apartado en un rider en blanco ni lo mezcla con PA/Backline', () => {
    assert.equal(shouldInsertWorkAreasSection([]), false);
    assert.equal(shouldInsertWorkAreasSection([{ id: WORK_AREAS_SECTION_ID }]), false);

    const outlined = [
      { id: 'tech-pa', title: 'Sistema de PA & Consola FOH', content: 'Line Array' },
      { id: 'tech-backline', title: 'Backline Requerido & Voltajes', content: 'Batería' },
      { id: 'tech-stageplot', title: 'Stage Plot & Acometida Eléctrica', content: '' },
    ];
    assert.equal(shouldInsertWorkAreasSection(outlined), true);

    const next = insertWorkAreasSection(outlined);
    assert.equal(next.filter((section) => section.id === 'tech-pa').length, 1);
    assert.equal(next.filter((section) => section.id === 'tech-backline').length, 1);
    assert.equal(next.filter((section) => section.id === WORK_AREAS_SECTION_ID).length, 1);
    assert.equal(next[0].id, 'tech-pa');
    assert.equal(next[1].id, 'tech-backline');
    assert.notEqual(next.find((section) => section.id === 'tech-pa')?.title, 'Áreas de trabajo');
    const inserted = next.find((section) => section.id === WORK_AREAS_SECTION_ID);
    assert.ok(inserted);
    assert.equal(parseWorkAreasFromDoc(inserted.contentDoc).length, 0);
  });
});
