import { StagePlotConfig, StageElement } from '../types/rider.types';

export const DEFAULT_STAGE_PLOT: StagePlotConfig = {
  stageWidth: 12.0,
  stageDepth: 10.0,
  stageHeight: 1.5,
  elements: [
    {
      id: 'sp-drums',
      name: 'Batería Acústica',
      category: 'riser',
      icon: '🥁',
      x: 50,
      y: 20,
      channel: '8 Chs (Kick, Snare, Toms, OH)',
      notes: 'Tarima 2.4m × 2.4m × 0.4m • Sub-Snake A • IEM Mix 5',
      powerRequirement: 'AC 110V Drop'
    },
    {
      id: 'sp-keys',
      name: 'Teclados / Synth',
      category: 'instrument',
      icon: '🎹',
      x: 18,
      y: 22,
      channel: 'DI Estéreo (L/R)',
      notes: 'Atril reforzado • Cable XLR',
      powerRequirement: 'AC 110V Drop'
    },
    {
      id: 'sp-amps',
      name: 'Amps Guitarra & Bajo',
      category: 'amp',
      icon: '🎸',
      x: 82,
      y: 22,
      channel: 'Mic SM57 & DI Activa',
      notes: 'Acometida con tierra aislada',
      powerRequirement: 'AC 110V / 220V 20A'
    },
    {
      id: 'sp-snake-a',
      name: 'Drop Box Snake A',
      category: 'snake',
      icon: '🔌',
      x: 32,
      y: 48,
      channel: '12 Canales',
      notes: 'Llegada de cables Upstage'
    },
    {
      id: 'sp-snake-b',
      name: 'Drop Box Snake B',
      category: 'snake',
      icon: '🔌',
      x: 68,
      y: 48,
      channel: '12 Canales',
      notes: 'Llegada de cables Downstage'
    },
    {
      id: 'sp-vox-gtr',
      name: 'Voz / Guitarra',
      category: 'vocal',
      icon: '🎤',
      x: 20,
      y: 78,
      channel: 'Ch 03',
      notes: 'Wedge Mix 2 • Pie Jirafa'
    },
    {
      id: 'sp-vox-lead',
      name: 'Voz Líder (Front Center)',
      category: 'vocal',
      icon: '🎤',
      x: 50,
      y: 82,
      channel: 'Ch 01 • KSM8 / SM58',
      notes: 'Par de Wedges (Mix 1 L/R) • Pie Recto'
    },
    {
      id: 'sp-vox-bass',
      name: 'Voz / Bajo',
      category: 'vocal',
      icon: '🎤',
      x: 80,
      y: 78,
      channel: 'Ch 02',
      notes: 'Wedge Mix 3 • Pie Jirafa'
    }
  ]
};

export const STAGE_PRESET_TEMPLATES: Array<{
  category: StageElement['category'];
  name: string;
  icon: string;
  defaultNotes?: string;
  defaultPower?: string;
}> = [
  { category: 'vocal', name: 'Micrófono de Voz', icon: '🎤', defaultNotes: 'Pie trípode y cuña monitor' },
  { category: 'instrument', name: 'Batería / Percusión', icon: '🥁', defaultNotes: 'Riser con alfombra negra', defaultPower: 'AC 110V' },
  { category: 'amp', name: 'Amplificador Guitarra / Bajo', icon: '🎸', defaultNotes: 'Mic SM57 / DI Box', defaultPower: 'AC 110V/220V' },
  { category: 'instrument', name: 'Teclados / Piano / Sintetizador', icon: '🎹', defaultNotes: 'Caja directa estéreo', defaultPower: 'AC 110V' },
  { category: 'instrument', name: 'Set DJ / Playback', icon: '🎧', defaultNotes: 'Mesa estable y salida balanceada', defaultPower: 'AC 110V' },
  { category: 'monitor', name: 'Monitor de Piso (Wedge)', icon: '📢', defaultNotes: 'Mezcla auxiliar dedicada' },
  { category: 'instrument', name: 'Sección de Vientos / Brass', icon: '🎺', defaultNotes: 'Micrófonos clip / atriles' },
  { category: 'power', name: 'Toma Eléctrica (AC Drop)', icon: '⚡', defaultNotes: 'Tierra aislada dedicada a audio', defaultPower: '20A Clean Audio' },
  { category: 'snake', name: 'Drop Box / Sub-Snake', icon: '🔌', defaultNotes: 'Sub-cajetín 8-12 canales' },
  { category: 'riser', name: 'Tarima Elevada (Riser)', icon: '📦', defaultNotes: 'Tarima con frenos de seguridad' }
];
