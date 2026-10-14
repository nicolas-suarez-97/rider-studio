import type { RiderContentDoc, RiderContentNode } from '@/core/types/rider.types';

export type InputListColumnKind = 'text' | 'select' | 'toggle';
export type InputListOptionPreset = 'instruments' | 'positions';

export type InputListColumn = {
  id: string;
  label: string;
  kind: InputListColumnKind;
  options?: InputListOptionPreset;
};

export type InputListRow = {
  id: string;
  ch: string;
  cells: Record<string, string | boolean>;
  instrument?: string;
  position?: string;
  mic?: string;
  stand?: string;
  phantom?: boolean;
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

export const DEFAULT_INPUT_LIST_COLUMNS: InputListColumn[] = [
  { id: 'instrument', label: 'Instrumento', kind: 'select', options: 'instruments' },
  { id: 'position', label: 'Posición', kind: 'select', options: 'positions' },
  { id: 'mic', label: 'Micrófono', kind: 'text' },
  { id: 'stand', label: 'Atril', kind: 'text' },
  { id: 'phantom', label: '+48V', kind: 'toggle' },
];

function uid(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function columnOptions(column: InputListColumn): string[] {
  if (column.options === 'instruments') return INPUT_LIST_INSTRUMENTS;
  if (column.options === 'positions') return INPUT_LIST_POSITIONS;
  return [];
}

export function cloneInputListColumns(columns: InputListColumn[] = DEFAULT_INPUT_LIST_COLUMNS): InputListColumn[] {
  return columns.map((column) => ({ ...column }));
}

export function createInputListColumn(kind: InputListColumnKind | InputListOptionPreset | 'notes'): InputListColumn {
  if (kind === 'instruments' || kind === 'select') {
    return { id: uid('col'), label: 'Instrumento', kind: 'select', options: 'instruments' };
  }
  if (kind === 'positions') {
    return { id: uid('col'), label: 'Posición', kind: 'select', options: 'positions' };
  }
  if (kind === 'toggle') {
    return { id: uid('col'), label: '+48V', kind: 'toggle' };
  }
  if (kind === 'notes') {
    return { id: uid('col'), label: 'Notas', kind: 'text' };
  }
  return { id: uid('col'), label: 'Columna', kind: 'text' };
}

function legacyCells(raw: Partial<InputListRow>): Record<string, string | boolean> {
  const cells: Record<string, string | boolean> = { ...(raw.cells || {}) };
  if (typeof raw.instrument === 'string' && cells.instrument == null) cells.instrument = raw.instrument;
  if (typeof raw.position === 'string' && cells.position == null) cells.position = raw.position;
  if (typeof raw.mic === 'string' && cells.mic == null) cells.mic = raw.mic;
  if (typeof raw.stand === 'string' && cells.stand == null) cells.stand = raw.stand;
  if (typeof raw.phantom === 'boolean' && cells.phantom == null) cells.phantom = raw.phantom;
  return cells;
}

export function createInputListRow(index: number, partial?: Partial<InputListRow>): InputListRow {
  return {
    id: partial?.id || uid('ch'),
    ch: partial?.ch || String(index + 1).padStart(2, '0'),
    cells: legacyCells(partial || {}),
  };
}

function sampleCells(
  instrument: string,
  position: string,
  mic: string,
  stand: string,
  phantom: boolean,
): Partial<InputListRow> {
  return { cells: { instrument, position, mic, stand, phantom } };
}

/** Ejemplo típico de banda pop/rock pequeña para arrancar el patch. */
export const SAMPLE_INPUT_LIST_ROWS: InputListRow[] = [
  createInputListRow(0, sampleCells('Kick In', 'Drum Riser', 'Shure Beta 52A', 'Pie corto', false)),
  createInputListRow(1, sampleCells('Snare Top', 'Drum Riser', 'Shure SM57', 'Clip', false)),
  createInputListRow(2, sampleCells('OH L', 'Drum Riser', 'Neumann KM184', 'Jirafa', true)),
  createInputListRow(3, sampleCells('OH R', 'Drum Riser', 'Neumann KM184', 'Jirafa', true)),
  createInputListRow(4, sampleCells('Bass DI', 'Stage Right', 'Radial J48', '—', true)),
  createInputListRow(5, sampleCells('Guitar Amp', 'Stage Left', 'Sennheiser e906', 'Clip', false)),
  createInputListRow(6, sampleCells('Keys L', 'Stage Left', 'Radial JDI', '—', false)),
  createInputListRow(7, sampleCells('Keys R', 'Stage Left', 'Radial JDI', '—', false)),
  createInputListRow(8, sampleCells('Lead Vocal', 'Downstage Center', 'Shure SM58', 'Jirafa', false)),
  createInputListRow(9, sampleCells('Backing Vocal', 'Downstage Left', 'Shure SM58', 'Jirafa', false)),
];

export function cloneInputListRows(rows: InputListRow[] = SAMPLE_INPUT_LIST_ROWS): InputListRow[] {
  return rows.map((row, index) => createInputListRow(index, { ...row, id: undefined }));
}

export function inputListNode(
  rows: InputListRow[] = SAMPLE_INPUT_LIST_ROWS,
  columns: InputListColumn[] = DEFAULT_INPUT_LIST_COLUMNS,
): RiderContentNode {
  return {
    type: 'inputList',
    attrs: {
      rows: cloneInputListRows(rows),
      columns: cloneInputListColumns(columns),
    },
  };
}

export function inputListDoc(
  rows: InputListRow[] = SAMPLE_INPUT_LIST_ROWS,
  columns: InputListColumn[] = DEFAULT_INPUT_LIST_COLUMNS,
): RiderContentDoc {
  return { type: 'doc', content: [inputListNode(rows, columns)] };
}

export function formatInputListPlainText(
  rows: InputListRow[],
  columns: InputListColumn[] = DEFAULT_INPUT_LIST_COLUMNS,
): string {
  return rows
    .map((row) => {
      const data = legacyCells(row);
      const cells = columns.map((column) => {
        const value = data[column.id];
        if (column.kind === 'toggle') return value === true ? column.label : '';
        return typeof value === 'string' ? value : '';
      });
      return [row.ch, ...cells].filter(Boolean).join(' | ');
    })
    .join('\n');
}
