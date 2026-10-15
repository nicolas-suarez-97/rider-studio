import { NextRequest, NextResponse } from 'next/server';
import { extractRiderFile } from '@/lib/importer/extract-rider-file';
import { callAiCompletion } from '@/lib/ai/ai-provider';
import { RiderType, SectionItem, RiderContentDoc } from '@/core/types/rider.types';
import { DocumentSuggestion } from '@/core/types/suggestion.types';
import { buildCoverContentDoc, DOCUMENT_COVER_ID, plainTextToDoc } from '@/core/editor/content-doc';
import { cloneInputListColumns, DEFAULT_INPUT_LIST_COLUMNS, type InputListRow } from '@/core/constants/input-list';
import { ChannelInput } from '@/core/models/ChannelInput';


interface AiParsedRider {
  artistName?: string;
  riderTitle?: string;
  riderType?: 'tecnico' | 'hospitality' | 'seguridad';
  season?: string;
  version?: string;
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
}

const RIDER_PARSER_SYSTEM_PROMPT = `Eres el Master Production Copilot de Rider Studio, la plataforma líder de ingeniería y producción técnica para espectáculos en vivo y giras.
Tu tarea es leer el texto crudo de un rider provisto por el usuario (extraído de un archivo PDF, Word o texto), estructurarlo meticulosamente para nuestro editor profesional TipTap y realizar una auditoría técnica inmediata con sugerencias accionables.

DEBES responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "artistName": "Nombre del Artista o Banda (extraído o inferido del documento)",
  "riderTitle": "Título del documento (ej: Rider Técnico de Audio & Escenario)",
  "riderType": "tecnico" | "hospitality" | "seguridad",
  "season": "Año o temporada (ej: 2026)",
  "version": "Versión detectada (ej: v1.0, v2.1 o v1.0 por defecto)",
  "sections": [
    {
      "id": "slug-identificador (ej: tech-contactos, tech-pa, tech-monitores, tech-input-list, tech-backline, tech-stage-plot, tech-electricidad)",
      "title": "Título formal de la sección",
      "content": "Contenido en texto limpio usando viñetas con '• ' para cada punto técnico y saltos de línea claros",
      "isInputList": false,
      "requirements": [
        { "label": "Obligatorio | Recomendado | Crítico", "text": "Requerimiento formal" }
      ]
    }
  ],
  "channels": [
    {
      "channelNumber": 1,
      "name": "Instrumento o fuente (ej: Kick In, Snare Top, Bass DI, Lead Vocal)",
      "mic": "Micrófono preferido (ej: Shure Beta 91A, SM57, Neumann KMS104, Radial J48)",
      "stand": "Atril (ej: Garra, Jirafa Baja, Jirafa Alta, Standard)",
      "phantom": true o false,
      "notes": "Observaciones (ej: Sub-snake A, Compresor 1176)"
    }
  ],
  "auditScore": 75,
  "auditSummary": "Diagnóstico de 2-3 frases sobre la calidad del rider y sus principales fortalezas.",
  "welcomeMessage": "Mensaje en español dirigiéndote al usuario con tono profesional, conciso y técnico. Salúdalo, dile qué artista y secciones detectaste, qué estructuraste en el editor (incluyendo el Input List si lo hubo) y detalla qué vacíos o riesgos técnicos identificaste que debería corregir.",
  "suggestions": [
    {
      "sectionId": "id-de-la-seccion-relevante",
      "kind": "insert" | "replace" | "add_channel" | "add_section",
      "baseText": "texto existente al que se ancla la sugerencia (o vacío si es insert)",
      "proposedText": "texto exacto técnico de alta calidad que se propone insertar en el documento",
      "rationale": "Explicación técnica de por qué es crucial agregar esto (ej: Exigir SPL de 102 dBA en FOH para evitar disputas de volumen con promotores)."
    }
  ]
}

REGLAS DE RIGOR TÉCNICO:
1. Detecta todos los canales del Input List si vienen en tablas o listas numeradas y colócalos en "channels".
2. Si hay canales, crea una sección con "isInputList": true y título "Input List & Microfonía".
3. Identifica puntos ciegos o deficiencias clásicas de producción:
   - Pedir potencia en "Watts" en lugar de presión sonora SPL continuo en dBA.
   - Falta de marcas y modelos homologados de consolas digitales (DiGiCo, Avid, Yamaha).
   - In-Ears sin coordinación de radiofrecuencias obligatoria.
   - Tomas de corriente sin especificar "tierra física aislada para audio".
   - Falta de datos de contacto de FOH / Monitores / Production Manager.
   - Falta de plazo límite para contra-riders.
4. Para cada punto ciego encontrado, incluye una sugerencia en "suggestions" con el texto técnico exacto listo para insertarse en el documento.
5. Responde estrictamente con JSON puro, sin explicaciones antes ni después.`;

function buildContentDocForSection(
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

  // Párrafos y viñetas del contenido
  const lines = (section.content || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const bullets: string[] = [];
  const paragraphs: string[] = [];

  for (const line of lines) {
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      bullets.push(line.replace(/^[•\-*]\s*/, ''));
    } else {
      paragraphs.push(line);
    }
  }

  for (const p of paragraphs) {
    nodes.push({
      type: 'paragraph',
      content: [{ type: 'text', text: p }],
    });
  }

  if (bullets.length > 0) {
    nodes.push({
      type: 'bulletList',
      content: bullets.map((b) => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: b }] }],
      })),
    });
  }

  // Requerimientos formales si los hay
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

  // Si esta sección es la del Input List, agregar el nodo interactivo de TipTap
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

  return {
    type: 'doc',
    content: nodes,
  };
}

