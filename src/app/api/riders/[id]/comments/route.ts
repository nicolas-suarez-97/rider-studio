import { NextRequest, NextResponse } from 'next/server';
import { listSectionComments } from '@/lib/repositories/comment.repository';
import { getRiderById } from '@/lib/services/rider-storage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
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

    const comments = await listSectionComments(id);
    return NextResponse.json({ comments });
  } catch (error: unknown) {
    console.error('[API Rider Comments GET]', error);
    return NextResponse.json({ error: 'No se pudieron leer los comentarios' }, { status: 500 });
  }
}
