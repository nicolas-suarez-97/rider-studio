import { NextRequest, NextResponse } from 'next/server';
import { extractRiderFile, MAX_RIDER_FILE_BYTES } from '@/lib/importer/extract-rider-file';
import { parseDocxRiderDocument, parsePdfRiderDocument, type ParsedRiderDocument } from '@/lib/importer/parse-rider-document';
import { callAiCompletion } from '@/lib/ai/ai-provider';
import { RiderType, SectionItem, RiderContentDoc } from '@/core/types/rider.types';
import { DocumentSuggestion } from '@/core/types/suggestion.types';
import { buildCoverContentDoc, DOCUMENT_COVER_ID } from '@/core/editor/content-doc';
import { cloneInputListColumns, DEFAULT_INPUT_LIST_COLUMNS, type InputListRow } from '@/core/constants/input-list';
import { ChannelInput } from '@/core/models/ChannelInput';
import { DEFAULT_STAGE_PLOT } from '@/core/constants/stage-plot';

interface AiRiderAuditResponse {
  artistName?: string;
  riderTitle?: string;
  riderType?: 'tecnico' | 'hospitality' | 'seguridad';
  season?: string;
  version?: string;
  auditScore?: number;
  auditSummary?: string;
  welcomeMessage?: string;
  suggestions?: Array<{
    sectionId?: string;
    kind?: 'insert' | 'replace' | 'add_channel' | 'add_section';
    baseText?: string;
    proposedText: string;
    rationale: string;
    newSectionTitle?: string;
  }>;
  sections?: Array<{
    id?: string;
    title: string;
    content: string;
    isInputList?: boolean;
    requirements?: Array<{ label: string; text: string }>;
  }>;
  channels?: Array<{
    channelNumber: number;
    name: string;
    mic?: string;
    stand?: string;
    phantom?: boolean;
    notes?: string;
  }>;
}

const RIDER_AUDIT_SYSTEM_PROMPT = `Eres el Master Production Copilot de Rider Studio, la plataforma líder de ingeniería y producción técnica para espectáculos en vivo y giras.
El sistema ya ha importado de forma íntegra y literal (1:1 con imágenes, tablas, contactos y formato original) el documento del usuario en el editor.
Tu única tarea es auditar técnicamente el contenido del rider y generar un diagnóstico ejecutivo junto con 3 a 5 sugerencias puntuales de mejora listas para insertar.

DEBES responder ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
  "artistName": "Nombre del Artista o Banda detectado",
  "riderTitle": "Título del documento detectado",
  "auditScore": 88,
  "auditSummary": "Diagnóstico técnico de 2-3 frases en español evaluando el nivel de detalle del rider, sus fortalezas (ej. PA, consolas, input list, planos, hospitality) y qué aspectos conviene reforzar.",
  "welcomeMessage": "Mensaje en español dirigiéndote al usuario con tono profesional y cercano. Confírmale que su documento fue importado íntegramente con todas sus secciones, tablas e imágenes en modo de edición, menciona los elementos clave detectados y explícale las mejoras puntuales que propones.",
  "suggestions": [
    {
      "sectionId": "id-exacto-de-la-seccion-de-la-lista-provista",
      "kind": "insert",
      "baseText": "",
      "proposedText": "Texto técnico o cláusula de producción de alta precisión para añadir a esa sección (en el mismo idioma del documento)",
      "rationale": "Explicación breve en español de por qué conviene agregar esta especificación."
    }
  ]
}

REGLAS:
1. Usa en "sectionId" únicamente IDs reales de la lista de secciones detectadas que te enviaremos en el prompt.
2. En "proposedText", redacta la mejora en el mismo idioma del rider original (si el rider está en inglés, redacta "proposedText" en inglés técnico profesional; mantén "rationale", "auditSummary" y "welcomeMessage" siempre en español).
3. Responde estrictamente con JSON puro, sin bloques markdown.`;

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1).toLowerCase() : '';
}

