import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  KEEPALIVE_BODY_LIMIT,
  canShowSaveSuccessToast,
  persistRequestInit,
  planLeavePersist,
} from './persist-on-leave.ts';

describe('canShowSaveSuccessToast', () => {
  it('solo permite el toast de éxito cuando el backend ya confirmó', () => {
    assert.equal(canShowSaveSuccessToast(false), false);
    assert.equal(canShowSaveSuccessToast(true), true);
  });
});

describe('planLeavePersist', () => {
  it('no reenvía nada si no hay edits pendientes ni save en vuelo', () => {
    assert.deepEqual(
      planLeavePersist({ dirty: false, saving: false, pendingFlush: false }, '{"id":"abc"}'),
      { action: 'none' },
    );
  });

  it('si el save ya va en vuelo, no lanza un segundo keepalive (el fetch original sobrevive al reload)', () => {
    const body = JSON.stringify({ title: 'Área FOH', artist_name: 'QA' });
    const plan = planLeavePersist({ dirty: true, saving: true, pendingFlush: false }, body);
    assert.deepEqual(plan, { action: 'none' });
  });

  it('hace flush keepalive si el debounce de autoguardado aún no disparó', () => {
    const body = '{"title":"pending"}';
    const plan = planLeavePersist({ dirty: true, saving: false, pendingFlush: true }, body);
    assert.equal(plan.action, 'keepalive');
  });

  it('bloquea el unload si el payload no cabe en keepalive', () => {
    const body = 'x'.repeat(KEEPALIVE_BODY_LIMIT + 1);
    const plan = planLeavePersist({ dirty: true, saving: true, pendingFlush: false }, body);
    assert.deepEqual(plan, { action: 'block' });
  });
});

describe('persistRequestInit', () => {
  it('marca keepalive para que el save iniciado sobreviva al reload', () => {
    const init = persistRequestInit('{"ok":true}', { keepalive: true });
    assert.equal(init.keepalive, true);
    assert.equal(init.method, 'POST');
    assert.equal((init.headers as Record<string, string>)['Content-Type'], 'application/json');
  });
});
