"use client";

import {
  ROUTE_OPTIONS,
  SERVICE_MODES,
  VEHICLE_CATEGORIES,
  emptyTransportOffer,
  isPassengerCategory,
  type ArmoredChoice,
  type RouteCode,
  type TransportContraOffer,
  type TransportVehicleCard,
} from '@/core/constants/transporte-terrestre';
import { TRANSPORT_STATUS_LABEL } from '@/lib/promotor/transport-contra';
import type { ContraLine, ContraResponse } from '@/core/types/contra-rider.types';

interface TransportContraFieldsProps {
  line: ContraLine;
  card: TransportVehicleCard;
  onOffer: (offer: TransportContraOffer) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la foto'));
    reader.readAsDataURL(file);
  });
}

export function TransportContraFields({ line, card, onOffer }: TransportContraFieldsProps) {
  const offer = line.transportOffer || emptyTransportOffer();
  const locked = card.negotiability === 'no_negociable';
  const passenger = isPassengerCategory(card.vehicle_category);

  const patch = (partial: Partial<TransportContraOffer>) => {
    onOffer({ ...offer, ...partial });
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...offer.photos];
    for (const file of Array.from(files).slice(0, 4 - next.length)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 2 * 1024 * 1024) continue;
      next.push({
        name: file.name.slice(0, 180),
        mime: file.type,
        dataUrl: await readFileAsDataUrl(file),
      });
    }
    patch({ photos: next.slice(0, 4) });
  };

  return (
    <div className="mt-4 sm:ml-8 space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Solicitud original</p>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-600 whitespace-pre-wrap">{line.pedido}</p>
        <p className="mt-2 text-[11px] font-bold text-slate-500">
          {locked ? 'No negociable · no se admite sustitución conforme' : 'Negociable · la alternativa queda pendiente del TM'}
        </p>
      </div>

      {line.transportStatus ? (
        <p className="text-[11px] font-bold text-violet-700">
          Estado: {TRANSPORT_STATUS_LABEL[line.transportStatus]}
          {line.tmDecision ? ` · TM: ${TRANSPORT_STATUS_LABEL[line.tmDecision]}` : ''}
        </p>
      ) : null}

      {line.response === 'cubro' || line.response === 'alternativa' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cantidad ofrecida</span>
            <input
              type="number"
              min={1}
              value={offer.quantityOffered ?? ''}
              onChange={(event) => patch({ quantityOffered: event.target.value === '' ? null : Math.max(1, Number(event.target.value) || 1) })}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Categoría</span>
            <select
              value={offer.category}
              onChange={(event) => patch({ category: event.target.value as TransportContraOffer['category'] })}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Elegir…</option>
              {VEHICLE_CATEGORIES.map((item) => (
                <option key={item.code} value={item.code}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Marca / modelo concreto</span>
            <input
              value={offer.makeModel}
              onChange={(event) => patch({ makeModel: event.target.value })}
              placeholder="Obligatorio. Sprinter convencional no cubre Sprinter Black"
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Año</span>
            <input
              value={offer.year}
              onChange={(event) => patch({ year: event.target.value })}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          {passenger ? (
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pasajeros reales / vehículo</span>
              <input
                type="number"
                min={0}
                value={offer.passengersPerVehicle ?? ''}
                onChange={(event) => patch({
                  passengersPerVehicle: event.target.value === '' ? null : Math.max(0, Number(event.target.value) || 0),
                })}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          ) : null}
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Color</span>
            <input
              value={offer.color}
              onChange={(event) => patch({ color: event.target.value })}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Blindaje</span>
            <select
              value={offer.armored}
              onChange={(event) => patch({ armored: event.target.value as ArmoredChoice })}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="unspecified">Sin especificar</option>
              <option value="yes">Sí</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modalidad</span>
            <select
              value={offer.serviceMode}
              onChange={(event) => patch({ serviceMode: event.target.value as TransportContraOffer['serviceMode'] })}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Elegir…</option>
              {SERVICE_MODES.map((item) => (
                <option key={item.code} value={item.code}>{item.label}</option>
              ))}
            </select>
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trayectos confirmados</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {ROUTE_OPTIONS.map((route) => (
                <label key={route.code} className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={offer.routes.includes(route.code)}
                    onChange={() => {
                      const has = offer.routes.includes(route.code);
                      patch({
                        routes: has
                          ? offer.routes.filter((item) => item !== route.code)
                          : [...offer.routes, route.code as RouteCode],
                      });
                    }}
                  />
                  {route.label}
                </label>
              ))}
            </div>
          </fieldset>
          {line.response === 'alternativa' ? (
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">En qué se desvía de la solicitud</span>
              <textarea
                value={offer.deviation}
                onChange={(event) => patch({ deviation: event.target.value })}
                rows={2}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          ) : null}
          <label className="block sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Fotografías del vehículo (obligatorias)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                void addPhotos(event.target.files);
                event.target.value = '';
              }}
              className="mt-1 block w-full text-xs"
            />
            {offer.photos.length === 0 ? (
              <p className="mt-1 text-[11px] font-semibold text-rose-600">Sin fotos no se puede aprobar esta ficha.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {offer.photos.map((photo) => (
                  <button
                    key={photo.name}
                    type="button"
                    onClick={() => patch({ photos: offer.photos.filter((item) => item.name !== photo.name) })}
                    className="relative"
                    title="Quitar foto"
                  >
                    <img src={photo.dataUrl} alt={photo.name} className="w-16 h-12 object-cover rounded-lg border border-slate-200" />
                  </button>
                ))}
              </div>
            )}
          </label>
        </div>
      ) : null}

      {line.response === 'alternativa' && locked ? (
        <p className="text-[12px] font-semibold text-rose-600">
          Este requisito no es negociable. No marques la alternativa como conforme; usa “Rechazado / no puedo cumplir”.
        </p>
      ) : null}
    </div>
  );
}

export function transportChoices(line: ContraLine): ContraResponse[] {
  if (line.kind === 'transport_card' && line.negotiability === 'no_negociable') {
    return ['cubro', 'no_puedo', 'pregunta'];
  }
  return ['cubro', 'alternativa', 'no_puedo', 'pregunta'];
}
