import {
  formatShowReadyLine,
  type ArtistShareSummary,
  type ShowReadyAudience,
} from '@/lib/share/artist-confirms';

interface ShowReadyStatusProps {
  summary: ArtistShareSummary;
  audience?: ShowReadyAudience;
  variant?: 'badge' | 'block';
}

export function ShowReadyStatus({
  summary,
  audience = 'artist',
  variant = 'block',
}: ShowReadyStatusProps) {
  if (!summary.showReady) return null;

  const line = formatShowReadyLine(summary, audience);

  return (
    <div role="status" aria-live="polite" className={variant === 'block' ? 'space-y-1' : ''}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full inline-block">
        LISTO PARA EL SHOW
      </p>
      {variant === 'block' ? (
        <p className="text-xs font-semibold text-slate-600">{line}</p>
      ) : (
        <span className="sr-only">{line}</span>
      )}
    </div>
  );
}
