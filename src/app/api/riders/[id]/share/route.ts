import { NextRequest, NextResponse } from 'next/server';
import { getRiderById, publishRiderShare } from '@/lib/services/rider-storage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'ID de rider inválido' }, { status: 400 });
    }

    const rider = await getRiderById(id);
    if (!rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    const link = await publishRiderShare(id);
    if (!link) {
      return NextResponse.json({ error: 'No se pudo generar el enlace' }, { status: 500 });
    }

    const url = `${req.nextUrl.origin}/view/${link.token}`;
    return NextResponse.json({ token: link.token, url });
  } catch (error: unknown) {
    console.error('[API Share POST Error]', error);
    return NextResponse.json({ error: 'No se pudo generar el enlace' }, { status: 500 });
  }
}
