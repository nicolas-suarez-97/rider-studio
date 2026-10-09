import { NextRequest, NextResponse } from 'next/server';
import { parseShareToken } from '@/lib/promotor/share-link';
import { openShowFromShareToken } from '@/lib/promotor/load-show';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const link = typeof body.link === 'string' ? body.link : '';
    const token = parseShareToken(link);
    if (!token) {
      return NextResponse.json(
        { error: 'Pega el enlace compartido del rider, el que termina en /view/…' },
        { status: 400 }
      );
    }

    const opened = await openShowFromShareToken(token);
    if (!opened) {
      return NextResponse.json(
        { error: 'No encontré un rider compartido con ese enlace.' },
        { status: 404 }
      );
    }

    return NextResponse.json(opened);
  } catch (error: unknown) {
    console.error('[API Promotor abrir]', error);
    return NextResponse.json({ error: 'No se pudo abrir el show' }, { status: 500 });
  }
}
