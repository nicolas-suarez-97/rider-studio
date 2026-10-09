import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  askPromotorAssistant,
  generateFromInventory,
  removePromotorFile,
  removeSubmittedContra,
  reviewUploadedContra,
} from '@/lib/promotor/assistant';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MessageSchema = z.object({
  messages: z.array(z.object({
    role: z.string().optional(),
    content: z.string().max(8000).optional(),
    text: z.string().max(8000).optional(),
  })).max(30).default([]),
  activeAgent: z.enum(['master', 'audio_foh', 'hospitality', 'security']).optional(),
  sessionId: z.string().optional(),
  intent: z.enum(['message', 'remove-file', 'remove-submitted']).optional().default('message'),
  name: z.string().max(180).optional(),
});

function readKeep(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 5);
  } catch {
    return [];
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ showId: string }> }
) {
  try {
    const { showId } = await context.params;
    if (!UUID_PATTERN.test(showId)) return jsonError('Show inválido', 400);

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const sessionId = form.get('sessionId');
      const session = typeof sessionId === 'string' && sessionId ? sessionId : undefined;
      if (form.get('intent') === 'review') {
        const file = form.get('file');
        if (!(file instanceof File) || file.size === 0) return jsonError('Adjunta el contra-rider.', 400);
        const result = await reviewUploadedContra({
          showId,
          file,
          agent: form.get('activeAgent'),
          sessionId: session,
        });
        if (!result.ok) return jsonError(result.error, result.status);
        return NextResponse.json(result.payload);
      }
      const result = await generateFromInventory({
        showId,
        files: form.getAll('files').filter((item): item is File => item instanceof File && item.size > 0),
        keep: readKeep(form.get('keep')),
        agent: form.get('activeAgent'),
        sessionId: session,
      });
      if (!result.ok) return jsonError(result.error, result.status);
      return NextResponse.json(result.payload);
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = MessageSchema.safeParse(rawBody);
    if (!parsed.success) return jsonError('Datos de mensaje inválidos', 400);

    if (parsed.data.intent === 'remove-file' && !parsed.data.name?.trim()) {
      return jsonError('Falta el archivo', 400);
    }

    const result = parsed.data.intent === 'remove-file'
      ? await removePromotorFile(showId, parsed.data.name || '')
      : parsed.data.intent === 'remove-submitted'
        ? await removeSubmittedContra(showId)
        : await askPromotorAssistant({
          showId,
          messages: parsed.data.messages,
          agent: parsed.data.activeAgent,
          sessionId: parsed.data.sessionId,
        });

    if (!result.ok) return jsonError(result.error, result.status);
    return NextResponse.json(result.payload);
  } catch (error: unknown) {
    console.error('[API Promotor chat]', error instanceof Error ? error.message : 'error');
    return jsonError('No se pudo consultar el rider', 500);
  }
}
