import type { EquipmentCatalogItem } from '../../core/constants/equipment-catalog';

export type BrandModelOption = {
  value: string;
  label: string;
  custom?: boolean;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function customLabel(query: string): string {
  return `Sin coincidencias · Usar "${query.trim()}"`;
}

function matchesQuery(value: string, query: string): boolean {
  const needle = normalize(query);
  if (!needle) return true;
  return normalize(value).includes(needle);
}

function uniqueValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const key = normalize(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(value.trim());
  }
  return unique;
}

function uniqueBrands(catalog: EquipmentCatalogItem[], extras: readonly string[] = []): string[] {
  return uniqueValues([...catalog.map((row) => row.brand), ...extras]);
}

function brandModelPairKey(brand: string, model?: string): string {
  return `${normalize(brand)}\0${normalize(model || '')}`;
}

function withCustomOption(options: BrandModelOption[], query: string): BrandModelOption[] {
  const trimmed = query.trim();
  if (!trimmed) return options;
  if (options.some((option) => !option.custom)) return options;
  return [...options, { value: trimmed, label: customLabel(trimmed), custom: true }];
}

export function listBrands(
  catalog: EquipmentCatalogItem[],
  query: string,
  extras: readonly string[] = [],
): BrandModelOption[] {
  const options = uniqueBrands(catalog, extras)
    .filter((brand) => matchesQuery(brand, query))
    .map((brand) => ({ value: brand, label: brand }));
  return withCustomOption(options, query);
}

export function listModels(
  catalog: EquipmentCatalogItem[],
  brand: string,
  query: string,
  extras: readonly string[] = [],
): BrandModelOption[] {
  const brandKey = normalize(brand);
  const rows = brandKey
    ? catalog.filter((row) => normalize(row.brand) === brandKey)
    : catalog;
  const options = uniqueValues([...rows.map((row) => row.model), ...extras])
    .filter((model) => matchesQuery(model, query))
    .map((model) => ({ value: model, label: model }));
  return withCustomOption(options, query);
}

export function modelBelongsToBrand(
  catalog: EquipmentCatalogItem[],
  brand: string,
  model: string,
): boolean {
  const brandKey = normalize(brand);
  const modelKey = normalize(model);
  if (!brandKey || !modelKey) return false;
  return catalog.some((row) => normalize(row.brand) === brandKey && normalize(row.model) === modelKey);
}

export function applyBrandChange(input: {
  previousBrand: string;
  nextBrand: string;
  model: string;
  catalog: EquipmentCatalogItem[];
}): { brand: string; model: string; warning: string | null } {
  const brand = input.nextBrand.trim();
  const model = input.model.trim();
  if (!model || normalize(input.previousBrand) === normalize(brand)) {
    return { brand, model: input.model, warning: null };
  }
  if (modelBelongsToBrand(input.catalog, brand, model)) {
    return { brand, model, warning: null };
  }
  return {
    brand,
    model,
    warning: `Cambiaste a «${brand}». El modelo «${model}» no coincide con esa marca y sigue escrito. Quítalo si ya no aplica.`,
  };
}

export function resolveListedValue(candidates: readonly string[], query: string): string {
  const key = normalize(query);
  if (!key) return '';
  const listed = candidates.find((value) => normalize(value) === key);
  return listed ?? query.trim();
}

export function appendUniqueBrandModel<T extends { brand: string; model?: string }>(
  items: readonly T[],
  next: T,
): { items: T[]; existing: T | undefined } {
  const key = brandModelPairKey(next.brand, next.model);
  const existing = items.find((item) => brandModelPairKey(item.brand, item.model) === key);
  if (existing) return { items: [...items], existing };
  return { items: [...items, next], existing: undefined };
}

export function formatBrandModelLabel(brand: string, model?: string): string {
  const nextBrand = brand.trim();
  const nextModel = model?.trim();
  if (!nextBrand && !nextModel) return '';
  if (nextBrand && nextModel) return `${nextBrand} · ${nextModel}`;
  return nextBrand || nextModel || '';
}

export function formatRequirementPedido(input: {
  label?: string;
  brand?: string;
  model?: string;
  body?: string;
}): string {
  const label = input.label?.trim() || 'Requisito';
  const gear = formatBrandModelLabel(input.brand || '', input.model);
  const head = gear ? `${label} · ${gear}` : label;
  const body = input.body?.trim();
  return body ? `${head}: ${body}` : head;
}
