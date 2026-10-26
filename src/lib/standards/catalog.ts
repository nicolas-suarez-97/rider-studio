import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import catalogJson from '../../../docs/standards/catalogo_json.json';
import { HOSPITALITY_TERRESTRE_PROTOCOL, STANDARDS_OPERATING_PROTOCOL } from './protocol';
import { renderExistingQualityRules } from './quality-rules';
import { selectStandardFamilies } from './select-families';
import type {
  BuildStandardsContextInput,
  CatalogTable,
  RiderStandardsCatalog,
  StandardFamily,
  StandardsFamilyId,
} from './types';

const TRANSPORT_PART_MD = 'docs/standards/parte-4-transporte-terrestre-contexto-ia.md';

function loadTransportPartMarkdown(): string {
  try {
    return readFileSync(join(process.cwd(), TRANSPORT_PART_MD), 'utf8').trim();
  } catch {
    return '';
  }
}

const catalog = catalogJson as RiderStandardsCatalog;

const SKIP_COLUMNS = new Set(['Ficha', 'Fuente', 'fuente', 'ficha']);
const REVIEW_FAMILY_LIMIT = 7;

export function getStandardsCatalog(): RiderStandardsCatalog {
  return catalog;
}

export function listStandardFamilies(): StandardFamily[] {
  return catalog.partes.flatMap((part) => part.familias);
}

export function findStandardFamily(id: string): StandardFamily | undefined {
  return listStandardFamilies().find((family) => family.id === id);
}

function mentionedBrandTables(family: StandardFamily, haystack: string): CatalogTable[] {
  const needle = haystack.toLowerCase();
  return family.catalogo.filter((table) => {
    const title = (table.titulo || '').toLowerCase();
    if (!title.startsWith('catálogo detallado') && !title.startsWith('catalogo detallado')) {
      if (['digico', 'avid', 'yamaha', 'allen', 'midas', 'behringer', 'soundcraft', 'ssl'].some((brand) => title.includes(brand) && needle.includes(brand))) {
        return true;
      }
    }
    const brand = title.replace(/^catálogo detallado:\s*/i, '').trim();
    return brand.length > 2 && needle.includes(brand.toLowerCase());
  });
}

function renderTable(table: CatalogTable, maxRows: number): string {
  const rows = table.filas || [];
  if (rows.length === 0) return '';

  const columns = (table.columnas || Object.keys(rows[0] || {})).filter((column) => !SKIP_COLUMNS.has(column));
  const lines = [
    `### ${table.titulo}`,
    columns.join(' | '),
    ...rows.slice(0, maxRows).map((row) => columns.map((column) => String(row[column] ?? '').replace(/\s+/g, ' ').trim()).join(' | ')),
  ];
  if (rows.length > maxRows) {
    lines.push(`… ${rows.length - maxRows} filas más en el catálogo oficial.`);
  }
  return lines.join('\n');
}

function renderFamily(family: StandardFamily, haystack: string, mode: 'chat' | 'review'): string {
  const intro = (family.introduccion || []).join(' ').replace(/\s+/g, ' ').trim();
  const compact = mode === 'review';
  const datos = family.datos_que_se_piden
    .map((dato) => compact
      ? `- ${dato.id}: ${dato.dato}`
      : `- ${dato.id} · ${dato.dato}: ${dato.que_debe_decir}`)
    .join('\n');
  const reglas = family.reglas
    .map((regla) => `- ${regla.codigo} [${regla.estado}]: ${regla.texto}`)
    .join('\n');
  const modelo = compact ? '' : family.texto_modelo?.es?.trim();

  const overview = family.catalogo[0];
  const extra = mentionedBrandTables(family, haystack).filter((table) => table !== overview);
  const tables = compact
    ? ''
    : [overview, ...extra.slice(0, 2)]
        .filter(Boolean)
        .map((table) => renderTable(table, 14))
        .filter(Boolean)
        .join('\n\n');

  return [
    `## Familia ${family.nombre} (${family.id})`,
    !compact && intro ? `Intro: ${intro}` : '',
    '### Datos que debe dejar claro el rider',
    datos,
    '### Reglas',
    reglas,
    modelo ? `### Texto modelo (es)\n${modelo}` : '',
    tables,
  ]
    .filter(Boolean)
    .join('\n');
}

function renderValues(): string {
  const blocks = Object.entries(catalog.valores).map(([group, values]) => {
    const items = Object.entries(values)
      .map(([key, meaning]) => `- ${key}: ${meaning}`)
      .join('\n');
    return `${group}:\n${items}`;
  });
  const glossary = Object.entries(catalog.glosario_envios)
    .map(([key, meaning]) => `- ${key}: ${meaning}`)
    .join('\n');
  return `Valores:\n${blocks.join('\n')}\n\nEnvíos (nombres en inglés):\n${glossary}`;
}

export function buildStandardsContext(input: BuildStandardsContextInput): string {
  const haystack = [
    input.query,
    input.sectionTitle,
    input.selection,
    input.sectionText?.slice(0, 400),
    ...(input.sectionTitles || []),
  ]
    .filter(Boolean)
    .join(' \n ');

  const familyIds = selectStandardFamilies({
    query: input.query,
    sectionTitle: input.sectionTitle,
    sectionText: input.sectionText,
    selection: input.selection,
    sectionTitles: input.sectionTitles,
    riderType: input.riderType,
    mode: input.mode,
    limit: input.mode === 'review' ? REVIEW_FAMILY_LIMIT : 3,
  });

  const families = familyIds
    .map((id) => findStandardFamily(id))
    .filter((family): family is StandardFamily => Boolean(family));

  const transportOnly = familyIds.length === 1 && familyIds[0] === 'transporte_terrestre';

  const header = transportOnly
    ? [
      `=== ESTÁNDAR HOSPITALIDAD LOGÍSTICA TERRESTRE (${catalog.documento}, ${catalog.version}) ===`,
      'Usa este estándar para sugerencias y redacción de transporte terrestre. No contradigas las reglas confirmadas. No mezcles con el catálogo de audio.',
      HOSPITALITY_TERRESTRE_PROTOCOL,
    ]
    : [
      `=== ESTÁNDAR TÉCNICO RIDER STUDIO (${catalog.documento}, ${catalog.version}) ===`,
      'Usa este estándar para sugerencias, redacción y auditoría. No contradigas las reglas aprobadas ni las de calidad vigentes.',
      renderExistingQualityRules(),
      STANDARDS_OPERATING_PROTOCOL,
      renderValues(),
    ];

  const transportMarkdown = transportOnly ? loadTransportPartMarkdown() : '';
  const body = transportOnly
    ? [
      transportMarkdown
        ? `=== PARTE 4 (fuente) ===\n${transportMarkdown}`
        : families.map((family) => renderFamily(family, haystack, input.mode)).join('\n\n'),
    ]
    : families.map((family) => renderFamily(family, haystack, input.mode));
  const parts = [...header, ...body].filter(Boolean);
  let context = parts.join('\n\n');

  const budget = input.maxChars ?? (input.mode === 'review' ? 26000 : 18000);
  if (context.length > budget) {
    context = `${context.slice(0, budget)}\n\n[Catálogo recortado: aplica las reglas ya listadas y no inventes modelos.]`;
  }

  return context;
}

export function standardsFamilyIdsForContext(input: BuildStandardsContextInput): StandardsFamilyId[] {
  return selectStandardFamilies({
    query: input.query,
    sectionTitle: input.sectionTitle,
    sectionText: input.sectionText,
    selection: input.selection,
    sectionTitles: input.sectionTitles,
    riderType: input.riderType,
    mode: input.mode,
  });
}
