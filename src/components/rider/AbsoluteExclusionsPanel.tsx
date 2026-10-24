"use client";

import { FormEvent, useState } from 'react';
import type { AbsoluteExclusion } from '@/core/types/rider.types';
import { formatExclusionLabel } from '@/lib/share/exclusions';
import { BrandModelFields } from '@/components/rider/BrandModelFields';

interface AbsoluteExclusionsPanelProps {
  exclusions: AbsoluteExclusion[];
  readOnly?: boolean;
  onAdd?: (brand: string, model?: string) => void;
  onRemove?: (id: string) => void;
}

export function AbsoluteExclusionsPanel({
  exclusions,
  readOnly = false,
  onAdd,
  onRemove,
}: AbsoluteExclusionsPanelProps) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');

  if (readOnly && exclusions.length === 0) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextBrand = brand.trim();
    if (!nextBrand || !onAdd) return;
    const nextModel = model.trim();
    onAdd(nextBrand, nextModel || undefined);
    setBrand('');
    setModel('');
  };

  return (
    <section className="shrink-0 border-b border-rose-100 bg-rose-50/70 px-3 py-2.5 sm:px-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
        No aceptado bajo ninguna circunstancia
      </p>
      <p className="mt-0.5 text-[11px] text-rose-800/80">
        {readOnly
          ? 'El organizador no puede aprobar un pedido o alternativa que choque con estas marcas.'
          : 'Marca y modelo (opcional) que no se aceptan. Prioridad PA y líneas técnicas.'}
      </p>

      {exclusions.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {exclusions.map((exclusion) => (
            <li
              key={exclusion.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-800"
            >
              <span>{formatExclusionLabel(exclusion)}</span>
              {!readOnly && onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(exclusion.id)}
                  className="text-rose-400 hover:text-rose-700"
                  aria-label={`Quitar ${formatExclusionLabel(exclusion)}`}
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-rose-700/70">Aún no hay exclusiones absolutas.</p>
      )}

      {!readOnly && onAdd ? (
        <form onSubmit={submit} className="mt-2 flex flex-wrap items-center gap-2">
          <div className="min-w-[16rem] flex-1">
            <BrandModelFields
              brand={brand}
              model={model}
              modelOptional
              onChange={(next) => {
                setBrand(next.brand);
                setModel(next.model);
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!brand.trim()}
            className="h-8 rounded-xl bg-rose-700 px-3 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-50"
          >
            Añadir
          </button>
        </form>
      ) : null}
    </section>
  );
}
