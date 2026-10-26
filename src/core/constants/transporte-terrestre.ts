import type { RiderContentDoc, RiderContentNode, SectionItem } from '@/core/types/rider.types';

export const TRANSPORT_SECTION_ID = 'hosp-transporte';

export type VehicleCategory =
  | 'suv_full_size'
  | 'suv_compact_crossover'
  | 'van_medium'
  | 'van_large'
  | 'van_executive'
  | 'cargo_van'
  | 'luggage_van'
  | 'runner_vehicle';

export type ServiceMode = 'transfers' | 'twelve_hours' | 'full_on_request';

export type RouteCode =
  | 'airport_pickup'
  | 'airport_dropoff'
  | 'hotel_to_venue'
  | 'venue_to_hotel'
  | 'custom_route';

export type Negotiability = 'negociable' | 'no_negociable';

export type ArmoredChoice = 'yes' | 'no' | 'unspecified';

export type RunnerKind = 'automobile' | 'suv' | 'van' | 'motorcycle' | 'other';

export type TransportProposalStatus =
  | 'sin_respuesta'
  | 'propuesta_recibida'
  | 'pendiente_de_revision'
  | 'aprobada'
  | 'rechazada'
  | 'requiere_ajustes';

export type TransportTmDecision = 'aprobada' | 'rechazada' | 'requiere_ajustes';

export interface VehicleCategoryDef {
  code: VehicleCategory;
  label: string;
  references: string[];
  habitual: string;
  isCargo: boolean;
}

export const VEHICLE_CATEGORIES: VehicleCategoryDef[] = [
  {
    code: 'suv_full_size',
    label: 'SUV grande / Full-size SUV',
    references: ['GMC Yukon', 'Chevrolet Tahoe', 'Chevrolet Suburban', 'Cadillac Escalade', 'Ford Expedition'],
    habitual: 'Artista o management',
    isCargo: false,
  },
  {
    code: 'suv_compact_crossover',
    label: 'SUV compacta / crossover',
    references: ['Renault Duster', 'Suzuki Vitara', 'Renault Arkana', 'Hyundai Tucson', 'Hyundai Kona'],
    habitual: 'Grupos pequeños, avanzada o producción',
    isCargo: false,
  },
  {
    code: 'van_medium',
    label: 'Van mediana / tipo H1',
    references: ['Hyundai H1'],
    habitual: 'Aproximadamente 8–10 pasajeros, sujeto a capacidad real',
    isCargo: false,
  },
  {
    code: 'van_large',
    label: 'Van grande / tipo Sprinter',
    references: ['Mercedes-Benz Sprinter'],
    habitual: 'Habitualmente grupos de 15–16 pasajeros, sujeto a configuración real',
    isCargo: false,
  },
  {
    code: 'van_executive',
    label: 'Van ejecutiva / lujo',
    references: ['Mercedes-Benz Sprinter Black/Executive', 'Mercedes-Benz Vito', 'Mercedes-Benz V-Class'],
    habitual: 'Transporte ejecutivo de artista y/o management',
    isCargo: false,
  },
  {
    code: 'cargo_van',
    label: 'Cargo Van',
    references: [],
    habitual: 'Carga de producción',
    isCargo: true,
  },
  {
    code: 'luggage_van',
    label: 'Luggage Van',
    references: [],
    habitual: 'Maletas personales; no asumir aptitud para racks/carga pesada',
    isCargo: true,
  },
  {
    code: 'runner_vehicle',
    label: 'Vehículo de runner',
    references: [],
    habitual: 'Mensajería, diligencias y apoyo operativo durante el show',
    isCargo: false,
  },
];

export const SERVICE_MODES: { code: ServiceMode; label: string }[] = [
  { code: 'transfers', label: 'Por trayectos' },
  { code: 'twelve_hours', label: 'Disponibilidad por 12 horas' },
  { code: 'full_on_request', label: 'Disponibilidad completa a solicitud del artista' },
];

