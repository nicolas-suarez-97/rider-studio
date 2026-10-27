import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyTmDecision,
  canMarkApproved,
  deriveTransportStatus,
  emptyTransportCard,
  emptyTransportOffer,
  formatTransportCardPlain,
  indexTransportAnswersByCardId,
  isCargoCategory,
  isPassengerCategory,
  isSprinterBlackRequirement,
  normalizeTransportCard,
  sprinterBlackBlocksOffer,
  substitutionIsCompliant,
  transportCardIdFromLineId,
  transportLineId,
  transportSendBlockReason,
  validateTransportCard,
} from './transporte-terrestre.ts';

describe('transporte terrestre · fichas', () => {
  it('permite 2 SUV grandes + 1 van ejecutiva + 1 Cargo Van en Parties distintas', () => {
    const cards = [
      { ...emptyTransportCard(), party_name: 'Artista', vehicle_category: 'suv_full_size' as const, quantity: 2, passengers_per_vehicle: 5, service_mode: 'transfers' as const },
      { ...emptyTransportCard(), party_name: 'Management', vehicle_category: 'van_executive' as const, quantity: 1, passengers_per_vehicle: 6, service_mode: 'twelve_hours' as const },
      { ...emptyTransportCard(), party_name: 'Equipaje', vehicle_category: 'cargo_van' as const, quantity: 1, passengers_per_vehicle: null, service_mode: 'transfers' as const },
    ];
    assert.equal(cards.length, 3);
    assert.deepEqual(cards.map((card) => card.party_name), ['Artista', 'Management', 'Equipaje']);
    assert.ok(cards.every((card) => validateTransportCard(card).length === 0));
  });

  it('exige Party, categoría, cantidad y modalidad; pax solo si es de pasajeros', () => {
    const empty = emptyTransportCard();
    const missing = validateTransportCard(empty).map((issue) => issue.field);
    assert.ok(missing.includes('party_name'));
    assert.ok(missing.includes('vehicle_category'));
    assert.ok(missing.includes('service_mode'));

    const cargo = validateTransportCard({
      ...emptyTransportCard(),
      party_name: 'Carga',
      vehicle_category: 'cargo_van',
      service_mode: 'transfers',
    });
    assert.equal(cargo.some((issue) => issue.field === 'passengers_per_vehicle'), false);

    const suv = validateTransportCard({
      ...emptyTransportCard(),
      party_name: 'Banda',
      vehicle_category: 'suv_full_size',
      service_mode: 'transfers',
      passengers_per_vehicle: null,
    });
    assert.ok(suv.some((issue) => issue.field === 'passengers_per_vehicle'));
  });

  it('no trata carga como pasajeros y no usa 8–10 / 15–16 como default', () => {
    assert.equal(isCargoCategory('cargo_van'), true);
    assert.equal(isPassengerCategory('van_medium'), true);
    const card = emptyTransportCard();
    assert.equal(card.passengers_per_vehicle, null);
    assert.equal(card.vehicle_reference, '');
  });

  it('Sprinter Black no equivale a Sprinter convencional', () => {
    assert.equal(isSprinterBlackRequirement('Mercedes-Benz Sprinter Black'), true);
    assert.equal(sprinterBlackBlocksOffer('Sprinter Black', 'Mercedes-Benz Sprinter'), true);
    assert.equal(sprinterBlackBlocksOffer('Sprinter Black', 'Mercedes-Benz Sprinter Black'), false);
  });

  it('el texto de ficha no incluye 24/7 ni 24 horas', () => {
    const text = formatTransportCardPlain({
      ...emptyTransportCard(),
      party_name: 'Crew',
      vehicle_category: 'van_executive',
      service_mode: 'full_on_request',
      passengers_per_vehicle: 4,
    });
    assert.match(text, /disponibilidad completa a solicitud/i);
    assert.doesNotMatch(text, /24\/7|24 horas/i);
    assert.match(text, /Conductor\/piloto: incluido/);
  });

  it('normaliza fichas guardadas sin inventar marca', () => {
    const card = normalizeTransportCard({ id: 'a', party_name: 'Avanzada', quantity: 3 });
    assert.equal(card.vehicle_reference, '');
    assert.equal(card.quantity, 3);
    assert.equal(card.approval_owner, 'TM');
  });
});

