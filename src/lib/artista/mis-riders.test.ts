import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildRiderHomeCards,
  confirmProgressLabel,
  countRiderHome,
  filterRiderHome,
  readShareConfirms,
  riderHomeStatus,
  showGroupKey,
} from './mis-riders.ts';

describe('riderHomeStatus', () => {
  it('marca Borrador si no hay share ni token', () => {
    assert.equal(riderHomeStatus({ id: 'r1' }), 'draft');
  });

  it('marca Compartido si hay token o share publicado', () => {
    assert.equal(riderHomeStatus({ id: 'r1', share_token: 'abc' }), 'shared');
    assert.equal(riderHomeStatus({
      id: 'r2',
      metadata: { share: { token: 'tok', enabled: true } },
    }), 'shared');
  });

  it('marca Listo solo si showReady es true', () => {
    assert.equal(riderHomeStatus({
      id: 'r1',
      share_token: 'abc',
      metadata: { showReady: true },
    }), 'ready');
    assert.equal(riderHomeStatus({
      id: 'r2',
      share_token: 'abc',
      metadata: { showReady: 'yes' },
    }), 'shared');
  });
});

describe('readShareConfirms', () => {
  it('omite el avance si el campo no existe', () => {
    assert.equal(readShareConfirms({}), null);
    assert.equal(readShareConfirms({ shareConfirms: { confirmed: 1 } }), null);
  });

  it('lee N de M desde el objeto o la lista', () => {
    assert.deepEqual(readShareConfirms({ shareConfirms: { confirmed: 2, total: 5 } }), {
      confirmed: 2,
      total: 5,
    });
    assert.deepEqual(readShareConfirms({
      shareConfirms: [{ confirmed: true }, { status: 'pending' }, true],
    }), { confirmed: 2, total: 3 });
  });
});

describe('buildRiderHomeCards', () => {
  it('une tipos del mismo show en una sola tarjeta', () => {
    const cards = buildRiderHomeCards([
      {
        id: 'tech',
        artist_name: 'Luz Roja',
        venue_name: 'Teatro Colón',
        event_date: '2026-11-01',
        updated_at: '2026-10-01T10:00:00.000Z',
        metadata: { modules: { tecnico: {}, hospitality: {} } },
      },
      {
        id: 'hosp',
        artist_name: 'Luz Roja',
        venue_name: 'Teatro Colón',
        event_date: '2026-11-01',
        updated_at: '2026-10-02T10:00:00.000Z',
        share_token: 'shared-1',
        metadata: { shareConfirms: { confirmed: 1, requested: 3 } },
      },
    ]);

    assert.equal(cards.length, 1);
    assert.equal(cards[0].id, 'hosp');
    assert.equal(cards[0].status, 'shared');
    assert.equal(cards[0].canViewResponses, true);
    assert.equal(confirmProgressLabel(cards[0].confirmProgress!), '1 de 3 pedidos confirmados');
    assert.equal(showGroupKey({
      id: 'tech',
      artist_name: 'Luz Roja',
      venue_name: 'Teatro Colón',
      event_date: '2026-11-01',
    }), showGroupKey({
      id: 'hosp',
      artist_name: 'Luz Roja',
      venue_name: 'Teatro Colón',
      event_date: '2026-11-01',
    }));
  });

  it('no agrupa borradores sin fecha y lugar', () => {
    const cards = buildRiderHomeCards([
      { id: 'a', artist_name: 'Luz Roja', updated_at: '2026-10-02T00:00:00.000Z' },
      { id: 'b', artist_name: 'Luz Roja', updated_at: '2026-10-01T00:00:00.000Z' },
    ]);
    assert.equal(cards.length, 2);
  });

  it('cuenta filtros por rider, no por tipo', () => {
    const cards = buildRiderHomeCards([
      {
        id: 'one',
        artist_name: 'Luz Roja',
        venue_name: 'Movistar Arena',
        event_date: '2026-12-01',
        share_token: 'tok',
        metadata: { showReady: true },
      },
      { id: 'two', title: 'Otro show' },
    ]);
    const counts = countRiderHome(cards);
    assert.deepEqual(counts, { all: 2, draft: 1, shared: 0, ready: 1 });
    assert.equal(filterRiderHome(cards, 'draft').length, 1);
    assert.equal(filterRiderHome(cards, 'ready')[0]?.title, 'Luz Roja');
  });
});
