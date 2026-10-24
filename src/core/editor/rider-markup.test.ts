import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { markdownLinesToBlocks, riderMarkupToContent } from './rider-markup.ts';

describe('riderMarkupToContent tables', () => {
  it('convierte una tabla markdown con pipes a nodos TipTap table', () => {
    const markdown = [
      '**Consolas FOH**',
      '',
      '| Modelo | Uso |',
      '| --- | --- |',
      '| DiGiCo SD12 | Sala |',
      '| Yamaha CL5 | Dante |',
    ].join('\n');

    const blocks = riderMarkupToContent(markdown);
    assert.ok(blocks);
    const table = blocks.find((block) => block.type === 'table');
    assert.ok(table, 'debe emitir un nodo table');
    assert.equal(table.content?.length, 3);
    assert.equal(table.content?.[0]?.content?.[0]?.type, 'tableHeader');
    assert.equal(table.content?.[1]?.content?.[0]?.type, 'tableCell');
    const serialized = JSON.stringify(table);
    assert.match(serialized, /DiGiCo SD12/);
    assert.doesNotMatch(serialized, /\| DiGiCo/);
  });

  it('convierte tablas sin pipes laterales (formato catálogo)', () => {
    const blocks = markdownLinesToBlocks([
      'Modelo | Uso',
      'DiGiCo SD12 | FOH',
    ]);
    const table = blocks.find((block) => block.type === 'table');
    assert.ok(table);
    assert.equal(table.content?.length, 2);
  });
});
