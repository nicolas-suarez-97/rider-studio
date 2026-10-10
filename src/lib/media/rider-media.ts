import { RiderMediaItem } from '@/core/types/rider.types';

export const MAX_GALLERY_IMAGES = 8;
export const GALLERY_MAX_BYTES = 2 * 1024 * 1024;
export const PLOT_MAX_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function artistInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'RS';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

export function parseRiderMedia(value: unknown): RiderMediaItem[] {
  if (!Array.isArray(value)) return [];
  const items: RiderMediaItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.url !== 'string' || typeof item.pathname !== 'string') continue;
    if (!item.url || !item.pathname) continue;
    items.push({
      id: typeof item.id === 'string' && item.id ? item.id : item.pathname,
      url: item.url,
      pathname: item.pathname,
      cover: item.cover === true,
    });
  }
  const limited = items.slice(0, MAX_GALLERY_IMAGES);
  if (limited.length > 0 && !limited.some((item) => item.cover)) {
    limited[0] = { ...limited[0], cover: true };
  }
  return limited;
}

export function coverMedia(media: RiderMediaItem[]): RiderMediaItem | null {
  return media.find((item) => item.cover) ?? media[0] ?? null;
}

export function isPersistedRiderId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function riderImagePath(riderId: string, kind: 'gallery' | 'plot', filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80) || 'foto';
  return `riders/${riderId}/${kind}/${safe}`;
}

export function imageKindFromPath(pathname: string): 'gallery' | 'plot' | null {
  const match = pathname.match(/^riders\/[0-9a-f-]{36}\/(gallery|plot)\//i);
  if (!match) return null;
  return match[1].toLowerCase() === 'plot' ? 'plot' : 'gallery';
}

export function assertRiderImage(file: File, kind: 'gallery' | 'plot') {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error('La imagen tiene que ser JPG, PNG o WebP.');
  }
  const max = kind === 'plot' ? PLOT_MAX_BYTES : GALLERY_MAX_BYTES;
  if (file.size > max) {
    throw new Error(kind === 'plot'
      ? 'La foto del plano puede pesar hasta 5 MB.'
      : 'Cada foto del rider puede pesar hasta 2 MB.');
  }
}

export function mediaPathnames(media: unknown, stagePlot: unknown): string[] {
  const paths = parseRiderMedia(media).map((item) => item.pathname);
  if (stagePlot && typeof stagePlot === 'object' && !Array.isArray(stagePlot)) {
    const path = (stagePlot as { referenceImagePath?: unknown }).referenceImagePath;
    if (typeof path === 'string' && path) paths.push(path);
  }
  return [...new Set(paths)];
}