const photo = { name: 'van.jpg', mime: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,abc' };

describe('transporte terrestre · contrarider', () => {
  it('sin fotos no permite aprobación', () => {
    const offer = emptyTransportOffer();
    assert.equal(canMarkApproved({ offer, tmDecision: 'aprobada' }), false);
    const withPhoto = { ...offer, photos: [photo] };
    assert.equal(canMarkApproved({ offer: withPhoto, tmDecision: 'aprobada' }), true);
    assert.equal(canMarkApproved({ offer: withPhoto, tmDecision: null }), false);
  });

  it('alternativa negociable queda pendiente y no conforme si no es negociable', () => {
    const negotiable = { ...emptyTransportCard(), negotiability: 'negociable' as const, vehicle_reference: 'V-Class' };
    const locked = { ...emptyTransportCard(), negotiability: 'no_negociable' as const, vehicle_reference: 'Sprinter Black' };
    const alt = { ...emptyTransportOffer(), makeModel: 'Sprinter', photos: [photo] };
    assert.equal(substitutionIsCompliant(negotiable, alt, 'alternativa'), true);
    assert.equal(substitutionIsCompliant(locked, alt, 'alternativa'), false);
    assert.match(
      transportSendBlockReason({
        card: locked,
        response: 'alternativa',
        offer: alt,
        note: '',
        offerText: 'Sprinter convencional',
      }) || '',
      /no negociable/i,
    );
  });

  it('cubro de Sprinter convencional no queda conforme frente a Sprinter Black', () => {
    const card = {
      ...emptyTransportCard(),
      vehicle_reference: 'Mercedes-Benz Sprinter Black',
      negotiability: 'no_negociable' as const,
    };
    const offer = { ...emptyTransportOffer(), makeModel: 'Mercedes Sprinter', quantityOffered: 1, photos: [photo] };
    assert.equal(substitutionIsCompliant(card, offer, 'cubro'), false);
    assert.match(
      transportSendBlockReason({
        card,
        response: 'cubro',
        offer,
        note: '',
        offerText: '',
      }) || '',
      /no queda conforme/i,
    );
  });

  it('el TM debe decidir expresamente; enviar no aprueba', () => {
    const offer = { ...emptyTransportOffer(), makeModel: 'Tahoe', quantityOffered: 2, photos: [photo] };
    assert.equal(deriveTransportStatus({
      response: 'cubro',
      offer,
      tmDecision: null,
      sent: true,
    }), 'pendiente_de_revision');
    const decided = applyTmDecision({
      offer,
      status: 'pendiente_de_revision',
      tmDecision: null,
      history: [],
    }, 'aprobada');
    assert.equal(decided.status, 'aprobada');
  });

  it('indexa answers de contra-rider por card.id (hospitality:hosp-transporte:tt-…)', () => {
    const cardId = 'tt-527a5677';
    const lineId = transportLineId('hosp-transporte', cardId);
    assert.equal(lineId, `hospitality:hosp-transporte:${cardId}`);
    assert.equal(transportCardIdFromLineId(lineId), cardId);

    const mapped = indexTransportAnswersByCardId({
      [lineId]: { transportOffer: { makeModel: 'Tahoe' }, transportStatus: 'pendiente_de_revision' },
      'hospitality:hosp-catering:x': { transportStatus: 'sin_respuesta' },
    });
    assert.deepEqual(Object.keys(mapped), [cardId]);
    assert.equal(mapped[cardId].transportStatus, 'pendiente_de_revision');
    assert.equal(mapped[cardId].transportOffer.makeModel, 'Tahoe');
  });
});
