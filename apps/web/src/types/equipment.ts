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

// Demo inventory for the modal preview
export const DEMO_EQUIPMENT: EquipmentItem[] = [
  {
    id: 'eq_plasma_blade',
    name: 'Plazma Kılıç',
    slot: EquipmentSlotType.SILAH,
    rarity: EquipmentRarity.NADIR,
    icon: '⚡',
    stats: { attack: +25, speed: +5 },
    description: 'Saf enerjiyle şarj edilmiş titanyum kılıç.',
  },
  {
    id: 'eq_void_sword',
    name: 'Boşluk Kılıcı',
    slot: EquipmentSlotType.SILAH,
    rarity: EquipmentRarity.DESTANSI,
    icon: '🌀',
    stats: { attack: +45, hp: -10 },
    description: 'Boyutlar arası yarıktan çıkarılmış karanlık metal.',
  },
  {
    id: 'eq_legend_blade',
    name: 'Yıldız Parçası',
    slot: EquipmentSlotType.SILAH,
    rarity: EquipmentRarity.EFSANEVI,
    icon: '⭐',
    stats: { attack: +70, speed: +10 },
    description: 'Çökmüş bir yıldızın çekirdeğinden şekillendirilmiş.',
  },
  {
    id: 'eq_titan_armor',
    name: 'Titan Zırhı',
    slot: EquipmentSlotType.ZIRH,
    rarity: EquipmentRarity.DESTANSI,
    icon: '🔩',
    stats: { defense: +50, speed: -5 },
    description: 'Titan kemiklerinden dövülmüş ağır zırh.',
  },
  {
    id: 'eq_phase_armor',
    name: 'Faz Zırhı',
    slot: EquipmentSlotType.ZIRH,
    rarity: EquipmentRarity.NADIR,
    icon: '🔷',
    stats: { defense: +30, hp: +20 },
    description: 'Holografik katmanlarla güçlendirilmiş hafif zırh.',
  },
  {
    id: 'eq_speed_ring',
    name: 'Hız Yüzüğü',
    slot: EquipmentSlotType.AKSESUAR_1,
    rarity: EquipmentRarity.YAYGIN,
    icon: '💍',
    stats: { speed: +15 },
    description: 'Hareket hızını artıran kinetik enerji yüzüğü.',
  },
  {
    id: 'eq_life_gem',
    name: 'Yaşam Taşı',
    slot: EquipmentSlotType.AKSESUAR_2,
    rarity: EquipmentRarity.NADIR,
    icon: '💚',
    stats: { hp: +40 },
    description: 'Biyoenerji kristali — savaşçının gücünü artırır.',
  },
  {
    id: 'eq_nebula_charm',
    name: 'Nebula Muskası',
    slot: EquipmentSlotType.AKSESUAR_3,
    rarity: EquipmentRarity.SIRADAN,
    icon: '🌌',
    stats: { defense: +5, attack: +5 },
    description: 'Eski uzay ritüellerinden kalma denge muskası.',
  },
  {
    id: 'eq_core_implant',
    name: 'Çekirdek İmplantı',
    slot: EquipmentSlotType.OZEL,
    rarity: EquipmentRarity.EFSANEVI,
    icon: '🧠',
    stats: { attack: +30, defense: +30, speed: +20, hp: +50 },
    description: 'Tüm istatistikleri artıran nöral komuta çekirdeği.',
  },
];

// Default equipped items for demo commander
export const DEMO_COMMANDER_EQUIPMENT: CommanderEquipment = {
  commanderId: 'voss',
  slots: {
    [EquipmentSlotType.SILAH]: DEMO_EQUIPMENT[0],
    [EquipmentSlotType.ZIRH]:  DEMO_EQUIPMENT[4],
    [EquipmentSlotType.AKSESUAR_1]: DEMO_EQUIPMENT[5],
  },
  lockedSlots: [EquipmentSlotType.AKSESUAR_3, EquipmentSlotType.OZEL],
};
