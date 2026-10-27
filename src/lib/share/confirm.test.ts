import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  guestStorageKey,
  mergeShareConfirms,
  readGuestAnswers,
  validateGuestName,
  validateShareConfirm,
} from './confirm.ts';

describe('identidad de invitado', () => {
  it('guarda el nombre por token de share', () => {
    assert.equal(guestStorageKey('abc_token'), 'rider-share-guest:abc_token');
  });

  it('exige un nombre visible', () => {
    assert.equal(validateGuestName('  '), 'Escribe tu nombre para entrar');
    assert.equal(validateGuestName('Ana'), null);
  });
});

describe('validación de confirmación', () => {
  it('acepta Aprobado sin texto', () => {
    const result = validateShareConfirm({
      lineId: 'tecnico:tech-pa',
      response: 'cubro',
      text: '',
      allowedIds: new Set(['tecnico:tech-pa']),
    });
    assert.equal(result.error, null);
    assert.equal(result.answer?.response, 'cubro');
  });

  it('exige texto en Alternativa, Rechazado y Pregunta', () => {
    for (const response of ['alternativa', 'no_puedo', 'pregunta'] as const) {
      const missing = validateShareConfirm({
        lineId: 'tecnico:tech-pa',
        response,
        text: '   ',
        allowedIds: new Set(['tecnico:tech-pa']),
      });
      assert.match(missing.error || '', /texto/);
    }

    const ok = validateShareConfirm({
      lineId: 'tecnico:tech-pa',
      response: 'pregunta',
      text: '¿Pueden bajar SPL?',
      allowedIds: new Set(['tecnico:tech-pa']),
    });
    assert.equal(ok.error, null);
    assert.equal(ok.answer?.note, '¿Pueden bajar SPL?');
  });
});

describe('persistencia de respuestas por invitado', () => {
  it('mezcla respuestas del mismo nombre sin pisar a otro invitado', () => {
    const first = mergeShareConfirms({}, 'Ana', 'tecnico:tech-pa', {
      response: 'cubro',
      offer: '',
      note: '',
    });
    const second = mergeShareConfirms(first, 'Ana', 'tecnico:tech-iem', {
      response: 'pregunta',
      offer: '',
      note: '¿Cuántos packs?',
    });
    const other = mergeShareConfirms(second, 'Luis', 'tecnico:tech-pa', {
      response: 'no_puedo',
      offer: '',
      note: 'No hay K2',
    });

    assert.equal(readGuestAnswers(other, 'Ana')['tecnico:tech-pa']?.response, 'cubro');
    assert.equal(readGuestAnswers(other, 'Ana')['tecnico:tech-iem']?.note, '¿Cuántos packs?');
    assert.equal(readGuestAnswers(other, 'Luis')['tecnico:tech-pa']?.response, 'no_puedo');
    assert.equal(readGuestAnswers(other, 'Ana')['tecnico:tech-pa']?.response, 'cubro');
  });
});
