'use client';

import { assertRiderImage } from '@/lib/media/rider-media';

export async function uploadRiderImage(file: File, kind: 'gallery' | 'plot', riderId: string) {
  assertRiderImage(file, kind);
  const form = new FormData();
  form.set('file', file);
  form.set('kind', kind);
  form.set('riderId', riderId);

  const response = await fetch('/api/media/upload', {
    method: 'POST',
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.url !== 'string' || typeof payload.pathname !== 'string') {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'No se pudo subir la imagen');
  }
  return { url: payload.url as string, pathname: payload.pathname as string };
}

export async function deleteRiderImage(pathname: string) {
  if (!pathname) return;
  await fetch('/api/media/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pathname }),
  }).catch(() => undefined);
}