export async function POST(req: NextRequest) {
  try {
    let rawText = '';
    let fileName = 'rider_importado';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return NextResponse.json({ ok: false, error: 'No se envió ningún archivo válido.' }, { status: 400 });
      }

      fileName = file.name;
      const extraction = await extractRiderFile(file);
      if (!extraction.ok) {
        return NextResponse.json({ ok: false, error: extraction.error }, { status: 400 });
      }

      rawText = extraction.extracted.text;
    } else {
      const json = await req.json().catch(() => ({}));
      rawText = typeof json.text === 'string' ? json.text : '';
      fileName = typeof json.fileName === 'string' ? json.fileName : 'rider_importado';
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { ok: false, error: 'El documento no contiene texto legible.' },
        { status: 400 }
      );
    }

    // 2. Invocar al modelo LLM con structured output
    const aiResult = await callAiCompletion({
      messages: [
        { role: 'system', content: RIDER_PARSER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analiza y extrae las secciones de este rider existente (nombre de archivo: "${fileName}"):\n\n=== TEXTO DEL RIDER ===\n${rawText.slice(0, 30000)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 3800,
      jsonMode: true,
    });

    let parsed: AiParsedRider = {};

    if (aiResult?.content) {
      try {
        const cleanContent = aiResult.content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        parsed = JSON.parse(cleanContent);
      } catch (e) {
        console.warn('[Rider Import] Error parseando JSON de IA, usando fallback estructurado:', e);
      }
    }

    // 3. Fallback inteligente si la IA no devolvió datos completos
    const artistName = (parsed.artistName || fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')).trim();
    const riderTitle = (parsed.riderTitle || 'Rider Técnico de Producción').trim();
    const riderType: RiderType = parsed.riderType || 'tecnico';
    const season = parsed.season || String(new Date().getFullYear());
    const version = parsed.version || 'v1.0';

    const rawSections = Array.isArray(parsed.sections) && parsed.sections.length > 0
      ? parsed.sections
      : [
          {
            id: 'tech-contactos',
            title: 'Info General & Contactos Clave',
            content: '• Artista: ' + artistName + '\n• Producción y Sonido: Por confirmar',
            isInputList: false,
          },
          {
            id: 'tech-requerimientos',
            title: 'Requerimientos Técnicos Importados',
            content: rawText.slice(0, 3000),
            isInputList: false,
          },
        ];

    const channels = Array.isArray(parsed.channels) ? parsed.channels : [];

    // 4. Construir las secciones de TipTap
    const finalSections: SectionItem[] = [
      {
        id: DOCUMENT_COVER_ID,
        num: '',
        title: 'Portada',
        subtitle: 'Portada del rider',
        tag: 'Portada',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'fileText',
        content: '',
        contentDoc: buildCoverContentDoc(riderType, artistName, riderTitle, version),
        pageBreakBefore: false,
      },
    ];

    let sectionIndex = 1;
    for (const sec of rawSections) {
      const secId = sec.id || `imported-sec-${sectionIndex}`;
      const title = sec.title || `Sección ${sectionIndex}`;
      const contentDoc = buildContentDocForSection(sec, channels);

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
        pageBreakBefore: true,
      });

      sectionIndex += 1;
    }

    // 5. Preparar canales de ChannelInput
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

    // 6. Preparar sugerencias para el chat
    const formattedSuggestions: DocumentSuggestion[] = (parsed.suggestions || []).map((s, idx) => ({
      id: `sug-import-${Date.now()}-${idx}`,
      sectionId: s.sectionId || finalSections[1]?.id || 'tech-contactos',
      kind: s.kind || 'insert',
      baseText: s.baseText || '',
      proposedText: s.proposedText,
      rationale: s.rationale,
      status: 'pending',
      source: 'agent',
      newSectionTitle: s.newSectionTitle,
    }));

    const welcomeMessage =
      parsed.welcomeMessage ||
      `👋 ¡Hola! He analizado e importado el documento de tu rider para **${artistName}**.\n\n` +
      `Estructuré **${finalSections.length - 1} secciones** en el editor formal de Rider Studio` +
      (channels.length > 0 ? ` y organicé un **Input List de ${channels.length} canales** con microfonía y especificaciones de atril.` : '.') +
      `\n\n📌 **Diagnóstico Inicial (Puntaje: ${parsed.auditScore || 80}/100):**\n` +
      `${parsed.auditSummary || 'El documento cuenta con base técnica sólida, pero requiere acotaciones clave para evitar objeciones en el contra-rider.'}\n\n` +
      (formattedSuggestions.length > 0
        ? `He generado **${formattedSuggestions.length} sugerencias reglamentarias** para complementar tu documento. Puedes revisarlas y aplicarlas al documento con un solo clic.`
        : 'Tu rider está listo para revisión y exportación.');

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
      },
      welcomeMessage,
      auditScore: parsed.auditScore || 80,
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
