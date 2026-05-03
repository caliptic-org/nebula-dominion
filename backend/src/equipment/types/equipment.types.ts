export enum EquipmentSlot {
  SILAH = 'silah',
  ZIRH = 'zirh',
  AKSESUAR_1 = 'aksesuar_1',
  AKSESUAR_2 = 'aksesuar_2',
  AKSESUAR_3 = 'aksesuar_3',
  OZEL = 'ozel',
}

export enum EquipmentRarity {
  SIRADAN = 'siradan',
  YAYGIN = 'yaygin',
  NADIR = 'nadir',
  DESTANSI = 'destansi',
  EFSANEVI = 'efsanevi',
}

export interface EquipmentStats {
  attack?: number;
  defense?: number;
  speed?: number;
  hp?: number;
}
