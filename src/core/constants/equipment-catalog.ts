export type EquipmentFamily = 'pa' | 'console' | 'iem' | 'mic';

export type EquipmentCatalogItem = {
  brand: string;
  model: string;
  family: EquipmentFamily;
};

/** Seed pequeño para el selector thin. El valor libre siempre está disponible. */
export const EQUIPMENT_CATALOG: EquipmentCatalogItem[] = [
  { brand: 'L-Acoustics', model: 'K1', family: 'pa' },
  { brand: 'L-Acoustics', model: 'K2', family: 'pa' },
  { brand: 'L-Acoustics', model: 'Kara II', family: 'pa' },
  { brand: 'd&b audiotechnik', model: 'GSL', family: 'pa' },
  { brand: 'd&b audiotechnik', model: 'KSL', family: 'pa' },
  { brand: 'Meyer Sound', model: 'Panther', family: 'pa' },
  { brand: 'JBL', model: 'VTX A12', family: 'pa' },
  { brand: 'Adamson', model: 'E15', family: 'pa' },
  { brand: 'DiGiCo', model: 'Quantum 338', family: 'console' },
  { brand: 'DiGiCo', model: 'SD12', family: 'console' },
  { brand: 'Avid', model: 'S6L 24C', family: 'console' },
  { brand: 'Yamaha', model: 'Rivage PM5', family: 'console' },
  { brand: 'Yamaha', model: 'CL5', family: 'console' },
  { brand: 'Shure', model: 'PSM1000', family: 'iem' },
  { brand: 'Sennheiser', model: '2000 Series', family: 'iem' },
  { brand: 'Shure', model: 'SM58', family: 'mic' },
];
