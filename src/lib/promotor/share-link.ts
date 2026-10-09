import { isShareToken } from '@/lib/share/token';

export function parseShareToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (isShareToken(trimmed)) return trimmed;

  const match = trimmed.match(/\/view\/([A-Za-z0-9_-]{16,80})/);
  if (match && isShareToken(match[1])) return match[1];
  return null;
}