export const ROUTE_OPTIONS: { code: RouteCode; label: string }[] = [
  { code: 'airport_pickup', label: 'Aeropuerto → Hotel (Airport Pick-up)' },
  { code: 'airport_dropoff', label: 'Hotel → Aeropuerto (Airport Drop-off)' },
  { code: 'hotel_to_venue', label: 'Hotel → Venue' },
  { code: 'venue_to_hotel', label: 'Venue → Hotel' },
  { code: 'custom_route', label: 'Trayecto personalizado' },
];

export const RUNNER_KINDS: { code: RunnerKind; label: string }[] = [
  { code: 'automobile', label: 'Automóvil' },
  { code: 'suv', label: 'SUV' },
  { code: 'van', label: 'Van' },
  { code: 'motorcycle', label: 'Motocicleta' },
  { code: 'other', label: 'Otro' },
];

export const TRANSPORT_PROPOSAL_STATUSES: TransportProposalStatus[] = [
  'sin_respuesta',
  'propuesta_recibida',
  'pendiente_de_revision',
  'aprobada',
  'rechazada',
  'requiere_ajustes',
];

export interface TransportVehicleCard {
  id: string;
  kind: 'vehicle' | 'runner';
  party_name: string;
  vehicle_category: VehicleCategory | '';
  vehicle_reference: string;
  runner_kind: RunnerKind | '';
  quantity: number;
  passengers_per_vehicle: number | null;
  service_mode: ServiceMode | '';
  routes: RouteCode[];
  custom_route_text: string;
  color: string;
  minimum_year: string;
  armored_required: ArmoredChoice;
  negotiability: Negotiability;
  notes: string;
  approval_owner: 'TM';
}

export interface TransportPhoto {
  name: string;
  mime: string;
  dataUrl: string;
}

export interface TransportHistoryEntry {
  at: string;
  action: string;
  note?: string;
}

export interface TransportContraOffer {
  quantityOffered: number | null;
  category: VehicleCategory | '';
  makeModel: string;
  year: string;
  passengersPerVehicle: number | null;
  color: string;
  armored: ArmoredChoice;
  serviceMode: ServiceMode | '';
  routes: RouteCode[];
  deviation: string;
  photos: TransportPhoto[];
}

