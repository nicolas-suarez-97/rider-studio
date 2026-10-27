export type RiderScheduleKind = 'gira' | 'fecha_individual';
export type RiderDocumentFormat = 'reducido' | 'intermedio' | 'completo' | 'otro';
export type RiderTypeHint = 'tecnico' | 'hospitality' | 'seguridad';

export interface RiderGenerationContext {
  scheduleKind: RiderScheduleKind;
  scheduleLabel?: string;
  format: RiderDocumentFormat;
  formatOther?: string;
  scale: string;
  scaleOther?: string;
  notes?: string;
}

export type RiderGenerationDraft = Partial<RiderGenerationContext> & {
  scheduleLabel?: string;
  formatOther?: string;
  scaleOther?: string;
  notes?: string;
};

export type RiderGenerationGate =
  | { action: 'request_context' }
  | { action: 'reuse_linked_rider'; riderId: string }
  | { action: 'ask_before_new_rider'; riderId: string }
  | { action: 'none' };

export const OTHER_SCALE = 'otra';
export const DOCUMENT_COVER_ID = 'doc-cover';

export const SCHEDULE_OPTIONS: Array<{ id: RiderScheduleKind; label: string }> = [
  { id: 'gira', label: 'Gira' },
  { id: 'fecha_individual', label: 'Fecha individual' },
];

export const FORMAT_OPTIONS: Array<{ id: RiderDocumentFormat; label: string }> = [
  { id: 'reducido', label: 'Reducido' },
  { id: 'intermedio', label: 'Intermedio' },
  { id: 'completo', label: 'Completo' },
  { id: 'otro', label: 'Otro' },
];

export const SCALE_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'club', label: 'Club / sala' },
  { id: 'teatro', label: 'Teatro' },
  { id: 'arena', label: 'Arena / recinto' },
  { id: 'estadio', label: 'Estadio / festival' },
  { id: OTHER_SCALE, label: 'Otra (la escribo yo)' },
];

export const CONTEXT_REQUEST_MESSAGE =
  'Antes de generar el rider necesito un contexto mínimo. Elige gira o fecha, el formato, y la escala de producción (tú la decides; yo no la infiero). Las observaciones son opcionales. Revisa el resumen y confirma para crear y vincular el documento.';

export const REUSE_LINKED_RIDER_MESSAGE =
  'Este chat ya está vinculado a un rider. Abrí el editor de ese documento para generar sobre él; no creé un rider nuevo.';

export const ASK_BEFORE_NEW_RIDER_MESSAGE =
  'Este chat ya tiene un rider vinculado. ¿Quieres abrir ese documento o crear uno nuevo? Si cancelas, no se crea ni se cambia el vínculo.';

const GENERATE_RIDER =
  /(?:genera(?:r)?|crea(?:r)?|arma(?:r)?|redacta(?:r)?|prepara(?:r)?)\s+(?:un\s+|el\s+|mi\s+|este\s+)?(?:nuevo\s+)?rider\b/i;

const NEED_RIDER =
  /(?:necesito|quiero|podr[ií]as|puedes)\s+(?:crear\s+|generar\s+|armar\s+)?(?:un\s+|el\s+)?(?:nuevo\s+)?rider\b/i;

const BLANK_RIDER = /\brider\s+(?:nuevo|desde\s+cero|en\s+blanco)\b/i;

const SECTION_ONLY =
  /\b(?:input\s*list|pa\b|consola|iem|backline|stage\s*plot|hospitality|seguridad)\b/i;

const TRANSFER_OR_QUESTION =
  /^(?:qué|que|cómo|como|cuál|cual|por qué|añade|anade|agrega|pasa)\b/i;

const NEW_RIDER_BESIDE_EXISTING =
  /(?:otro\s+rider|rider\s+nuevo|nuevo\s+rider|desde\s+cero|en\s+blanco)/i;

const TECH_SECTIONS = [
  { id: 'tech-contactos', title: 'Info General & Contactos Clave' },
  { id: 'tech-pa', title: 'Sistema de PA & Consola FOH' },
  { id: 'tech-monitores', title: 'Monitoreo, IEM & Radiofrecuencia (RF)' },
  { id: 'tech-backline', title: 'Backline Requerido & Voltajes' },
  { id: 'tech-inputlist', title: 'Input List & Patch de Escenario' },
  { id: 'tech-stageplot', title: 'Stage Plot & Acometida Eléctrica' },
  { id: 'tech-iluminacion', title: 'Iluminación, Pantallas LED & Visuales' },
  { id: 'tech-rigging', title: 'Rigging, Cargas & Puntos de Cuelgue' },
  { id: 'tech-terminos', title: 'Condiciones Contractuales & SLA Contra-Rider' },
];

