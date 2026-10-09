import { randomBytes } from 'crypto';

export function createShareToken(): string {
  return randomBytes(16).toString('base64url');
}

export function isShareToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{16,80}$/.test(value);
}