function newCardId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `tt-${crypto.randomUUID()}`;
  }
  return `tt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function categoryDef(code: string | undefined): VehicleCategoryDef | undefined {
  return VEHICLE_CATEGORIES.find((item) => item.code === code);
}

export function isCargoCategory(code: string | undefined): boolean {
  return categoryDef(code)?.isCargo === true;
}

export function isPassengerCategory(code: string | undefined): boolean {
  return Boolean(code) && !isCargoCategory(code);
}

export function emptyTransportCard(kind: 'vehicle' | 'runner' = 'vehicle'): TransportVehicleCard {
  return {
    id: newCardId(),
    kind,
    party_name: '',
    vehicle_category: kind === 'runner' ? 'runner_vehicle' : '',
    vehicle_reference: '',
    runner_kind: '',
    quantity: 1,
    passengers_per_vehicle: kind === 'runner' ? 0 : null,
    service_mode: '',
    routes: [],
    custom_route_text: '',
    color: '',
    minimum_year: '',
    armored_required: 'unspecified',
    negotiability: 'negociable',
    notes: '',
    approval_owner: 'TM',
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function readOptionalEnum<T extends string>(value: unknown, allowed: readonly T[]): T | '' {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : '';
}

export function normalizeTransportCard(value: unknown, index = 0): TransportVehicleCard {
  const raw = asRecord(value) || {};
  const kind = raw.kind === 'runner' ? 'runner' : 'vehicle';
  const category = readOptionalEnum(raw.vehicle_category, VEHICLE_CATEGORIES.map((item) => item.code));
  const quantity = typeof raw.quantity === 'number' && Number.isFinite(raw.quantity)
    ? Math.max(1, Math.floor(raw.quantity))
    : 1;
  const passengers = raw.passengers_per_vehicle;
  const cargo = isCargoCategory(category);
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `tt-${index + 1}`,
    kind,
    party_name: typeof raw.party_name === 'string' ? raw.party_name : '',
    vehicle_category: kind === 'runner' ? 'runner_vehicle' : category,
    vehicle_reference: typeof raw.vehicle_reference === 'string' ? raw.vehicle_reference : '',
    runner_kind: readOptionalEnum(raw.runner_kind, RUNNER_KINDS.map((item) => item.code)),
    quantity,
    passengers_per_vehicle: cargo
      ? null
      : typeof passengers === 'number' && Number.isFinite(passengers)
        ? Math.max(0, Math.floor(passengers))
        : kind === 'runner' ? 0 : null,
    service_mode: readOptionalEnum(raw.service_mode, SERVICE_MODES.map((item) => item.code)),
    routes: Array.isArray(raw.routes)
      ? raw.routes.filter((item): item is RouteCode => (
        typeof item === 'string' && ROUTE_OPTIONS.some((route) => route.code === item)
      ))
      : [],
    custom_route_text: typeof raw.custom_route_text === 'string' ? raw.custom_route_text : '',
    color: typeof raw.color === 'string' ? raw.color : '',
    minimum_year: typeof raw.minimum_year === 'string' || typeof raw.minimum_year === 'number'
      ? String(raw.minimum_year)
      : '',
    armored_required: readEnum(raw.armored_required, ['yes', 'no', 'unspecified'] as const, 'unspecified'),
    negotiability: readEnum(raw.negotiability, ['negociable', 'no_negociable'] as const, 'negociable'),
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    approval_owner: 'TM',
  };
}

export function normalizeTransportCards(value: unknown): TransportVehicleCard[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => normalizeTransportCard(item, index));
}

export interface TransportCardIssue {
  field: string;
  message: string;
}

export function validateTransportCard(card: TransportVehicleCard): TransportCardIssue[] {
  const issues: TransportCardIssue[] = [];
  if (!card.party_name.trim()) issues.push({ field: 'party_name', message: 'Indica el Party o grupo.' });
  if (!card.vehicle_category) issues.push({ field: 'vehicle_category', message: 'Elige una categoría.' });
  if (!Number.isInteger(card.quantity) || card.quantity < 1) {
    issues.push({ field: 'quantity', message: 'La cantidad debe ser un entero ≥ 1.' });
  }
  if (!card.service_mode) issues.push({ field: 'service_mode', message: 'Elige la modalidad de servicio.' });
  if (isPassengerCategory(card.vehicle_category) && card.kind !== 'runner') {
    if (card.passengers_per_vehicle === null || card.passengers_per_vehicle < 0) {
      issues.push({ field: 'passengers_per_vehicle', message: 'Indica pasajeros por vehículo (sin contar al conductor).' });
    }
  }
  if (card.kind === 'runner' && !card.runner_kind) {
    issues.push({ field: 'runner_kind', message: 'Indica el tipo de vehículo de runner.' });
  }
  return issues;
}

export function formatTransportCardPlain(card: TransportVehicleCard): string {
  const category = categoryDef(card.vehicle_category)?.label || (card.vehicle_category || 'Sin categoría');
  const mode = SERVICE_MODES.find((item) => item.code === card.service_mode)?.label || 'Modalidad por definir';
  const routes = card.routes.map((code) => {
    if (code === 'custom_route' && card.custom_route_text.trim()) {
      return `Trayecto personalizado: ${card.custom_route_text.trim()}`;
    }
    return ROUTE_OPTIONS.find((item) => item.code === code)?.label || code;
  });
  const armored = card.armored_required === 'yes'
    ? 'Blindaje: sí'
    : card.armored_required === 'no'
      ? 'Blindaje: no'
      : '';
  const lines = [
    `Party: ${card.party_name.trim() || 'por definir'}`,
    `Categoría: ${category}`,
    card.kind === 'runner' && card.runner_kind
      ? `Tipo runner: ${RUNNER_KINDS.find((item) => item.code === card.runner_kind)?.label}`
      : '',
    `Cantidad: ${card.quantity}`,
    isPassengerCategory(card.vehicle_category) && card.passengers_per_vehicle !== null
      ? `Pasajeros/vehículo: ${card.passengers_per_vehicle} (sin contar conductor)`
      : '',
    card.vehicle_reference.trim() ? `Referencia: ${card.vehicle_reference.trim()}` : '',
    `Modalidad: ${mode}`,
    routes.length ? `Rutas: ${routes.join('; ')} (horarios y ubicaciones pueden quedar por confirmar)` : 'Rutas: por confirmar',
    card.color.trim() ? `Color: ${card.color.trim()}` : '',
    card.minimum_year.trim() ? `Año mínimo: ${card.minimum_year.trim()}` : '',
    armored,
    `Negociabilidad: ${card.negotiability === 'no_negociable' ? 'No negociable' : 'Negociable'}`,
    'Conductor/piloto: incluido',
    `Aprobación: ${card.approval_owner}`,
    card.notes.trim() ? `Observaciones: ${card.notes.trim()}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

