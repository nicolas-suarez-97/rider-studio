import {
  NEGOTIABILITY_VALUES,
  negotiabilityLabel,
  readNegotiability,
  readNegotiabilityNote,
  type Negotiability,
} from '@/core/negociabilidad/negociabilidad';

const BADGE_CLASS: Record<Negotiability, string> = {
  negociable: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  no_negociable: 'bg-rose-50 text-rose-800 border-rose-200',
  sin_definir: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function negotiabilityBadgeClass(value: unknown): string {
  return BADGE_CLASS[readNegotiability(value)];
}

export function NegotiabilityBadge({
  negotiability,
  note,
}: {
  negotiability?: unknown;
  note?: unknown;
}) {
  const state = readNegotiability(negotiability);
  const observation = readNegotiabilityNote(note);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 min-w-0">
      <span className={`inline-flex items-center h-6 px-2 rounded-full border text-[10px] font-bold uppercase tracking-wide ${BADGE_CLASS[state]}`}>
        {negotiabilityLabel(state)}
      </span>
      {observation ? (
        <span className="text-[11px] font-medium text-slate-500 min-w-0">{observation}</span>
      ) : null}
    </span>
  );
}

export function NegotiabilityControl({
  negotiability,
  note,
  readOnly,
  onChange,
}: {
  negotiability?: unknown;
  note?: unknown;
  readOnly?: boolean;
  onChange: (next: { negotiability: Negotiability; note: string }) => void;
}) {
  const state = readNegotiability(negotiability);
  const observation = readNegotiabilityNote(note);
  if (readOnly) {
    return <NegotiabilityBadge negotiability={state} note={observation} />;
  }
  return (
    <div className="docs-negotiability-control">
      <div className="docs-negotiability-states" role="group" aria-label="Negociabilidad">
        {NEGOTIABILITY_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={state === value}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => onChange({ negotiability: value, note: observation })}
          >
            {negotiabilityLabel(value)}
          </button>
        ))}
      </div>
      <input
        aria-label="Observación de negociabilidad"
        placeholder="Observación (opcional)"
        value={observation}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => onChange({ negotiability: state, note: event.target.value })}
      />
    </div>
  );
}
