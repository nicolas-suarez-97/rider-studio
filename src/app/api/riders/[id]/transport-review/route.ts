import { NextRequest, NextResponse } from 'next/server';
import { applyTmDecision, reopenApproved } from '@/lib/promotor/transport-contra';
import { readStoredContra, transportStateFromAnswer } from '@/lib/promotor/contra-rider';
import { getRiderById, saveContraRider } from '@/lib/services/rider-storage';
import { offerHasPhotos } from '@/core/constants/transporte-terrestre';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'Rider inválido' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const cardId = typeof body.cardId === 'string' ? body.cardId : '';
    const decision = body.decision;
    if (!cardId || !['aprobada', 'rechazada', 'requiere_ajustes', 'reabrir'].includes(decision)) {
      return NextResponse.json({ error: 'Decisión inválida' }, { status: 400 });
    }

    const row = await getRiderById(id);
    if (!row) return NextResponse.json({ error: 'Rider no encontrado' }, { status: 404 });

    const stored = readStoredContra(row.metadata);
    const entry = Object.entries(stored.answers).find(([answerId]) => answerId.endsWith(`:${cardId}`));
    if (!entry) return NextResponse.json({ error: 'Ficha sin propuesta' }, { status: 404 });
    const [answerId, answer] = entry;
    const current = transportStateFromAnswer(answer);
    if (decision === 'aprobada' && !offerHasPhotos(current.offer)) {
      return NextResponse.json({ error: 'Sin fotos no se puede aprobar' }, { status: 400 });
    }
    const nextState = decision === 'reabrir'
      ? reopenApproved(current)
      : applyTmDecision(current, decision);

    const answers = {
      ...stored.answers,
      [answerId]: {
        ...answer,
        transportOffer: nextState.offer,
        transportStatus: nextState.status,
        tmDecision: nextState.tmDecision,
        transportHistory: nextState.history,
      },
    };

    const saved = await saveContraRider(id, JSON.parse(JSON.stringify({
      status: stored.status,
      version: stored.version,
      sentAt: stored.sentAt,
      answers,
    })), { requireShare: false });
    if (!saved) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });

    return NextResponse.json({
      ok: true,
      state: nextState,
    });
  } catch (error) {
    console.error('[API transport-review]', error);
    return NextResponse.json({ error: 'No se pudo registrar la decisión' }, { status: 500 });
  }
}
