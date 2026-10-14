import { SECTION_FIELD_CONFIGS } from '@/core/constants/section-fields';
import { RiderType } from '@/core/types/rider.types';

export interface SectionOutlinePrompt {
  id: string;
  kind: 'chat' | 'topic';
  label: string;
  prompt: string;
}

function typeLabel(riderType: RiderType) {
  if (riderType === 'hospitality') return 'de hospitality';
  if (riderType === 'seguridad') return 'de seguridad';
  return 'técnico';
}

function topicLabel(prefix: string, label: string) {
  const short = (prefix || label).split('/')[0].trim();
  return short.length > 34 ? `${short.slice(0, 32).trim()}…` : short;
}

export function outlinePromptsForSection(
  section: { id: string; title: string },
  riderType: RiderType,
): SectionOutlinePrompt[] {
  const kind = typeLabel(riderType);
  const title = section.title.trim() || 'esta sección';
  const chat: SectionOutlinePrompt = {
    id: 'chat',
    kind: 'chat',
    label: 'Redactar esta sección',
    prompt: `Ayúdame a redactar la sección «${title}» de este rider ${kind}. Está vacía. Propón el contenido profesional típico, con placeholders claros donde falte un dato, listo para pegar en el documento.`,
  };

  const config = SECTION_FIELD_CONFIGS[section.id];
  const fields = config?.fields.slice(0, 4) || [];
  const topics: SectionOutlinePrompt[] = fields.map((field) => ({
    id: field.key,
    kind: 'topic',
    label: topicLabel(field.prefix, field.label),
    prompt: `Redacta el apartado «${field.label}» de la sección «${title}» para un rider ${kind}. Usa un estilo de rider profesional y deja placeholders si falta un dato concreto.`,
  }));

  if (!topics.length) {
    topics.push(
      {
        id: 'reqs',
        kind: 'topic',
        label: 'Requisitos clave',
        prompt: `Propón los requisitos clave de la sección «${title}» para un rider ${kind}, listos para pegar en el documento.`,
      },
      {
        id: 'specs',
        kind: 'topic',
        label: 'Cantidades y specs',
        prompt: `Completa cantidades, especificaciones y alternativas típicas de la sección «${title}» para un rider ${kind}.`,
      },
    );
  }

  return [chat, ...topics];
}