export function formatTransportFleetPlain(cards: TransportVehicleCard[]): string {
  if (!cards.length) return '';
  return cards.map((card, index) => `Ficha ${index + 1}\n${formatTransportCardPlain(card)}`).join('\n\n');
}

export function collectTransportCardsFromNodes(nodes: RiderContentNode[] | undefined): TransportVehicleCard[] {
  const cards: TransportVehicleCard[] = [];
  const visit = (node: RiderContentNode | undefined) => {
    if (!node) return;
    if (node.type === 'transportFleet') {
      cards.push(...normalizeTransportCards(node.attrs?.cards));
      return;
    }
    for (const child of node.content || []) visit(child);
  };
  for (const node of nodes || []) visit(node);
  return cards;
}

export function collectTransportCardsFromDoc(doc: RiderContentDoc | undefined): TransportVehicleCard[] {
  return collectTransportCardsFromNodes(doc?.content);
}

export function collectTransportCardsFromSection(section: Pick<SectionItem, 'id' | 'contentDoc'>): TransportVehicleCard[] {
  if (section.id !== TRANSPORT_SECTION_ID) return [];
  return collectTransportCardsFromDoc(section.contentDoc);
}

export function transportFleetNode(cards: TransportVehicleCard[] = []): RiderContentNode {
  return {
    type: 'transportFleet',
    attrs: { cards },
  };
}

export function transportFleetDoc(cards: TransportVehicleCard[] = []): RiderContentDoc {
  return { type: 'doc', content: [transportFleetNode(cards)] };
}

const BLACK_SPRINTER = /sprinter\s*(black|executive|ejecutiva)/i;
const PLAIN_SPRINTER = /sprinter/i;

export function isSprinterBlackRequirement(reference: string): boolean {
  return BLACK_SPRINTER.test(reference);
}

export function isConventionalSprinterOffer(makeModel: string): boolean {
  return PLAIN_SPRINTER.test(makeModel) && !BLACK_SPRINTER.test(makeModel);
}

/** Sprinter convencional no satisface un pedido de Sprinter Black / Executive. */
export function sprinterBlackBlocksOffer(requestReference: string, offeredMakeModel: string): boolean {
  return isSprinterBlackRequirement(requestReference) && isConventionalSprinterOffer(offeredMakeModel);
}

export function emptyTransportOffer(): TransportContraOffer {
  return {
    quantityOffered: null,
    category: '',
    makeModel: '',
    year: '',
    passengersPerVehicle: null,
    color: '',
    armored: 'unspecified',
    serviceMode: '',
    routes: [],
    deviation: '',
    photos: [],
  };
}

