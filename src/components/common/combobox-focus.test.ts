import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contactRoleOptions } from '../../core/constants/contact-roles.ts';
import { EQUIPMENT_CATALOG } from '../../core/constants/equipment-catalog.ts';
import { listBrands, listModels } from '../../lib/equipment/brand-model.ts';
import {
  firstUsefulIndex,
  nextActiveIndexOnArrowDown,
  type ComboboxFocusOption,
} from './combobox-focus.ts';

function roleFocusOptions(query: string): ComboboxFocusOption[] {
  return contactRoleOptions(query).map((option) => ({
    freeText: option.kind === 'custom',
    label: option.label,
  }));
}

function brandFocusOptions(query: string): ComboboxFocusOption[] {
  return listBrands(EQUIPMENT_CATALOG, query).map((option) => ({
    freeText: Boolean(option.custom),
    label: option.label,
  }));
}

describe('firstUsefulIndex', () => {
  it('con coincidencias elige el primer match, no Usar', () => {
    const options = [
      { freeText: true, label: 'Usar "Manager"' },
      { freeText: false, label: 'Tour Manager' },
      { freeText: false, label: 'Production Manager' },
    ];
    assert.equal(firstUsefulIndex(options), 1);
  });

  it('sin coincidencias elige Usar si existe', () => {
    const options = [{ freeText: true, label: 'Usar "RF Coordinator"' }];
    assert.equal(firstUsefulIndex(options), 0);
  });
});

describe('ArrowDown · primer ítem útil (roles #27)', () => {
  it('con coincidencias, el primer ↓ enfoca el primer match y no Usar', () => {
    const options = roleFocusOptions('manager');
    const index = nextActiveIndexOnArrowDown(-1, options);
    assert.equal(options[index]?.label, 'Tour Manager');
    assert.equal(options[index]?.freeText, false);
    assert.notEqual(index, 1);
  });

  it('sin coincidencias, ↓ enfoca Usar', () => {
    const options = roleFocusOptions('RF Coordinator');
    const index = nextActiveIndexOnArrowDown(-1, options);
    assert.equal(options[index]?.freeText, true);
    assert.match(options[index]?.label || '', /Usar "RF Coordinator"/);
  });
});

describe('ArrowDown · primer ítem útil (marca/modelo #24)', () => {
  it('con coincidencias de marca, el primer ↓ enfoca DiGiCo y no Usar', () => {
    const options = brandFocusOptions('digi');
    const index = nextActiveIndexOnArrowDown(-1, options);
    assert.equal(options[index]?.label, 'DiGiCo');
    assert.equal(options[index]?.freeText, false);
  });

  it('sin coincidencias de marca, ↓ enfoca Usar', () => {
    const options = brandFocusOptions('Nexo');
    const index = nextActiveIndexOnArrowDown(-1, options);
    assert.equal(options[index]?.freeText, true);
    assert.match(options[index]?.label || '', /Usar "Nexo"/);
  });

  it('sin coincidencias de modelo, ↓ enfoca Usar', () => {
    const options = listModels(EQUIPMENT_CATALOG, 'DiGiCo', 'SD5').map((option) => ({
      freeText: Boolean(option.custom),
      label: option.label,
    }));
    const index = nextActiveIndexOnArrowDown(-1, options);
    assert.equal(options[index]?.freeText, true);
    assert.match(options[index]?.label || '', /Usar "SD5"/);
  });
});

describe('ArrowDown · no saltar al segundo desde -1', () => {
  it('desde sin foco, ↓ fija el primer útil en vez de current+1', () => {
    const options = [
      { freeText: false, label: 'Tour Manager' },
      { freeText: false, label: 'Production Manager' },
      { freeText: true, label: 'Usar "Manager"' },
    ];
    assert.equal(nextActiveIndexOnArrowDown(-1, options), 0);
    assert.equal(nextActiveIndexOnArrowDown(0, options), 1);
  });

  it('si Usar está indexado primero, el primer ↓ va al match, no a Usar', () => {
    const options = [
      { freeText: true, label: 'Usar "Manager"' },
      { freeText: false, label: 'Tour Manager' },
      { freeText: false, label: 'Production Manager' },
    ];
    assert.equal(nextActiveIndexOnArrowDown(-1, options), 1);
    assert.notEqual(nextActiveIndexOnArrowDown(-1, options), 0);
  });
});
