import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Rider } from '@/core/models/Rider';
import { buildContraLines, lineHasPedido } from '@/lib/promotor/contra-rider';
import {
  listArtistShareItems,
  summarizeArtistShareItems,
  type ArtistShareActionType,
} from '@/lib/share/artist-confirms';
import { readShareConfirms } from '@/lib/share/confirm';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getRiderById, saveArtistShareAction } from '@/lib/services/rider-storage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ActionSchema = z.object({
  guestKey: z.string().trim().min(1).max(80),
  lineId: z.string().trim().min(1).max(160),
  action: z.enum(['accept_alternative', 'reply', 'propose', 'reopen']),
  text: z.string().optional().default(''),
});

async function resolveArtistAuthor(artistName: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (user?.id) return user.id;
  if (user?.email) return user.email;
  return artistName.trim() || 'artista';
}

function viewFor(row: NonNullable<Awaited<ReturnType<typeof getRiderById>>>) {
  const rider = Rider.fromDatabase(row);
  const pedidoByLineId: Record<string, string> = {};
  for (const line of buildContraLines(rider, {})) {
    pedidoByLineId[line.id] = lineHasPedido(line.pedido) ? line.pedido : line.sectionTitle;
  }
  const items = listArtistShareItems(readShareConfirms(row.metadata), pedidoByLineId);
  return { title: rider.title, items, summary: summarizeArtistShareItems(items) };
}

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

    return NextResponse.json(viewFor(rider));
  } catch (error: unknown) {
    console.error('[API Artist Share Confirms GET]', error);
    return NextResponse.json({ error: 'No se pudieron leer las respuestas' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'ID de rider inválido' }, { status: 400 });
    }

    const parsed = ActionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'No se pudo guardar la acción' }, { status: 400 });
    }

    const riderBefore = await getRiderById(id);
    if (!riderBefore) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    const saved = await saveArtistShareAction(
      id,
      parsed.data.guestKey,
      parsed.data.lineId,
      parsed.data.action as ArtistShareActionType,
      parsed.data.text,
      { author: await resolveArtistAuthor(riderBefore.artist_name || '') }
    );
    if (!saved) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }
    if (saved.error) {
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }

    const rider = await getRiderById(id);
    if (!rider) {
      return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });
    }

    return NextResponse.json(viewFor(rider));
  } catch (error: unknown) {
    console.error('[API Artist Share Confirms POST]', error);
    return NextResponse.json({ error: 'No se pudo guardar la acción' }, { status: 500 });
  }
}
