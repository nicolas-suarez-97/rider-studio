import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  categoryHasContent,
  categorySelectorItems,
  createCategoryNav,
  navigateCategory,
  visibleCategories,
} from './category-navigation.ts';

const PA = { id: 'criterio_pa', label: 'Criterio PA', prefix: 'Criterio PA' };
const CONSOLAS = { id: 'consola_foh', label: 'Consola FOH preferida', prefix: 'Consola FOH preferida' };

function startNav() {
  return createCategoryNav([PA, CONSOLAS]);
}

describe('visibleCategories', () => {
  it('mantiene más de una categoría visible aunque haya una activa', () => {
    const afterPa = navigateCategory(startNav(), PA.id, { currentDraft: 'Criterio PA: L-Acoustics K2' });
    assert.equal(afterPa.ok, true);
    if (!afterPa.ok) return;

    const labels = visibleCategories(afterPa.state).map((item) => item.id);
    assert.deepEqual(labels, [PA.id, CONSOLAS.id]);
    assert.equal(afterPa.state.activeId, PA.id);
  });

  it('no oculta las demás opciones al cambiar de categoría', () => {
    let nav = startNav();
    const toPa = navigateCategory(nav, PA.id, { currentDraft: 'Criterio PA: d&b GSL' });
    assert.equal(toPa.ok, true);
    if (!toPa.ok) return;
    nav = toPa.state;

    const toConsolas = navigateCategory(nav, CONSOLAS.id, { currentDraft: 'Criterio PA: d&b GSL' });
    assert.equal(toConsolas.ok, true);
    if (!toConsolas.ok) return;

    assert.equal(visibleCategories(toConsolas.state).length, 2);
    assert.equal(toConsolas.state.activeId, CONSOLAS.id);
  });
});

describe('navigateCategory', () => {
  it('PA → editar → Consolas → PA conserva el contenido de PA y no pide regenerar', () => {
    let nav = startNav();

    const firstPa = navigateCategory(nav, PA.id);
    assert.equal(firstPa.ok, true);
    if (!firstPa.ok) return;
    assert.equal(firstPa.action, 'generate');
    nav = firstPa.state;

    const toConsolas = navigateCategory(nav, CONSOLAS.id, {
      currentDraft: 'Criterio PA: Meyer Panther',
    });
    assert.equal(toConsolas.ok, true);
    if (!toConsolas.ok) return;
    assert.equal(toConsolas.action, 'generate');
    assert.equal(toConsolas.state.drafts[PA.id], 'Criterio PA: Meyer Panther');
    nav = toConsolas.state;

    const backToPa = navigateCategory(nav, PA.id, {
      currentDraft: 'Consola FOH preferida: DiGiCo SD12',
    });
    assert.equal(backToPa.ok, true);
    if (!backToPa.ok) return;
    assert.equal(backToPa.action, 'activate');
    assert.equal(backToPa.state.activeId, PA.id);
    assert.equal(backToPa.state.drafts[PA.id], 'Criterio PA: Meyer Panther');
    assert.equal(backToPa.state.drafts[CONSOLAS.id], 'Consola FOH preferida: DiGiCo SD12');
    assert.equal(backToPa.regenerate, false);
  });

  it('si el cambio falla, permanece en la categoría actual con el contenido intacto', () => {
    const opened = navigateCategory(startNav(), PA.id);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;

    const saved = 'Criterio PA: K2 editado';
    const parked = navigateCategory(opened.state, PA.id, { currentDraft: saved });
    assert.equal(parked.ok, true);
    if (!parked.ok) return;

    const failed = navigateCategory(parked.state, 'categoria-inexistente', { currentDraft: saved });
    assert.equal(failed.ok, false);
    if (failed.ok) return;
    assert.equal(failed.state.activeId, PA.id);
    assert.equal(failed.state.drafts[PA.id], saved);
    assert.match(failed.error, /categoría/i);
  });

  it('si ya se visitó la categoría, volver no regenera aunque el texto no tenga prefijo', () => {
    const opened = navigateCategory(startNav(), PA.id);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;

    const away = navigateCategory(opened.state, CONSOLAS.id, { currentDraft: '' });
    assert.equal(away.ok, true);
    if (!away.ok) return;

    const back = navigateCategory(away.state, PA.id, {
      currentDraft: 'Consola FOH preferida: DiGiCo SD12',
      sectionText: 'Line array homologado sin el prefijo canónico',
      visitedIds: [PA.id],
    });
    assert.equal(back.ok, true);
    if (!back.ok) return;
    assert.equal(back.action, 'activate');
    assert.equal(back.regenerate, false);
  });

  it('no pide empezar de cero al recorrer PA → Consolas → PA', () => {
    const opened = navigateCategory(startNav(), PA.id);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;

    const mid = navigateCategory(opened.state, CONSOLAS.id, { currentDraft: 'Criterio PA: Adamson' });
    assert.equal(mid.ok, true);
    if (!mid.ok) return;
    assert.equal(mid.resetFlow, false);

    const end = navigateCategory(mid.state, PA.id, { currentDraft: 'Consola FOH preferida: CL5' });
    assert.equal(end.ok, true);
    if (!end.ok) return;
    assert.equal(end.resetFlow, false);
    assert.equal(end.regenerate, false);
  });
});

describe('categorySelectorItems', () => {
  it('tras redactar un apartado sigue mostrando PA y Consolas', () => {
    const prompts = [
      { kind: 'chat' as const, id: 'chat' },
      { kind: 'topic' as const, id: PA.id },
      { kind: 'topic' as const, id: CONSOLAS.id },
    ];
    const visible = categorySelectorItems(prompts, false).map((item) => item.id);
    assert.deepEqual(visible, [PA.id, CONSOLAS.id]);
  });
});

describe('categoryHasContent', () => {
  it('detecta el apartado por prefijo y no exige vaciar la sección', () => {
    const body = [
      'Criterio PA: L-Acoustics K1/K2 con cobertura uniforme.',
      'Consola FOH preferida: DiGiCo Quantum 338.',
    ].join('\n');

    assert.equal(categoryHasContent(body, PA), true);
    assert.equal(categoryHasContent(body, CONSOLAS), true);
    assert.equal(categoryHasContent(body, { id: 'spl', label: 'Cobertura & SPL', prefix: 'Cobertura & SPL' }), false);
  });
});
