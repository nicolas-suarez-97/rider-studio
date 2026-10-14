import type { RiderContentDoc, RiderContentNode } from '@/core/types/rider.types';

export type InputListRow = {
  id: string;
  ch: string;
  instrument: string;
  position: string;
  mic: string;
  stand: string;
  phantom: boolean;
};

export const INPUT_LIST_INSTRUMENTS = [
  'Kick In',
  'Kick Out',
  'Snare Top',
  'Snare Bottom',
  'Hi-Hat',
  'Tom 1',
  'Tom 2',
  'Floor Tom',
  'OH L',
  'OH R',
  'Bass DI',
  'Bass Mic',
  'Guitar L',
  'Guitar R',
  'Acoustic',
  'Keys L',
  'Keys R',
  'Sax',
  'Trumpet',
  'Lead Vocal',
  'Backing Vocal',
  'Choir',
  'Playback L',
  'Playback R',
  'Click',
  'Talkback',
];

export const INPUT_LIST_POSITIONS = [
  'Downstage Center',
  'Downstage Left',
  'Downstage Right',
  'Center',
  'Stage Left',
  'Stage Right',
  'Upstage Center',
  'Upstage Left',
  'Upstage Right',
  'Drum Riser',
  'Offstage',
  'FOH',
  'Monitor World',
];

function rowId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ch-${crypto.randomUUID()}`;
  }
  return `ch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createInputListRow(index: number, partial?: Partial<InputListRow>): InputListRow {
  return {
    id: partial?.id || rowId(),
    ch: partial?.ch || String(index + 1).padStart(2, '0'),
    instrument: partial?.instrument || '',
    position: partial?.position || '',
    mic: partial?.mic || '',
    stand: partial?.stand || '',
    phantom: partial?.phantom ?? false,
  };
}

/** Ejemplo típico de banda pop/rock pequeña para arrancar el patch. */
export const SAMPLE_INPUT_LIST_ROWS: InputListRow[] = [
  createInputListRow(0, { instrument: 'Kick In', position: 'Drum Riser', mic: 'Shure Beta 52A', stand: 'Pie corto', phantom: false }),
  createInputListRow(1, { instrument: 'Snare Top', position: 'Drum Riser', mic: 'Shure SM57', stand: 'Clip', phantom: false }),
  createInputListRow(2, { instrument: 'OH L', position: 'Drum Riser', mic: 'Neumann KM184', stand: 'Jirafa', phantom: true }),
  createInputListRow(3, { instrument: 'OH R', position: 'Drum Riser', mic: 'Neumann KM184', stand: 'Jirafa', phantom: true }),
  createInputListRow(4, { instrument: 'Bass DI', position: 'Stage Right', mic: 'Radial J48', stand: '—', phantom: true }),
  createInputListRow(5, { instrument: 'Guitar Amp', position: 'Stage Left', mic: 'Sennheiser e906', stand: 'Clip', phantom: false }),
  createInputListRow(6, { instrument: 'Keys L', position: 'Stage Left', mic: 'Radial JDI', stand: '—', phantom: false }),
  createInputListRow(7, { instrument: 'Keys R', position: 'Stage Left', mic: 'Radial JDI', stand: '—', phantom: false }),
  createInputListRow(8, { instrument: 'Lead Vocal', position: 'Downstage Center', mic: 'Shure SM58', stand: 'Jirafa', phantom: false }),
  createInputListRow(9, { instrument: 'Backing Vocal', position: 'Downstage Left', mic: 'Shure SM58', stand: 'Jirafa', phantom: false }),
];

export function cloneInputListRows(rows: InputListRow[] = SAMPLE_INPUT_LIST_ROWS): InputListRow[] {
  return rows.map((row, index) => createInputListRow(index, { ...row, id: undefined }));
}

export function inputListNode(rows: InputListRow[] = SAMPLE_INPUT_LIST_ROWS): RiderContentNode {
  return { type: 'inputList', attrs: { rows: cloneInputListRows(rows) } };
}

export function inputListDoc(rows: InputListRow[] = SAMPLE_INPUT_LIST_ROWS): RiderContentDoc {
  return { type: 'doc', content: [inputListNode(rows)] };
}

export function formatInputListPlainText(rows: InputListRow[]): string {
  return rows
    .map((row) => {
      const phantom = row.phantom ? '+48V' : '';
      return [row.ch, row.instrument, row.position, row.mic, row.stand, phantom].filter(Boolean).join(' | ');
    })
    .join('\n');
}
