import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CONTACT_ROLES, contactRoleOptions, filterContactRoles } from './contact-roles.ts';

describe('CONTACT_ROLES', () => {
  it('incluye la lista inicial del issue #27', () => {
    assert.deepEqual(CONTACT_ROLES, [
      'Tour Manager',
      'Production Manager',
      'Stage Manager',
      'FOH Engineer',
      'Monitor Engineer',
      'Hospitality',
      'Security',
      'Other',
    ]);
  });
});

describe('filterContactRoles', () => {
  it('devuelve todos los roles si la consulta está vacía', () => {
    assert.deepEqual(filterContactRoles(''), [...CONTACT_ROLES]);
    assert.deepEqual(filterContactRoles('   '), [...CONTACT_ROLES]);
  });

  it('filtra por coincidencia parcial sin importar mayúsculas', () => {
    assert.deepEqual(filterContactRoles('foh'), ['FOH Engineer']);
    assert.deepEqual(filterContactRoles('manager'), [
      'Tour Manager',
      'Production Manager',
      'Stage Manager',
    ]);
  });
});

describe('contactRoleOptions', () => {
  it('no ofrece Usar cuando hay coincidencia exacta', () => {
    const options = contactRoleOptions('FOH Engineer');
    assert.deepEqual(options, [{ kind: 'listed', value: 'FOH Engineer', label: 'FOH Engineer' }]);
  });

  it('añade Usar "…" cuando el texto no está en la lista', () => {
    const options = contactRoleOptions('RF Coordinator');
    assert.deepEqual(options.at(-1), {
      kind: 'custom',
      value: 'RF Coordinator',
      label: 'Usar "RF Coordinator"',
    });
    assert.equal(options.some((option) => option.kind === 'listed'), false);
  });

  it('permite texto libre aunque haya coincidencias parciales', () => {
    const options = contactRoleOptions('Manager');
    assert.ok(options.some((option) => option.value === 'Tour Manager'));
    assert.deepEqual(options.at(-1), {
      kind: 'custom',
      value: 'Manager',
      label: 'Usar "Manager"',
    });
  });
});
