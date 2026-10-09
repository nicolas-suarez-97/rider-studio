import { ContraFinding, FindingVerdict } from '@/core/types/contra-rider.types';

export const FINDING_RESPONSE_LABEL: Record<FindingVerdict, string> = {
  cumple: 'Aprobado',
  parcial: 'Alternativa',
  no_aparece: 'Rechazado',
  contradice: 'Rechazado',
};

export function verdictSummary(findings: ContraFinding[]): string {
  const cubro = findings.filter((finding) => finding.verdict === 'cumple').length;
  const alternativa = findings.filter((finding) => finding.verdict === 'parcial').length;
  const noPuedo = findings.filter((finding) => finding.verdict === 'no_aparece' || finding.verdict === 'contradice').length;
  return `${cubro} Aprobado, ${alternativa} Alternativa, ${noPuedo} Rechazado.`;
}

const GENERATE_MARKER = 'Genera el contra-rider con:';

export function sourcesFromGeneratePrompt(text: string | undefined): string[] {
  if (!text?.startsWith(GENERATE_MARKER)) return [];
  return text
    .slice(GENERATE_MARKER.length)
    .replace(/\.\s*$/, '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

export function sourcesFromReviewPrompt(text: string | undefined): string[] {
  const match = text?.match(/^Revisa el contra-rider «(.+)»\.$/);
  return match?.[1] ? [match[1]] : [];
}

export function contraRiderFileText(params: {
  artistName: string;
  sources: string[];
  findings: ContraFinding[];
  summary?: string;
}): string {
  const artist = params.artistName.trim() || 'Artista';
  const sources = params.sources.filter(Boolean);
  const lines = [
    `Contra-rider — ${artist}`,
    '',
    'Cruce de los datos del promotor con los pedidos del artista.',
    'No hace falta que el material de origen sea un contra-rider estructurado.',
  ];
  if (sources.length) lines.push(`Datos usados: ${sources.join(', ')}.`);
  if (params.summary?.trim()) lines.push(params.summary.trim());
  lines.push(
    '',
    'Este archivo no envía el contra-rider. Las filas de la pantalla siguen siendo la respuesta oficial.',
    ''
  );

  params.findings.forEach((finding, index) => {
    const number = String(index + 1).padStart(2, '0');
    lines.push(`${number}. ${finding.sectionTitle}`);
    lines.push(`Pedido del artista: ${finding.riderAsk || 'Sin pedido escrito.'}`);
    lines.push(`Respuesta: ${FINDING_RESPONSE_LABEL[finding.verdict]}`);
    if (finding.fileOffer || finding.suggestedText) {
      lines.push(`A partir de tus datos: ${finding.fileOffer || finding.suggestedText}`);
    }
    lines.push('');
  });

  return `${lines.join('\n').trim()}\n`;
}

export function contraRiderFileName(artistName: string): string {
  const slug = artistName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `contra-rider-${slug || 'artista'}.txt`;
}

export function downloadContraRiderFile(params: {
  artistName: string;
  sources: string[];
  findings: ContraFinding[];
  summary?: string;
}) {
  const text = contraRiderFileText(params);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = contraRiderFileName(params.artistName);
  link.click();
  URL.revokeObjectURL(url);
}