export function normalizeTransportOffer(value: unknown): TransportContraOffer {
  const raw = asRecord(value) || {};
  const photos = Array.isArray(raw.photos)
    ? raw.photos.flatMap((item) => {
      const photo = asRecord(item);
      if (!photo || typeof photo.name !== 'string' || !photo.name.trim()) return [];
      if (typeof photo.dataUrl !== 'string' || !photo.dataUrl.startsWith('data:image/')) return [];
      return [{
        name: photo.name.slice(0, 180),
        mime: typeof photo.mime === 'string' ? photo.mime.slice(0, 80) : 'image/jpeg',
        dataUrl: photo.dataUrl.slice(0, 2_500_000),
      }];
    }).slice(0, 4)
    : [];
  return {
    quantityOffered: typeof raw.quantityOffered === 'number' && Number.isFinite(raw.quantityOffered)
      ? Math.max(0, Math.floor(raw.quantityOffered))
      : null,
    category: readOptionalEnum(raw.category, VEHICLE_CATEGORIES.map((item) => item.code)),
    makeModel: typeof raw.makeModel === 'string' ? raw.makeModel.slice(0, 160) : '',
    year: typeof raw.year === 'string' ? raw.year.slice(0, 8) : '',
    passengersPerVehicle: typeof raw.passengersPerVehicle === 'number' && Number.isFinite(raw.passengersPerVehicle)
      ? Math.max(0, Math.floor(raw.passengersPerVehicle))
      : null,
    color: typeof raw.color === 'string' ? raw.color.slice(0, 60) : '',
    armored: readEnum(raw.armored, ['yes', 'no', 'unspecified'] as const, 'unspecified'),
    serviceMode: readOptionalEnum(raw.serviceMode, SERVICE_MODES.map((item) => item.code)),
    routes: Array.isArray(raw.routes)
      ? raw.routes.filter((item): item is RouteCode => (
        typeof item === 'string' && ROUTE_OPTIONS.some((route) => route.code === item)
      ))
      : [],
    deviation: typeof raw.deviation === 'string' ? raw.deviation.slice(0, 1000) : '',
    photos,
  };
}

export function offerHasPhotos(offer: Pick<TransportContraOffer, 'photos'> | undefined): boolean {
  return Boolean(offer?.photos?.some((photo) => photo.dataUrl));
}

export function transportLineId(sectionId: string, cardId: string, module = 'hospitality'): string {
  return `${module}:${sectionId}:${cardId}`;
}

export function isTransportLineId(id: string): boolean {
  return id.includes(`:${TRANSPORT_SECTION_ID}:`);
}

type ContraResponse = '' | 'cubro' | 'alternativa' | 'no_puedo' | 'pregunta';

export interface TransportContraState {
  offer: TransportContraOffer;
  status: TransportProposalStatus;
  tmDecision: TransportTmDecision | null;
  history: TransportHistoryEntry[];
}

export function emptyTransportContraState(): TransportContraState {
  return {
    offer: emptyTransportOffer(),
    status: 'sin_respuesta',
    tmDecision: null,
    history: [],
  };
}

export function proposalFingerprint(offer: TransportContraOffer): string {
  return [
    offer.quantityOffered ?? '',
    offer.category,
    offer.makeModel.trim().toLowerCase(),
    offer.year,
    offer.passengersPerVehicle ?? '',
    offer.color,
    offer.armored,
    offer.serviceMode,
    offer.routes.join(','),
    offer.deviation,
    offer.photos.map((photo) => photo.name).join('|'),
  ].join('::');
}

export function deriveTransportStatus(params: {
  response: ContraResponse;
  offer: TransportContraOffer;
  tmDecision: TransportTmDecision | null;
  sent?: boolean;
}): TransportProposalStatus {
  if (params.tmDecision) return params.tmDecision;
  if (!params.response) return 'sin_respuesta';
  if (!offerHasPhotos(params.offer) && params.response !== 'no_puedo' && params.response !== 'pregunta') {
    return params.sent ? 'propuesta_recibida' : 'sin_respuesta';
  }
  if (params.sent) return 'pendiente_de_revision';
  return params.response ? 'propuesta_recibida' : 'sin_respuesta';
}

export function canMarkApproved(params: {
  offer: TransportContraOffer;
  tmDecision: TransportTmDecision | null;
}): boolean {
  return offerHasPhotos(params.offer) && params.tmDecision === 'aprobada';
}

export function substitutionIsCompliant(
  card: TransportVehicleCard,
  offer: TransportContraOffer,
  response: ContraResponse,
): boolean {
  if (response !== 'alternativa' && response !== 'cubro') return true;
  if (sprinterBlackBlocksOffer(card.vehicle_reference, offer.makeModel)) return false;
  if (card.negotiability === 'no_negociable' && response === 'alternativa') return false;
  if (card.negotiability === 'no_negociable' && response === 'cubro') {
    const requested = card.vehicle_reference.trim().toLowerCase();
    const offered = offer.makeModel.trim().toLowerCase();
    if (requested && offered && requested !== offered) return false;
  }
  return true;
}

