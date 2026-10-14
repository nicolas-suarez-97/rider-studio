import { NextResponse } from 'next/server';
import { contentTypeForPath, readLocalRiderImage } from '@/lib/media/image-store';

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const relative = (await context.params).path.map((part) => decodeURIComponent(part)).join('/');

  try {
    const data = await readLocalRiderImage(relative);
    return new NextResponse(Uint8Array.from(data), {
      headers: {
        'Content-Type': contentTypeForPath(relative),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 });
  }
}
