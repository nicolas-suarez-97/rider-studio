import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SectionItem } from '../types/rider.types.ts';
import { countByType, filterSections, mergeVisibleReorder } from './type-view.ts';

function section(partial: Partial<SectionItem> & Pick<SectionItem, 'id' | 'title' | 'type'>): SectionItem {
  return {
    num: partial.num ?? '',
    subtitle: '',
    tag: partial.type || 'tecnico',
    tagColor: '',
    iconName: 'fileText',
    content: partial.content ?? '',
    ...partial,
  };
}

const riderSections: SectionItem[] = [
  section({ id: 'doc-cover', title: 'Portada', type: 'tecnico', num: '' }),
  section({ id: 'tech-pa', title: 'PA', type: 'tecnico', num: '01', content: 'L-Acoustics' }),
  section({ id: 'hosp-catering', title: 'Catering', type: 'hospitality', num: '02', content: 'Vegano' }),
  section({ id: 'tech-mon', title: 'Monitores', type: 'tecnico', num: '03' }),
  section({ id: 'sec-acceso', title: 'Acceso', type: 'seguridad', num: '04' }),
];

describe('filterSections', () => {
  it('muestra todo el rider en vista Todo, sin reordenar ni renumerar', () => {
    const visible = filterSections(riderSections, 'all', 'tecnico');
    assert.deepEqual(visible.map((item) => [item.id, item.num]), riderSections.map((item) => [item.id, item.num]));
  });

  it('deja solo secciones del tipo elegido y conserva numeración original', () => {
    const visible = filterSections(riderSections, 'hospitality', 'tecnico');
    assert.deepEqual(visible.map((item) => [item.id, item.num]), [
      ['doc-cover', ''],
      ['hosp-catering', '02'],
    ]);
  });
});

describe('countByType', () => {
  it('cuenta secciones del rider actual sin portada', () => {
    const counts = countByType(riderSections, 'tecnico');
    assert.equal(counts.all.sections, 4);
    assert.equal(counts.tecnico.sections, 2);
    assert.equal(counts.hospitality.sections, 1);
    assert.equal(counts.seguridad.sections, 1);
  });
});

describe('mergeVisibleReorder', () => {
  it('reordena solo lo visible y deja ocultas en su sitio', () => {
    const visible = filterSections(riderSections, 'tecnico', 'tecnico');
    const swapped = [visible[0], visible[2], visible[1]];
    const merged = mergeVisibleReorder(riderSections, swapped);
    assert.deepEqual(merged.map((item) => item.id), [
      'doc-cover',
      'tech-mon',
      'hosp-catering',
      'tech-pa',
      'sec-acceso',
    ]);
  });
});
