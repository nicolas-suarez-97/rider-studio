import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { imageKindFromPath } from '@/lib/media/rider-media';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const pathname = body && typeof body === 'object' && typeof body.pathname === 'string'
    ? body.pathname
    : '';

  if (!imageKindFromPath(pathname)) {
    return NextResponse.json({ error: 'Ruta no permitida' }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await del(pathname);
  } catch (error) {
    console.warn('[media delete]', error);
  }

  return NextResponse.json({ ok: true });
}
