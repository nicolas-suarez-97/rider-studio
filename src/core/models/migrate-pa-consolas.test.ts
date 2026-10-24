import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SectionItem } from '../types/rider.types.ts';
import {
  TECH_CONSOLAS_FOH_ID,
  TECH_CONSOLAS_MONITORES_ID,
  TECH_PA_ID,
  migratePaConsolasHierarchy,
} from '../constants/section-hierarchy.ts';

function section(partial: Partial<SectionItem> & Pick<SectionItem, 'id' | 'title'>): SectionItem {
  return {
    num: '02',
    subtitle: '',
    tag: 'Audio',
    tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
    iconName: 'speaker',
    ...partial,
  };
}

describe('migratePaConsolasHierarchy', () => {
  const legacyPa = [
    '• Criterio PA: L-Acoustics K1/K2 con cobertura homogénea.',
    '• Cobertura & SPL: 102 dBA continuo / 114 dBC pico en FOH.',
    '• Ingeniero de Sistemas: certificado por el fabricante.',
    '• Consola FOH preferida: DiGiCo Quantum 338 / Yamaha CL5.',
    '• Conectividad: Cat6e etherCON y split pasivo.',
  ].join('\n');

  const legacyMonitores = [
    '• Sistema de IEM: Shure PSM1000 estéreo.',
    '• Coordinación de RF: escaneo in-situ.',
    '• Consola de Monitores: DiGiCo SD12 dedicada con split galvánico.',
  ].join('\n');

  it('separa PA de consolas y conserva todo el texto previo', () => {
    const next = migratePaConsolasHierarchy([
      section({ id: TECH_PA_ID, title: 'Sistema de PA & Consola FOH', content: legacyPa }),
      section({
        id: 'tech-monitores',
        title: 'Monitoreo, IEM & Radiofrecuencia (RF)',
        content: legacyMonitores,
      }),
    ]);

    const pa = next.find((item) => item.id === TECH_PA_ID);
    const foh = next.find((item) => item.id === TECH_CONSOLAS_FOH_ID);
    const mon = next.find((item) => item.id === TECH_CONSOLAS_MONITORES_ID);
    const iem = next.find((item) => item.id === 'tech-monitores');

    assert.ok(pa && foh && mon && iem);
    assert.match(pa.content || '', /Criterio PA/);
    assert.match(pa.content || '', /102 dBA/);
    assert.doesNotMatch(pa.content || '', /Consola FOH preferida/);
    assert.match(foh.content || '', /DiGiCo Quantum 338/);
    assert.match(foh.content || '', /Cat6e etherCON/);
    assert.match(mon.content || '', /DiGiCo SD12 dedicada/);
    assert.match(iem.content || '', /Shure PSM1000/);
    assert.doesNotMatch(iem.content || '', /Consola de Monitores/);

    const joined = next.map((item) => item.content || '').join('\n');
    assert.match(joined, /L-Acoustics K1\/K2/);
    assert.match(joined, /DiGiCo Quantum 338/);
    assert.match(joined, /Shure PSM1000/);
    assert.match(joined, /DiGiCo SD12 dedicada/);
  });

  it('es idempotente y no duplica secciones ya migradas', () => {
    const first = migratePaConsolasHierarchy([
      section({ id: TECH_PA_ID, title: 'Sistema de PA & Consola FOH', content: legacyPa }),
    ]);
    const second = migratePaConsolasHierarchy(first);
    assert.equal(
      second.filter((item) => item.id === TECH_CONSOLAS_FOH_ID).length,
      1,
    );
    assert.equal(second.find((item) => item.id === TECH_PA_ID)?.content, first.find((item) => item.id === TECH_PA_ID)?.content);
  });
});
