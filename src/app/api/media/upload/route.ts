import { NextResponse } from 'next/server';
import { saveRiderImage } from '@/lib/media/image-store';

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const kind = form?.get('kind');
  const riderId = form?.get('riderId');

  if (!(file instanceof File) || (kind !== 'gallery' && kind !== 'plot') || typeof riderId !== 'string') {
    return NextResponse.json({ error: 'Faltan datos de la imagen' }, { status: 400 });
  }

  try {
    const stored = await saveRiderImage(file, kind, riderId);
    return NextResponse.json(stored);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo subir la imagen';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
