import { artistInitials } from '@/lib/media/rider-media';

interface RiderThumbProps {
  url?: string | null;
  name: string;
  size: number;
  className?: string;
}

export function RiderThumb({ url, name, size, className = '' }: RiderThumbProps) {
  const dimension = { width: size, height: size };
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={dimension}
        className={`rounded-2xl object-cover shrink-0 bg-slate-100 ${className}`}
      />
    );
  }

  return (
    <div
      style={dimension}
      className={`rounded-2xl bg-violet-50 text-violet-700 border border-violet-100 font-black flex items-center justify-center shrink-0 ${size >= 64 ? 'text-sm' : 'text-[10px]'} ${className}`}
      aria-hidden="true"
    >
      {artistInitials(name)}
    </div>
  );
}