const HOSP_SECTIONS = [
  { id: 'hosp-camerinos', title: 'Camerinos & Acondicionamiento' },
  { id: 'hosp-catering', title: 'Catering, Menú & Dietas Especiales' },
  { id: 'hosp-bebidas', title: 'Hidratación, Bebidas & Cuidado Vocal' },
  { id: 'hosp-lavanderia', title: 'Guardarropa, Lavandería & Toallas' },
  { id: 'hosp-hotel', title: 'Hotelería & Alojamiento' },
  { id: 'hosp-transporte', title: 'Transporte Local & Logística de Carga' },
];

const SEG_SECTIONS = [
  { id: 'seg-perimetro', title: 'Perímetro, Accesos & Drones' },
  { id: 'seg-foso', title: 'Vallas Mojo, Foso (Pit) & Hidratación' },
  { id: 'seg-custodia', title: 'Custodia del Artista & Backstage Estéril' },
  { id: 'seg-emergencias', title: 'Unidad Médica, Evacuación & Primeros Auxilios' },
  { id: 'seg-sfx', title: 'Seguridad en Efectos Especiales & Pirotecnia' },
  { id: 'seg-clima', title: 'Protocolo Meteorológico & Viento Límite' },
];

const REDUCED_TECH = ['tech-contactos', 'tech-pa', 'tech-inputlist'];
const MID_TECH = [
  'tech-contactos',
  'tech-pa',
  'tech-monitores',
  'tech-backline',
  'tech-inputlist',
  'tech-stageplot',
];

function catalogFor(type: RiderTypeHint) {
  if (type === 'hospitality') return HOSP_SECTIONS;
  if (type === 'seguridad') return SEG_SECTIONS;
  return TECH_SECTIONS;
}

function isDocumentCover(id: string): boolean {
  return id === DOCUMENT_COVER_ID;
}

export function defaultContextDraft(): RiderGenerationDraft {
  return {
    scheduleKind: undefined,
    scheduleLabel: '',
    format: undefined,
    formatOther: '',
    scale: '',
    scaleOther: '',
    notes: '',
  };
}

export function isGenerateRiderIntent(text: string): boolean {
  const prompt = (text || '').trim();
  if (!prompt) return false;
  if (TRANSFER_OR_QUESTION.test(prompt) && !GENERATE_RIDER.test(prompt)) return false;
  if (SECTION_ONLY.test(prompt) && !/\brider\b/i.test(prompt)) return false;
  if (GENERATE_RIDER.test(prompt) || NEED_RIDER.test(prompt) || BLANK_RIDER.test(prompt)) {
    if (/input\s*list/i.test(prompt) && !/\brider\b/i.test(prompt)) return false;
    return true;
  }
  return false;
}

export function resolveRiderGenerationGate(input: {
  riderId?: string | null;
  userText: string;
  cancelled?: boolean;
}): RiderGenerationGate {
  if (input.cancelled) return { action: 'none' };
  if (!isGenerateRiderIntent(input.userText)) return { action: 'none' };

  const riderId = (input.riderId || '').trim();
  if (riderId) {
    if (NEW_RIDER_BESIDE_EXISTING.test(input.userText)) {
      return { action: 'ask_before_new_rider', riderId };
    }
    return { action: 'reuse_linked_rider', riderId };
  }

  return { action: 'request_context' };
}

export function resolvedScale(ctx: RiderGenerationDraft): string {
  const scale = (ctx.scale || '').trim();
  if (!scale) return '';
  if (scale === OTHER_SCALE || scale.toLowerCase() === OTHER_SCALE) {
    return (ctx.scaleOther || '').trim();
  }
  const preset = SCALE_OPTIONS.find((option) => option.id === scale || option.label === scale);
  return preset?.label || scale;
}

export function isContextComplete(ctx: RiderGenerationDraft): ctx is RiderGenerationContext {
  if (ctx.scheduleKind !== 'gira' && ctx.scheduleKind !== 'fecha_individual') return false;
  if (!ctx.format || !FORMAT_OPTIONS.some((option) => option.id === ctx.format)) return false;
  return Boolean(resolvedScale(ctx));
}

