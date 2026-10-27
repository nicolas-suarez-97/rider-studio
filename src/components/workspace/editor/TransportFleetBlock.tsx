"use client";

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/components/common/Icon';
import {
  ROUTE_OPTIONS,
  RUNNER_KINDS,
  SERVICE_MODES,
  VEHICLE_CATEGORIES,
  emptyTransportCard,
  isPassengerCategory,
  normalizeTransportCards,
  type ArmoredChoice,
  type RouteCode,
  type TransportVehicleCard,
} from '@/core/constants/transporte-terrestre';
import {
  TRANSPORT_STATUS_LABEL,
} from '@/lib/promotor/transport-contra';
import { offerHasPhotos } from '@/core/constants/transporte-terrestre';
import { useTransportReviews } from '@/components/workspace/editor/transport-reviews-context';

function fieldClass() {
  return 'docs-tt-field';
}

export function TransportFleetBlock({ node, updateAttributes, deleteNode, editor, selected }: NodeViewProps) {
  const cards = normalizeTransportCards(node.attrs.cards);
  const readOnly = !editor.isEditable;
  const { reviews, onTmDecision } = useTransportReviews();

  const save = (next: TransportVehicleCard[]) => {
    updateAttributes({ cards: next });
  };

  const patch = (id: string, partial: Partial<TransportVehicleCard>) => {
    save(cards.map((card) => {
      if (card.id !== id) return card;
      const next = { ...card, ...partial };
      if (partial.vehicle_category && !isPassengerCategory(partial.vehicle_category)) {
        next.passengers_per_vehicle = null;
      }
      return next;
    }));
  };

  const toggleRoute = (card: TransportVehicleCard, code: RouteCode) => {
    const has = card.routes.includes(code);
    patch(card.id, {
      routes: has ? card.routes.filter((item) => item !== code) : [...card.routes, code],
    });
  };

  return (
    <NodeViewWrapper
      className={`docs-transport-fleet ${selected ? 'is-selected' : ''}`}
      data-type="transport-fleet"
    >
      <div className="docs-tt-card" contentEditable={false}>
        <div className="docs-tt-head">
          <span className="docs-tt-title">
            <Icon name="truck" className="w-3.5 h-3.5" />
            Transporte terrestre
          </span>
          <span className="docs-tt-count">{cards.length} {cards.length === 1 ? 'ficha' : 'fichas'}</span>
          {!readOnly ? (
            <div className="docs-tt-actions">
              <button type="button" className="docs-tt-add" onClick={() => save([...cards, emptyTransportCard('vehicle')])}>
                Añadir vehículo
              </button>
              <button type="button" className="docs-tt-add" onClick={() => save([...cards, emptyTransportCard('runner')])}>
                Añadir runner
              </button>
              <button type="button" className="docs-input-list-delete-block" onClick={() => deleteNode()}>
                Quitar bloque
              </button>
            </div>
          ) : null}
        </div>

        {cards.length === 0 ? (
          <p className="docs-tt-empty">
            Sin fichas. Añade un vehículo o un runner. No se prellenan marcas ni cantidades de ejemplo.
          </p>
        ) : (
          <div className="docs-tt-list">
            {cards.map((card, index) => {
              const review = reviews[card.id];
              const passenger = isPassengerCategory(card.vehicle_category);
              const category = VEHICLE_CATEGORIES.find((item) => item.code === card.vehicle_category);
              return (
                <article key={card.id} className="docs-tt-ficha">
                  <header className="docs-tt-ficha-head">
                    <strong>{card.kind === 'runner' ? 'Runner' : 'Vehículo'} {index + 1}</strong>
                    <span>Con conductor/piloto</span>
                    {!readOnly ? (
                      <button
                        type="button"
                        className="docs-input-list-delete"
                        aria-label="Quitar ficha"
                        onClick={() => save(cards.filter((item) => item.id !== card.id))}
                      >
                        <Icon name="minus" className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </header>

                  <div className="docs-tt-grid">
                    <label>
                      Party
                      <input
                        className={fieldClass()}
                        disabled={readOnly}
                        value={card.party_name}
                        placeholder="Nombre libre del grupo"
                        onChange={(event) => patch(card.id, { party_name: event.target.value })}
                      />
                    </label>
                    <label>
                      Categoría
                      <select
                        className={fieldClass()}
                        disabled={readOnly || card.kind === 'runner'}
                        value={card.vehicle_category}
                        onChange={(event) => patch(card.id, {
                          vehicle_category: event.target.value as TransportVehicleCard['vehicle_category'],
                        })}
                      >
                        <option value="">Elegir…</option>
                        {VEHICLE_CATEGORIES.filter((item) => card.kind === 'runner' || item.code !== 'runner_vehicle').map((item) => (
                          <option key={item.code} value={item.code}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    {card.kind === 'runner' ? (
                      <label>
                        Tipo de runner
                        <select
                          className={fieldClass()}
                          disabled={readOnly}
                          value={card.runner_kind}
                          onChange={(event) => patch(card.id, {
                            runner_kind: event.target.value as TransportVehicleCard['runner_kind'],
                          })}
                        >
                          <option value="">Elegir…</option>
                          {RUNNER_KINDS.map((item) => (
                            <option key={item.code} value={item.code}>{item.label}</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <label>
                      Cantidad
                      <input
                        className={fieldClass()}
                        type="number"
                        min={1}
                        step={1}
                        disabled={readOnly}
                        value={card.quantity}
                        onChange={(event) => patch(card.id, { quantity: Math.max(1, Number(event.target.value) || 1) })}
                      />
                    </label>
                    {passenger ? (
                      <label>
                        Pasajeros / vehículo
                        <input
                          className={fieldClass()}
                          type="number"
                          min={0}
                          step={1}
                          disabled={readOnly}
                          value={card.passengers_per_vehicle ?? ''}
                          placeholder="Plazas utilizables, sin conductor"
                          onChange={(event) => patch(card.id, {
                            passengers_per_vehicle: event.target.value === '' ? null : Math.max(0, Number(event.target.value) || 0),
                          })}
                        />
                      </label>
                    ) : null}
                    <label>
                      Referencia marca/modelo
                      <input
                        className={fieldClass()}
                        disabled={readOnly}
                        list={`tt-ref-${card.id}`}
                        value={card.vehicle_reference}
                        placeholder="Opcional. Sprinter Black ≠ Sprinter convencional"
                        onChange={(event) => patch(card.id, { vehicle_reference: event.target.value })}
                      />
                      <datalist id={`tt-ref-${card.id}`}>
                        {(category?.references || []).map((item) => (
                          <option key={item} value={item} />
                        ))}
                      </datalist>
                    </label>
                    <label>
                      Modalidad
                      <select
                        className={fieldClass()}
                        disabled={readOnly}
                        value={card.service_mode}
                        onChange={(event) => patch(card.id, {
                          service_mode: event.target.value as TransportVehicleCard['service_mode'],
                        })}
                      >
                        <option value="">Elegir…</option>
                        {SERVICE_MODES.map((item) => (
                          <option key={item.code} value={item.code}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Negociabilidad
                      <select
                        className={fieldClass()}
                        disabled={readOnly}
                        value={card.negotiability}
                        onChange={(event) => patch(card.id, {
                          negotiability: event.target.value as TransportVehicleCard['negotiability'],
                        })}
                      >
                        <option value="negociable">Negociable</option>
                        <option value="no_negociable">No negociable</option>
                      </select>
                    </label>
                    <label>
                      Color
                      <input
                        className={fieldClass()}
                        disabled={readOnly}
                        value={card.color}
                        onChange={(event) => patch(card.id, { color: event.target.value })}
                      />
                    </label>
                    <label>
                      Año mínimo
                      <input
                        className={fieldClass()}
                        disabled={readOnly}
                        inputMode="numeric"
                        value={card.minimum_year}
                        onChange={(event) => patch(card.id, { minimum_year: event.target.value })}
                      />
                    </label>
                    <label>
                      Blindaje
                      <select
                        className={fieldClass()}
                        disabled={readOnly}
                        value={card.armored_required}
                        onChange={(event) => patch(card.id, {
                          armored_required: event.target.value as ArmoredChoice,
                        })}
                      >
                        <option value="unspecified">Sin especificar</option>
                        <option value="yes">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </label>
                  </div>

                  <fieldset className="docs-tt-routes">
                    <legend>Rutas</legend>
                    {ROUTE_OPTIONS.map((route) => (
                      <label key={route.code}>
                        <input
                          type="checkbox"
                          disabled={readOnly}
                          checked={card.routes.includes(route.code)}
                          onChange={() => toggleRoute(card, route.code)}
                        />
                        {route.label}
                      </label>
                    ))}
                    {card.routes.includes('custom_route') ? (
                      <input
                        className={fieldClass()}
                        disabled={readOnly}
                        value={card.custom_route_text}
                        placeholder="Origen / destino (pueden quedar por confirmar)"
                        onChange={(event) => patch(card.id, { custom_route_text: event.target.value })}
                      />
                    ) : null}
                    <p className="docs-tt-hint">Horarios, aeropuertos, hoteles y ubicaciones precisas pueden quedar por confirmar.</p>
                  </fieldset>

                  {card.service_mode === 'twelve_hours' ? (
                    <p className="docs-tt-hint">Cualquier extensión sobre 12 horas se consulta previamente con el TM. La plataforma no asigna el costo.</p>
                  ) : null}
                  {card.service_mode === 'full_on_request' ? (
                    <p className="docs-tt-hint">Disponibilidad completa a solicitud: no equivale a una jornada de 24 horas.</p>
                  ) : null}

                  <label className="docs-tt-notes">
                    Observaciones
                    <textarea
                      className={fieldClass()}
                      disabled={readOnly}
                      rows={2}
                      value={card.notes}
                      onChange={(event) => patch(card.id, { notes: event.target.value })}
                    />
                  </label>

                  {review && (review.offer.makeModel || review.offer.photos.length > 0 || review.status !== 'sin_respuesta') ? (
                    <div className="docs-tt-review">
                      <p className="docs-tt-review-kicker">Propuesta del promotor · {TRANSPORT_STATUS_LABEL[review.status]}</p>
                      <p>
                        {review.offer.quantityOffered ?? '—'} × {review.offer.makeModel || 'sin modelo'}
                        {review.offer.year ? ` (${review.offer.year})` : ''}
                      </p>
                      {review.offer.deviation ? <p>Desvío: {review.offer.deviation}</p> : null}
                      {!offerHasPhotos(review.offer) ? <p className="docs-tt-warn">Faltan fotografías del vehículo propuesto.</p> : (
                        <div className="docs-tt-photos">
                          {review.offer.photos.map((photo) => (
                            <img key={photo.name} src={photo.dataUrl} alt={photo.name} />
                          ))}
                        </div>
                      )}
                      {review.history.length > 0 ? (
                        <ul className="docs-tt-history">
                          {review.history.slice(-6).map((entry, historyIndex) => (
                            <li key={`${entry.at}-${historyIndex}`}>{entry.action} · {entry.note || ''}</li>
                          ))}
                        </ul>
                      ) : null}
                      {!readOnly && onTmDecision ? (
                        <div className="docs-tt-tm">
                          <button type="button" disabled={!offerHasPhotos(review.offer)} onClick={() => onTmDecision(card.id, 'aprobada')}>
                            Aprobar
                          </button>
                          <button type="button" onClick={() => onTmDecision(card.id, 'rechazada')}>Rechazar</button>
                          <button type="button" onClick={() => onTmDecision(card.id, 'requiere_ajustes')}>Requiere ajustes</button>
                          {review.tmDecision === 'aprobada' ? (
                            <button type="button" onClick={() => onTmDecision(card.id, 'reabrir')}>Reabrir</button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
