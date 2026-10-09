import { Rider } from '@/core/models/Rider';
import { RiderType } from '@/core/types/rider.types';

const MODULE_LABELS: Record<RiderType, string> = {
  tecnico: 'Técnico',
  hospitality: 'Hospitality',
  seguridad: 'Seguridad',
};

const SNAPSHOT_LIMIT = 14000;

export function buildRiderSnapshot(rider: Rider): string {
  const lines: string[] = [
    `Artista: ${rider.artistName || 'sin nombre'}`,
    `Título: ${rider.title}`,
    `Venue: ${rider.venue || 'no indicado'}`,
    `Temporada: ${rider.season || 'no indicada'}`,
    `Versión: ${rider.version}`,
  ];

  const modules = rider.getAllModules();
  (Object.keys(MODULE_LABELS) as RiderType[]).forEach((type) => {
    const mod = modules[type];
    lines.push(`\n## Módulo ${MODULE_LABELS[type]}`);
    mod.sections.forEach((section) => {
      lines.push(`\n### ${section.num} ${section.title}`);
      if (section.subtitle) lines.push(section.subtitle);
      lines.push(section.content?.trim() ? section.content.trim() : '(sin contenido)');
    });
    if (type === 'tecnico' && mod.channels && mod.channels.length > 0) {
      lines.push('\n### Canales');
      mod.channels.forEach((ch) => {
        lines.push(
          `Ch ${ch.ch}: ${ch.name} | micrófono ${ch.mic || 'no indicado'} | atril ${ch.stand || 'no indicado'} | phantom ${ch.phantom ? 'sí' : 'no'}`
        );
      });
    }
  });

  const plot = rider.stagePlot;
  lines.push('\n## Stage plot');
  lines.push(`Escenario ${plot.stageWidth}m de ancho × ${plot.stageDepth}m de fondo × ${plot.stageHeight}m de alto`);
  if (!plot.elements?.length) {
    lines.push('(sin elementos en el plano)');
  } else {
    plot.elements.forEach((el) => {
      const notes = el.notes ? ` — ${el.notes}` : '';
      lines.push(`- ${el.name} (${el.category}) en x:${el.x} y:${el.y}${notes}`);
    });
  }

  const text = lines.join('\n');
  if (text.length <= SNAPSHOT_LIMIT) return text;
  return `${text.slice(0, SNAPSHOT_LIMIT)}\n[documento recortado por longitud]`;
}

export function buildConsultSystemPrompt(agentPrompt: string, snapshot: string): string {
  return `${agentPrompt}

MODO CONSULTA.
Estás leyendo un rider ya publicado. Respondes preguntas sobre ese documento.
No modificas el rider. No digas que agregaste, actualizaste, guardaste o sincronizaste nada.
Si el dato no está en el rider, dilo con claridad.
Cuando respondas, indica la sección de la que sale el dato.
Responde en español y de forma breve.

RIDER:
${snapshot}`;
}

export function answerFromSnapshot(question: string, snapshot: string): string {
  const terms = question
    .toLowerCase()
    .split(/[^a-záéíóúüñ0-9]+/i)
    .filter((word) => word.length > 3);

  const blocks = snapshot.split(/\n(?=### |## )/);
  const ranked = blocks
    .map((block) => {
      const haystack = block.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      return { block: block.trim(), score };
    })
    .filter((entry) => entry.score > 0 && entry.block.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  if (ranked.length === 0) {
    return 'No encuentro ese dato en el rider. Puedo responder solo con lo que está escrito en el documento.';
  }

  return `Según el rider:\n\n${ranked.map((entry) => entry.block).join('\n\n')}`;
}
