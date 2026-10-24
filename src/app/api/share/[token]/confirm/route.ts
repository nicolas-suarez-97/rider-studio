import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Rider } from '@/core/models/Rider';
import { buildContraLines, lineHasPedido } from '@/lib/promotor/contra-rider';
import { readGuestAnswers, readShareConfirms, validateGuestName, validateShareConfirm } from '@/lib/share/confirm';
import { absoluteExclusionConflict, readAbsoluteExclusions } from '@/lib/share/exclusions';
import { isShareToken } from '@/lib/share/token';
import { getRiderByShareToken, saveShareConfirm } from '@/lib/services/rider-storage';

const ConfirmSchema = z.object({
  guestName: z.string(),
  lineId: z.string().trim().min(1).max(160),
  response: z.string(),
  text: z.string().optional().default(''),
});

async function loadSharedRider(token: string) {
  if (!isShareToken(token)) return null;
  return getRiderByShareToken(token);
}

function confirmLines(row: NonNullable<Awaited<ReturnType<typeof getRiderByShareToken>>>, guestName: string) {
  const rider = Rider.fromDatabase(row);
  const answers = readGuestAnswers(readShareConfirms(row.metadata), guestName);
  return buildContraLines(rider, answers).filter((line) => lineHasPedido(line.pedido));
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const row = await loadSharedRider(token);
    if (!row) {
      return NextResponse.json({ error: 'Enlace no disponible' }, { status: 404 });
    }

    const guestName = req.nextUrl.searchParams.get('guest')?.trim() || '';
    const nameError = guestName ? validateGuestName(guestName) : null;
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    return NextResponse.json({
      guestName: guestName || null,
      lines: confirmLines(row, guestName),
    });
  } catch (error: unknown) {
    console.error('[API Share Confirm GET]', error);
    return NextResponse.json({ error: 'No se pudieron leer los pedidos' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const row = await loadSharedRider(token);
    if (!row) {
      return NextResponse.json({ error: 'Enlace no disponible' }, { status: 404 });
    }

    const parsed = ConfirmSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'No se pudo guardar la respuesta' }, { status: 400 });
    }

    const nameError = validateGuestName(parsed.data.guestName);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    const lines = confirmLines(row, parsed.data.guestName);
    const allowedIds = new Set(lines.map((line) => line.id));
    const checked = validateShareConfirm({
      lineId: parsed.data.lineId,
      response: parsed.data.response,
      text: parsed.data.text,
      allowedIds,
    });
    if (checked.error || !checked.answer) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }

    const line = lines.find((item) => item.id === parsed.data.lineId);
    const exclusionError = absoluteExclusionConflict({
      exclusions: readAbsoluteExclusions(row.metadata),
      pedido: line?.pedido ?? '',
      response: checked.answer.response,
      offer: checked.answer.offer,
    });
    if (exclusionError) {
      return NextResponse.json({ error: exclusionError }, { status: 400 });
    }

    const saved = await saveShareConfirm(token, parsed.data.guestName.trim(), parsed.data.lineId, checked.answer);
    if (!saved) {
      return NextResponse.json({ error: 'No se pudo guardar la respuesta' }, { status: 500 });
    }

    const updatedRow = await getRiderByShareToken(token);
    if (!updatedRow) {
      return NextResponse.json({ error: 'Enlace no disponible' }, { status: 404 });
    }

    return NextResponse.json({
      guestName: parsed.data.guestName.trim(),
      lines: confirmLines(updatedRow, parsed.data.guestName),
    });
  } catch (error: unknown) {
    console.error('[API Share Confirm POST]', error);
    return NextResponse.json({ error: 'No se pudo guardar la respuesta' }, { status: 500 });
  }
}
