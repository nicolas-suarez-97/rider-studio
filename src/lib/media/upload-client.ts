'use client';

import { upload } from '@vercel/blob/client';
import { assertRiderImage, riderImagePath } from '@/lib/media/rider-media';

export async function uploadRiderImage(file: File, kind: 'gallery' | 'plot', riderId: string) {
  assertRiderImage(file, kind);
  const blob = await upload(riderImagePath(riderId, kind, file.name), file, {
    access: 'public',
    handleUploadUrl: '/api/media/upload',
  });
  return { url: blob.url, pathname: blob.pathname };
}

export async function deleteRiderImage(pathname: string) {
  if (!pathname) return;
  await fetch('/api/media/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pathname }),
  }).catch(() => undefined);
}
