import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Json } from '../supabase/database.types.ts';
import {
  applyPublishedSnapshot,
  capturePublishedSnapshot,
  hasPublishedSnapshot,
} from './published-snapshot.ts';

function rider(partial: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    title: 'Rider publicado',
    artist_name: 'Banda',
    rider_type: 'tecnico',
    venue_name: 'Club',
    event_date: null,
    version: 'v1.0',
    status: 'in_progress',
    channels: [],
    sections: [{ id: 'tech-pa', title: 'PA', content: 'L-Acoustics K2' }],
    metadata: {
      season: '2026',
      modules: {},
    } as Json,
    media: [],
    share_token: 'token-abc',
    share_enabled: true,
    shared_at: '2026-10-01T00:00:00.000Z',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...partial,
  };
}

describe('published snapshot', () => {
  it('detecta si hay versión publicada', () => {
    assert.equal(hasPublishedSnapshot({}), false);
    const snapshot = capturePublishedSnapshot(rider(), '2026-10-24T12:00:00.000Z');
    assert.equal(hasPublishedSnapshot({ published: snapshot }), true);
  });

  it('al aplicar el snapshot oculta ediciones sin publicar', () => {
    const publishedRow = rider();
    const snapshot = capturePublishedSnapshot(publishedRow, '2026-10-24T12:00:00.000Z');
    const draft = rider({
      title: 'Borrador secreto',
      sections: [{ id: 'tech-pa', title: 'PA', content: 'Pedido no publicado' }],
      metadata: {
        season: 'borrador',
        published: snapshot,
        shareConfirms: { ana: { name: 'Ana', answers: {} } },
      } as Json,
    });

    const visible = applyPublishedSnapshot(draft);
    assert.equal(visible.title, 'Rider publicado');
    assert.deepEqual(visible.sections, publishedRow.sections);
    const meta = visible.metadata as { season?: string; shareConfirms?: unknown };
    assert.equal(meta.season, '2026');
    assert.deepEqual(meta.shareConfirms, { ana: { name: 'Ana', answers: {} } });
  });
});