export function transportSendBlockReason(params: {
  card: TransportVehicleCard;
  response: ContraResponse;
  offer: TransportContraOffer;
  note: string;
  offerText: string;
}): string | null {
  if (!params.response) return 'Responde cada ficha de transporte antes de enviar.';
  if (params.response === 'pregunta' && !params.note.trim()) {
    return 'Cada pregunta de transporte necesita una nota.';
  }
  if (params.response === 'no_puedo' && !params.note.trim()) {
    return 'Cada “no puedo cumplir” de transporte necesita una nota.';
  }
  if (params.response === 'alternativa') {
    if (params.card.negotiability === 'no_negociable') {
      return 'Un requisito no negociable no admite sustitución. Usa “no puedo cumplir”.';
    }
    if (!params.offerText.trim() && !params.offer.deviation.trim() && !params.offer.makeModel.trim()) {
      return 'La alternativa de transporte necesita describir la oferta.';
    }
    if (!offerHasPhotos(params.offer)) {
      return 'Cada vehículo propuesto, incluida la alternativa, necesita fotografías.';
    }
  }
  if (params.response === 'cubro') {
    if (!params.offer.makeModel.trim()) {
      return 'Indica marca/modelo concreto de cada vehículo propuesto.';
    }
    if (params.offer.quantityOffered === null || params.offer.quantityOffered < 1) {
      return 'Indica la cantidad ofrecida de cada vehículo.';
    }
    if (isPassengerCategory(params.card.vehicle_category) && params.offer.passengersPerVehicle === null) {
      return 'Indica la capacidad real de pasajeros por vehículo.';
    }
    if (!offerHasPhotos(params.offer)) {
      return 'No se puede completar la propuesta de un vehículo sin fotografías.';
    }
    if (!substitutionIsCompliant(params.card, params.offer, 'cubro')) {
      return 'Esa propuesta no queda conforme con un requisito no negociable.';
    }
  }
  return null;
}

export function applyTmDecision(
  current: TransportContraState,
  decision: TransportTmDecision,
  at = new Date().toISOString(),
): TransportContraState {
  if (!offerHasPhotos(current.offer) && decision === 'aprobada') {
    return current;
  }
  const history = [
    ...current.history,
    { at, action: decision, note: 'Decisión expresa del TM' },
  ].slice(-20);
  return {
    ...current,
    tmDecision: decision,
    status: decision,
    history,
  };
}

export function reopenApproved(
  current: TransportContraState,
  at = new Date().toISOString(),
): TransportContraState {
  if (current.tmDecision !== 'aprobada') return current;
  return {
    ...current,
    tmDecision: null,
    status: 'pendiente_de_revision',
    history: [...current.history, { at, action: 'reabierta', note: 'El TM reabrió una decisión aprobada' }].slice(-20),
  };
}

export function afterPromotorChange(
  previous: TransportContraState | undefined,
  nextOffer: TransportContraOffer,
  sent: boolean,
  response: ContraResponse,
): TransportContraState {
  const prev = previous || emptyTransportContraState();
  const changed = proposalFingerprint(prev.offer) !== proposalFingerprint(nextOffer)
    && (prev.offer.makeModel || prev.offer.photos.length > 0);
  if (changed && prev.tmDecision === 'aprobada') {
    return {
      offer: nextOffer,
      tmDecision: null,
      status: 'pendiente_de_revision',
      history: [
        ...prev.history,
        {
          at: new Date().toISOString(),
          action: 'propuesta_modificada',
          note: 'Cambio posterior: se solicita nueva aprobación del TM',
        },
      ].slice(-20),
    };
  }
  return {
    offer: nextOffer,
    tmDecision: prev.tmDecision,
    history: prev.history,
    status: deriveTransportStatus({
      response,
      offer: nextOffer,
      tmDecision: prev.tmDecision,
      sent,
    }),
  };
}

export const TRANSPORT_STATUS_LABEL: Record<TransportProposalStatus, string> = {
  sin_respuesta: 'Sin respuesta',
  propuesta_recibida: 'Propuesta recibida',
  pendiente_de_revision: 'Pendiente de revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  requiere_ajustes: 'Requiere ajustes',
};
