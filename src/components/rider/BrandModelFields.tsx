"use client";

import { useCallback, useMemo, useState } from 'react';
import { SearchableCombobox } from '@/components/common/SearchableCombobox';
import { EQUIPMENT_CATALOG } from '@/core/constants/equipment-catalog';
import {
  applyBrandChange,
  formatBrandModelLabel,
  listBrands,
  listModels,
} from '@/lib/equipment/brand-model';
import { textIncludesExclusion } from '@/lib/share/exclusions';
import type { AbsoluteExclusion } from '@/core/types/rider.types';

type BrandModelFieldsProps = {
  brand: string;
  model: string;
  onChange: (next: { brand: string; model: string }) => void;
  disabled?: boolean;
  exclusions?: AbsoluteExclusion[];
  modelOptional?: boolean;
};

export function BrandModelFields({
  brand,
  model,
  onChange,
  disabled = false,
  exclusions = [],
  modelOptional = false,
}: BrandModelFieldsProps) {
  const [brandWarning, setBrandWarning] = useState<string | null>(null);
  const warning = !brand.trim() && !model.trim() ? null : brandWarning;

  const brandOptions = useCallback((query: string) => listBrands(EQUIPMENT_CATALOG, query), []);
  const modelOptions = useCallback(
    (query: string) => listModels(EQUIPMENT_CATALOG, brand, query),
    [brand],
  );

  const exclusionHit = useMemo(() => {
    const haystack = formatBrandModelLabel(brand, model);
    if (!haystack) return null;
    return exclusions.find((item) => textIncludesExclusion(haystack, item)) || null;
  }, [brand, model, exclusions]);

  const setBrand = (nextBrand: string) => {
    const result = applyBrandChange({
      previousBrand: brand,
      nextBrand,
      model,
      catalog: EQUIPMENT_CATALOG,
    });
    onChange({ brand: result.brand, model: result.model });
    setBrandWarning(result.warning);
  };

  const setModel = (nextModel: string) => {
    onChange({ brand, model: nextModel });
    setBrandWarning(null);
  };

  const clearModel = () => {
    onChange({ brand, model: '' });
    setBrandWarning(null);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[8.5rem] flex-1">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Marca</p>
          <SearchableCombobox
            label="Marca"
            value={brand}
            onChange={setBrand}
            getOptions={brandOptions}
            placeholder="Buscar o crear"
            disabled={disabled}
          />
        </div>
        <div className="min-w-[10rem] flex-1">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Modelo{modelOptional ? ' (opcional)' : ''}
          </p>
          <SearchableCombobox
            label={modelOptional ? 'Modelo (opcional)' : 'Modelo'}
            value={model}
            onChange={setModel}
            getOptions={modelOptions}
            placeholder={brand ? 'Buscar o crear' : 'Elige marca o crea'}
            disabled={disabled}
          />
        </div>
      </div>
      {warning ? (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-amber-800">
          <p>{warning}</p>
          {!disabled && model ? (
            <button
              type="button"
              onClick={clearModel}
              className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900"
            >
              Quitar modelo
            </button>
          ) : null}
        </div>
      ) : null}
      {exclusionHit ? (
        <p className="text-[11px] font-medium text-rose-700">
          No aceptado: «{formatBrandModelLabel(exclusionHit.brand, exclusionHit.model)}» está en exclusiones absolutas.
        </p>
      ) : null}
    </div>
  );
}
