export enum EquipmentSlotType {
  SILAH    = 'silah',      // Weapon
  ZIRH     = 'zirh',       // Armor
  AKSESUAR_1 = 'aksesuar_1',
  AKSESUAR_2 = 'aksesuar_2',
  AKSESUAR_3 = 'aksesuar_3',
  OZEL     = 'ozel',       // Special
}

export enum EquipmentRarity {
  SIRADAN   = 'siradan',    // Common   — gray
  YAYGIN    = 'yaygin',     // Uncommon — green
  NADIR     = 'nadir',      // Rare     — blue
  DESTANSI  = 'destansi',   // Epic     — purple
  EFSANEVI  = 'efsanevi',   // Legendary— gold
}

export const RARITY_COLORS: Record<EquipmentRarity, { border: string; glow: string; label: string }> = {
  [EquipmentRarity.SIRADAN]:  { border: '#888888', glow: 'rgba(136,136,136,0.3)', label: 'Sıradan'  },
  [EquipmentRarity.YAYGIN]:   { border: '#44ff88', glow: 'rgba(68,255,136,0.3)', label: 'Yaygın'   },
  [EquipmentRarity.NADIR]:    { border: '#4488ff', glow: 'rgba(68,136,255,0.3)', label: 'Nadir'    },
  [EquipmentRarity.DESTANSI]: { border: '#cc00ff', glow: 'rgba(204,0,255,0.3)',  label: 'Destansı' },
  [EquipmentRarity.EFSANEVI]: { border: '#ffc832', glow: 'rgba(255,200,50,0.4)', label: 'Efsanevi' },
};

export const SLOT_META: Record<EquipmentSlotType, { label: string; icon: string }> = {
  [EquipmentSlotType.SILAH]:      { label: 'Silah',      icon: '⚔️' },
  [EquipmentSlotType.ZIRH]:       { label: 'Zırh',       icon: '🛡️' },
  [EquipmentSlotType.AKSESUAR_1]: { label: 'Aksesuar',   icon: '💎' },
  [EquipmentSlotType.AKSESUAR_2]: { label: 'Aksesuar',   icon: '💎' },
  [EquipmentSlotType.AKSESUAR_3]: { label: 'Aksesuar',   icon: '💎' },
  [EquipmentSlotType.OZEL]:       { label: 'Özel',        icon: '✨' },
};

export const SLOT_ORDER: EquipmentSlotType[] = [
  EquipmentSlotType.SILAH,
  EquipmentSlotType.ZIRH,
  EquipmentSlotType.AKSESUAR_1,
  EquipmentSlotType.AKSESUAR_2,
  EquipmentSlotType.AKSESUAR_3,
  EquipmentSlotType.OZEL,
];

export interface EquipmentStats {
  attack?:  number;
  defense?: number;
  speed?:   number;
  hp?:      number;
}

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlotType;
  rarity: EquipmentRarity;
  icon: string;
  stats: EquipmentStats;
  description: string;
  isEquipped?: boolean;
}

export type SlotState = 'empty' | 'filled' | 'locked';

export interface CommanderEquipment {
  commanderId: string;
  slots: Partial<Record<EquipmentSlotType, EquipmentItem>>;
  lockedSlots?: EquipmentSlotType[];
}