function buildContentDocForFallbackSection(
  section: {
    id?: string;
    title: string;
    content: string;
    isInputList?: boolean;
    requirements?: Array<{ label: string; text: string }>;
  },
  channels: Array<{
    channelNumber: number;
    name: string;
    mic?: string;
    stand?: string;
    phantom?: boolean;
    notes?: string;
  }>
): RiderContentDoc {
  const nodes: any[] = [];
  const lines = (section.content || '').split('\n').map((l) => l.trim()).filter(Boolean);
  let activeBullets: any[] = [];

  const flushBullets = () => {
    if (activeBullets.length > 0) {
      nodes.push({ type: 'bulletList', content: activeBullets });
      activeBullets = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      activeBullets.push({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: line.replace(/^[•\-*]\s*/, '') }] }],
      });
    } else {
      flushBullets();
      nodes.push({
        type: 'paragraph',
        content: [{ type: 'text', text: line }],
      });
    }
  }
  flushBullets();

  if (Array.isArray(section.requirements)) {
    for (const req of section.requirements) {
      if (req.text) {
        nodes.push({
          type: 'requirement',
          attrs: { label: req.label || 'Requisito Técnico' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: req.text }] }],
        });
      }
    }
  }

  if (section.isInputList && channels.length > 0) {
    const rows: InputListRow[] = channels.map((ch, idx) => ({
      id: `row-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      ch: String(ch.channelNumber || idx + 1).padStart(2, '0'),
      cells: {
        instrument: ch.name || 'Canal',
        position: 'Center',
        mic: ch.mic || '',
        stand: ch.stand || 'Standard',
        phantom: Boolean(ch.phantom),
      },
      instrument: ch.name,
      mic: ch.mic,
      stand: ch.stand,
      phantom: Boolean(ch.phantom),
    }));

    nodes.push({
      type: 'inputList',
      attrs: {
        rows,
        columns: cloneInputListColumns(DEFAULT_INPUT_LIST_COLUMNS),
      },
    });
  }

  if (nodes.length === 0) {
    nodes.push({ type: 'paragraph' });
  }

  return { type: 'doc', content: nodes };
}

export async function POST(req: NextRequest) {
  try {
    let rawText = '';
    let fileName = 'rider_importado';
    let parsedDoc: ParsedRiderDocument | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return NextResponse.json({ ok: false, error: 'No se envió ningún archivo válido.' }, { status: 400 });
      }
      if (file.size <= 0) {
        return NextResponse.json({ ok: false, error: 'El archivo seleccionado está vacío.' }, { status: 400 });
      }
      if (file.size > MAX_RIDER_FILE_BYTES) {
        return NextResponse.json({ ok: false, error: 'El archivo supera el límite de 15 MB.' }, { status: 400 });
      }

      fileName = file.name;
      const ext = extensionOf(file.name);
      const mime = file.type.toLowerCase();
      const bytes = new Uint8Array(await file.arrayBuffer());

      if (ext === 'pdf' || mime === 'application/pdf') {
        parsedDoc = await parsePdfRiderDocument(bytes, file.name);
        rawText = parsedDoc.rawText || parsedDoc.sections.map((s) => `${s.title}\n${s.content}`).join('\n\n');
      } else if (ext === 'docx' || mime.includes('wordprocessingml')) {
        parsedDoc = await parseDocxRiderDocument(bytes, file.name);
        rawText = parsedDoc.rawText || parsedDoc.sections.map((s) => `${s.title}\n${s.content}`).join('\n\n');
      } else {
        const extraction = await extractRiderFile(file);
        if (!extraction.ok) {
          return NextResponse.json({ ok: false, error: extraction.error }, { status: 400 });
        }
        rawText = extraction.extracted.text;
      }
    } else {
      const json = await req.json().catch(() => ({}));
      rawText = typeof json.text === 'string' ? json.text : '';
      fileName = typeof json.fileName === 'string' ? json.fileName : 'rider_importado';
    }

    if (!rawText.trim() && (!parsedDoc || parsedDoc.sections.length === 0)) {
      return NextResponse.json(
        { ok: false, error: 'El documento no contiene texto ni elementos legibles.' },
        { status: 400 }
      );
    }

    // Si tenemos parsedDoc (PDF o DOCX parseado con fidelidad 1:1), pedimos a la IA únicamente la auditoría y sugerencias
    const sectionOutlineSummary = parsedDoc
      ? parsedDoc.sections
          .filter((s) => s.id !== DOCUMENT_COVER_ID)
          .map((s) => `- ID: "${s.id}" | Título: "${s.title}"`)
          .join('\n')
      : '';

    const aiResult = await callAiCompletion({
      messages: [
        { role: 'system', content: RIDER_AUDIT_SYSTEM_PROMPT },
        {
          role: 'user',
          content:
            `Archivo importado: "${fileName}"\n` +
            (sectionOutlineSummary ? `\n=== SECCIONES DETECTADAS EN EL EDITOR ===\n${sectionOutlineSummary}\n` : '') +
            `\n=== MUESTRA DEL CONTENIDO DEL RIDER ===\n${rawText.slice(0, 22000)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1800,
      jsonMode: true,
    });

    let aiAudit: AiRiderAuditResponse = {};
    if (aiResult?.content) {
      try {
        const cleanContent = aiResult.content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        aiAudit = JSON.parse(cleanContent);
      } catch (e) {
        console.warn('[Rider Import] Error parseando JSON de auditoría IA, usando diagnóstico por defecto:', e);
      }
    }

    const cleanFileTitle = fileName.replace(/\.(?:pdf|docx|doc|txt|md)$/i, '').trim() || fileName;

    if (parsedDoc && parsedDoc.sections.length > 0) {
      const artistName = cleanFileTitle;
      const riderTitle = cleanFileTitle;
      const riderType: RiderType = parsedDoc.riderType || 'tecnico';
      const season = parsedDoc.season || aiAudit.season || String(new Date().getFullYear());
      const version = parsedDoc.version || aiAudit.version || 'v1.0';

      const validSectionIds = new Set(parsedDoc.sections.map((s) => s.id));
      const defaultSectionId =
        parsedDoc.sections.find((s) => s.id !== DOCUMENT_COVER_ID)?.id || parsedDoc.sections[0].id;

      const formattedSuggestions: DocumentSuggestion[] = (aiAudit.suggestions || [])
        .filter((s) => s && s.proposedText)
        .map((s, idx) => ({
          id: `sug-import-${Date.now()}-${idx}`,
          sectionId: s.sectionId && validSectionIds.has(s.sectionId) ? s.sectionId : defaultSectionId,
          kind: s.kind || 'insert',
          baseText: s.baseText || '',
          proposedText: s.proposedText,
          rationale: s.rationale || 'Sugerencia técnica de producción.',
          status: 'pending',
          source: 'agent',
          newSectionTitle: s.newSectionTitle,
        }));

      const totalContentSections = parsedDoc.sections.filter((s) => s.id !== DOCUMENT_COVER_ID).length;
      const totalImages =
        parsedDoc.media.length +
        parsedDoc.sections.reduce(
          (acc, s) => acc + (s.contentDoc?.content || []).filter((n) => n.type === 'image').length,
          0
        );

      const welcomeMessage =
        aiAudit.welcomeMessage ||
        `👋 ¡Hola! He importado íntegramente tu documento **${cleanFileTitle}** manteniendo su estructura, contenido, tablas, colores e imágenes originales en modo editable.\n\n` +
          `📄 **Resumen de importación 1:1:**\n` +
          `• **${totalContentSections} secciones** organizadas exactamente como en el documento original.\n` +
          (parsedDoc.channels.length > 0
            ? `• **${parsedDoc.channels.length} canales** extraídos en la tabla de Input List.\n`
            : '') +
          (totalImages > 0 ? `• **${totalImages} imágenes y planos técnicos** integrados en sus páginas correspondientes.\n` : '') +
          `\n📌 **Diagnóstico Técnico (Puntaje: ${aiAudit.auditScore || 90}/100):**\n` +
          `${aiAudit.auditSummary || 'El rider presenta un nivel técnico profesional completo.'}\n\n` +
          (formattedSuggestions.length > 0
            ? `He preparado **${formattedSuggestions.length} sugerencias puntuales** en caso de que desees reforzar cláusulas específicas.`
            : 'Puedes editar cualquier texto, tabla, aviso o imagen directamente sobre el documento.');

      const completedSectionIds = parsedDoc.sections.map((s) => s.id);
      const stagePlot = {
        ...JSON.parse(JSON.stringify(DEFAULT_STAGE_PLOT)),
        ...(parsedDoc.stagePlotImageUrl
          ? {
              referenceImageUrl: parsedDoc.stagePlotImageUrl,
              referenceImagePath: parsedDoc.stagePlotImagePath || '',
            }
          : {}),
      };

      return NextResponse.json({
        ok: true,
        riderData: {
          title: riderTitle,
          artistName,
          type: riderType,
          season,
          version,
          sections: parsedDoc.sections,
          channels: parsedDoc.channels,
          completedSectionIds,
          media: parsedDoc.media,
          stagePlot,
          modules: {
            tecnico: {
              sections: parsedDoc.sections,
              channels: parsedDoc.channels,
              completedSectionIds,
              stagePlot,
            },
            ...(parsedDoc.modules.hospitality.length > 0
              ? {
                  hospitality: {
                    sections: parsedDoc.modules.hospitality,
                    channels: [],
                    completedSectionIds: parsedDoc.modules.hospitality.map((s) => s.id),
                  },
                }
              : {}),
            ...(parsedDoc.modules.seguridad.length > 0
              ? {
                  seguridad: {
                    sections: parsedDoc.modules.seguridad,
                    channels: [],
                    completedSectionIds: parsedDoc.modules.seguridad.map((s) => s.id),
                  },
                }
              : {}),
          },
        },
        welcomeMessage,
        auditScore: aiAudit.auditScore || 90,
        suggestions: formattedSuggestions,
      });
    }

    // Fallback para archivos de texto plano (.txt / .md)
    const artistName = cleanFileTitle;
    const riderTitle = cleanFileTitle;
    const riderType: RiderType = aiAudit.riderType || 'tecnico';
    const season = aiAudit.season || String(new Date().getFullYear());
    const version = aiAudit.version || 'v1.0';

    const rawSections =
      Array.isArray(aiAudit.sections) && aiAudit.sections.length > 0
        ? aiAudit.sections
        : [
            {
              id: 'tech-requerimientos',
              title: cleanFileTitle,
              content: rawText,
              isInputList: false,
            },
          ];

    const channels = Array.isArray(aiAudit.channels) ? aiAudit.channels : [];
    const finalSections: SectionItem[] = [];

    let sectionIndex = 1;
    for (const sec of rawSections) {
      const secId = sec.id || `imported-sec-${sectionIndex}`;
      const title = sec.title || `Sección ${sectionIndex}`;
      const contentDoc = buildContentDocForFallbackSection(sec, channels);

      finalSections.push({
        id: secId,
        num: String(sectionIndex).padStart(2, '0'),
        title,
        subtitle: sec.isInputList ? 'Matriz de canales y microfonía' : 'Especificaciones técnicas',
        tag: sec.isInputList ? 'Input List' : 'Técnico',
        tagColor: sec.isInputList ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-700',
        iconName: sec.isInputList ? 'list' : 'speaker',
        content: sec.content || '',
        contentDoc,
        pageBreakBefore: sectionIndex > 1,
      });

      sectionIndex += 1;
    }

    const channelInputs = channels.map((c, idx) =>
      ChannelInput.create(
        String(c.channelNumber || idx + 1).padStart(2, '0'),
        c.name || `Canal ${idx + 1}`,
        c.mic || 'Shure SM58',
        c.stand || 'Standard',
        undefined,
        Boolean(c.phantom),
        c.notes || ''
      )
    );

    const formattedSuggestions: DocumentSuggestion[] = (aiAudit.suggestions || []).map((s, idx) => ({
      id: `sug-import-${Date.now()}-${idx}`,
      sectionId: s.sectionId || finalSections[1]?.id || 'tech-requerimientos',
      kind: s.kind || 'insert',
      baseText: s.baseText || '',
      proposedText: s.proposedText,
      rationale: s.rationale,
      status: 'pending',
      source: 'agent',
      newSectionTitle: s.newSectionTitle,
    }));

    return NextResponse.json({
      ok: true,
      riderData: {
        title: riderTitle,
        artistName,
        type: riderType,
        season,
        version,
        sections: finalSections,
        channels: channelInputs,
        completedSectionIds: finalSections.map((s) => s.id),
      },
      welcomeMessage: aiAudit.welcomeMessage || `Rider importado para **${artistName}**.`,
      auditScore: aiAudit.auditScore || 85,
      suggestions: formattedSuggestions,
    });
  } catch (err) {
    console.error('[POST /api/riders/import] Error procesando archivo:', err);
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error inesperado al importar el rider. Por favor intenta de nuevo.' },
      { status: 500 }
    );
  }
}
