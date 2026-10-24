import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EQUIPMENT_CATALOG } from '../../core/constants/equipment-catalog.ts';
import { absoluteExclusionConflict } from '../share/exclusions.ts';
import {
  applyBrandChange,
  formatRequirementPedido,
  listBrands,
  listModels,
} from './brand-model.ts';

describe('catálogo mínimo de marcas y modelos', () => {
  it('incluye PA y consolas habituales', () => {
    const brands = EQUIPMENT_CATALOG.map((row) => row.brand);
    const models = EQUIPMENT_CATALOG.map((row) => row.model);
    assert.ok(brands.includes('L-Acoustics'));
    assert.ok(brands.includes('DiGiCo'));
    assert.ok(models.includes('K2'));
    assert.ok(models.includes('SD12'));
  });
});

describe('listas buscables', () => {
  it('filtra marcas por texto y ofrece crear si no hay coincidencia exacta', () => {
    const hits = listBrands(EQUIPMENT_CATALOG, 'digi');
    assert.equal(hits.some((option) => option.value === 'DiGiCo' && !option.custom), true);
    assert.equal(hits.some((option) => option.custom), false);

    const created = listBrands(EQUIPMENT_CATALOG, 'Nexo');
    assert.equal(created.some((option) => option.value === 'Nexo' && option.custom), true);
    assert.match(created.find((option) => option.custom)?.label || '', /Sin coincidencias · Usar "Nexo"/);
  });

  it('al fijar una marca, los modelos son solo de esa marca', () => {
    const models = listModels(EQUIPMENT_CATALOG, 'DiGiCo', '');
    assert.ok(models.some((option) => option.value === 'SD12' && !option.custom));
    assert.ok(models.some((option) => option.value === 'Quantum 338' && !option.custom));
    assert.equal(models.some((option) => option.value === 'K2' && !option.custom), false);
  });

  it('permite crear un modelo no catalogado de la marca', () => {
    const models = listModels(EQUIPMENT_CATALOG, 'DiGiCo', 'SD5');
    const custom = models.find((option) => option.custom);
    assert.ok(custom);
    assert.equal(custom?.value, 'SD5');
    assert.match(custom?.label || '', /Sin coincidencias · Usar "SD5"/);
  });
});

describe('cambio de marca', () => {
  it('no borra el modelo en silencio: lo conserva y avisa', () => {
    const result = applyBrandChange({
      previousBrand: 'DiGiCo',
      nextBrand: 'Yamaha',
      model: 'SD12',
      catalog: EQUIPMENT_CATALOG,
    });
    assert.equal(result.brand, 'Yamaha');
    assert.equal(result.model, 'SD12');
    assert.match(result.warning || '', /SD12/);
    assert.match(result.warning || '', /Yamaha/);
  });

  it('no avisa si el modelo pertenece a la marca nueva', () => {
    const result = applyBrandChange({
      previousBrand: 'DiGiCo',
      nextBrand: 'Yamaha',
      model: 'CL5',
      catalog: EQUIPMENT_CATALOG,
    });
    assert.equal(result.model, 'CL5');
    assert.equal(result.warning, null);
  });
});

describe('pedido persistido y exclusiones #18', () => {
  it('deja marca y modelo libres en el texto del pedido', () => {
    const pedido = formatRequirementPedido({
      label: 'Consola FOH',
      brand: 'Nexo',
      model: 'STM',
      body: '2 arrays laterales',
    });
    assert.match(pedido, /Nexo/);
    assert.match(pedido, /STM/);
    assert.match(pedido, /2 arrays laterales/);
  });

  it('la exclusión absoluta sigue chocando con marca o modelo elegido', () => {
    const pedido = formatRequirementPedido({
      label: 'PA',
      brand: 'JBL',
      model: 'SRX828P',
      body: 'towers',
    });
    const error = absoluteExclusionConflict({
      exclusions: [{ id: 'ex-1', brand: 'JBL', model: 'SRX' }],
      pedido,
      response: 'cubro',
    });
    assert.match(error || '', /no aceptado/i);
    assert.match(error || '', /JBL/i);
  });
});