export function completeContext(ctx: RiderGenerationDraft): RiderGenerationContext | null {
  if (!isContextComplete(ctx)) return null;
  return {
    scheduleKind: ctx.scheduleKind,
    scheduleLabel: (ctx.scheduleLabel || '').trim() || undefined,
    format: ctx.format,
    formatOther: (ctx.formatOther || '').trim() || undefined,
    scale: resolvedScale(ctx),
    scaleOther: ctx.scale === OTHER_SCALE ? (ctx.scaleOther || '').trim() || undefined : undefined,
    notes: (ctx.notes || '').trim() || undefined,
  };
}

export function suggestedSectionIds(
  format: RiderDocumentFormat,
  riderType: RiderTypeHint = 'tecnico',
): string[] {
  const catalog = catalogFor(riderType).map((section) => section.id);

  if (riderType !== 'tecnico') {
    if (format === 'reducido') return catalog.slice(0, Math.min(2, catalog.length));
    if (format === 'intermedio') return catalog.slice(0, Math.min(4, catalog.length));
    return catalog;
  }

  if (format === 'reducido') return REDUCED_TECH;
  if (format === 'intermedio') return MID_TECH;
  return catalog;
}

export function formatSchedule(ctx: RiderGenerationContext): string {
  const kind = ctx.scheduleKind === 'gira' ? 'Gira' : 'Fecha individual';
  const label = (ctx.scheduleLabel || '').trim();
  return label ? `${kind} · ${label}` : kind;
}

export function summarizeContext(ctx: RiderGenerationContext): string {
  const formatLabel = FORMAT_OPTIONS.find((option) => option.id === ctx.format)?.label || ctx.format;
  const formatExtra = ctx.format === 'otro' && ctx.formatOther ? ` (${ctx.formatOther})` : '';
  const notes = ctx.notes?.trim() ? `\nObservaciones: ${ctx.notes.trim()}` : '';
  return [
    `Agenda: ${formatSchedule(ctx)}`,
    `Formato: ${formatLabel}${formatExtra}`,
    `Escala (elegida por ti): ${ctx.scale}`,
  ].join('\n') + notes;
}

export interface SeedableRider {
  type: RiderTypeHint;
  season: string;
  venue: string;
  sections: Array<{
    id: string;
    title: string;
    content?: string;
    subtitle?: string;
    tag?: string;
    tagColor?: string;
    iconName?: string;
    type?: RiderTypeHint;
  }>;
  applyTemplateOutline(): void;
  renumberSections(): void;
  syncCurrentModule(): void;
}

export function riderHasManualContent(rider: Pick<SeedableRider, 'sections'>): boolean {
  return rider.sections.some((section) => {
    if (isDocumentCover(section.id)) return false;
    return Boolean((section.content || '').trim()) || section.id.startsWith('custom-');
  });
}

export function seedRiderFromContext(rider: SeedableRider, ctx: RiderGenerationContext): void {
  rider.season = formatSchedule(ctx);
  rider.venue = ctx.scale;

  const ids = suggestedSectionIds(ctx.format, rider.type);
  const keepManual = riderHasManualContent(rider);

  if (keepManual) {
    const existing = new Set(rider.sections.map((section) => section.id));
    for (const spec of catalogFor(rider.type)) {
      if (!ids.includes(spec.id) || existing.has(spec.id)) continue;
      rider.sections.push({
        id: spec.id,
        title: spec.title,
        content: '',
        type: rider.type,
      });
    }
    rider.renumberSections();
    rider.syncCurrentModule();
    return;
  }

  rider.applyTemplateOutline();
  const keep = new Set<string>([DOCUMENT_COVER_ID, ...ids]);
  rider.sections = rider.sections.filter((section) => keep.has(section.id));
  rider.renumberSections();
  rider.syncCurrentModule();
}

export function gateReplyMessage(gate: RiderGenerationGate): string | null {
  if (gate.action === 'request_context') return CONTEXT_REQUEST_MESSAGE;
  if (gate.action === 'reuse_linked_rider') return REUSE_LINKED_RIDER_MESSAGE;
  if (gate.action === 'ask_before_new_rider') return ASK_BEFORE_NEW_RIDER_MESSAGE;
  return null;
}
