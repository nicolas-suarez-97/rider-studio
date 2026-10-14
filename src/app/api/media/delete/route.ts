import { NextResponse } from 'next/server';
import { deleteStoredImage } from '@/lib/media/image-store';
import { imageKindFromPath } from '@/lib/media/rider-media';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const pathname = body && typeof body === 'object' && typeof body.pathname === 'string'
    ? body.pathname
    : '';

  if (!imageKindFromPath(pathname)) {
    return NextResponse.json({ error: 'Ruta no permitida' }, { status: 400 });
  }

  await deleteStoredImage(pathname);
  return NextResponse.json({ ok: true });
}
