import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizePeople } from './rider-block-model.ts';

describe('normalizePeople roles', () => {
  it('conserva un rol libre al reabrir el contacto', () => {
    const people = normalizePeople([
      { id: 'contact-1', role: 'RF Coordinator', name: 'Ana', phone: '300', email: 'ana@band.test' },
    ]);
    assert.equal(people[0]?.role, 'RF Coordinator');
    assert.equal(people[0]?.name, 'Ana');
  });
});
