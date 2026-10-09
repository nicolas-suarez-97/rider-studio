import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Rider } from '@/core/models/Rider';
import { createSectionComment, listSectionComments } from '@/lib/repositories/comment.repository';
import { collectRiderSectionIds } from '@/lib/share/comments';
import { isShareToken } from '@/lib/share/token';
import { getRiderByShareToken } from '@/lib/services/rider-storage';

const CreateCommentSchema = z.object({
  sectionId: z.string().trim().min(1).max(120),
  authorName: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(1000),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!isShareToken(token)) {
      return NextResponse.json({ error: 'Enlace no disponible' }, { status: 404 });
    }

    const row = await getRiderByShareToken(token);
    if (!row?.id) {
      return NextResponse.json({ error: 'Enlace no disponible' }, { status: 404 });
    }

    const comments = await listSectionComments(row.id);
    return NextResponse.json({ comments });
  } catch (error: unknown) {
    console.error('[API Share Comments GET]', error);
    return NextResponse.json({ error: 'No se pudieron leer los comentarios' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!isShareToken(token)) {
      return NextResponse.json({ error: 'Enlace no disponible' }, { status: 404 });
    }

    const row = await getRiderByShareToken(token);
    if (!row?.id) {
      return NextResponse.json({ error: 'Enlace no disponible' }, { status: 404 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = CreateCommentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Escribe un nombre y una nota' }, { status: 400 });
    }

    const sectionIds = collectRiderSectionIds(Rider.fromDatabase(row));
    if (!sectionIds.has(parsed.data.sectionId)) {
      return NextResponse.json({ error: 'Esa sección no está en este rider' }, { status: 400 });
    }

    const comment = await createSectionComment({
      riderId: row.id,
      sectionId: parsed.data.sectionId,
      authorName: parsed.data.authorName,
      body: parsed.data.body,
    });

    return NextResponse.json({ comment });
  } catch (error: unknown) {
    console.error('[API Share Comments POST]', error);
    return NextResponse.json({ error: 'No se pudo guardar el comentario' }, { status: 500 });
  }
}
