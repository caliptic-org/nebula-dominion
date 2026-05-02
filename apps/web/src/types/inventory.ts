export enum ItemRarity {
  SIRADAN   = 'siradan',   // Common   — gray
  YAYGIN    = 'yaygin',    // Uncommon — green
  NADIR     = 'nadir',     // Rare     — blue
  DESTANSI  = 'destansi',  // Epic     — purple
  EFSANEVI  = 'efsanevi',  // Legendary — orange
}

export enum ItemCategory {
  TUMSU    = 'tumsu',     // All
  KAYNAK   = 'kaynak',    // Resource
  EKIPMAN  = 'ekipman',   // Equipment
  YUKSELTME = 'yukseltme', // Upgrade
  OZEL     = 'ozel',      // Special
}

export enum SortMode {
  NADIR    = 'nadir',
  ADET     = 'adet',
  SON_ALINAN = 'son_alinan',
}

export interface ItemEffect {
  label: string;
  value: string;
  positive?: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  icon: string;           // emoji or asset path
  quantity: number;
  effects: ItemEffect[];
  acquiredAt: number;     // timestamp
  canUse: boolean;
  canSell: boolean;
  sellValue: number;      // gems
}

export const RARITY_CONFIG: Record<ItemRarity, {
  label: string;
  color: string;
  dimColor: string;
  glowColor: string;
  borderColor: string;
  stars: number;
}> = {
  [ItemRarity.SIRADAN]: {
    label: 'Sıradan',
    color: '#8a8a9a',
    dimColor: 'rgba(138,138,154,0.12)',
    glowColor: 'rgba(138,138,154,0.3)',
    borderColor: 'rgba(138,138,154,0.25)',
    stars: 1,
  },
  [ItemRarity.YAYGIN]: {
    label: 'Yaygın',
    color: '#44dd88',
    dimColor: 'rgba(68,221,136,0.12)',
    glowColor: 'rgba(68,221,136,0.35)',
    borderColor: 'rgba(68,221,136,0.3)',
    stars: 2,
  },
  [ItemRarity.NADIR]: {
    label: 'Nadir',
    color: '#4488ff',
    dimColor: 'rgba(68,136,255,0.12)',
    glowColor: 'rgba(68,136,255,0.4)',
    borderColor: 'rgba(68,136,255,0.35)',
    stars: 3,
  },
  [ItemRarity.DESTANSI]: {
    label: 'Destansı',
    color: '#cc00ff',
    dimColor: 'rgba(204,0,255,0.12)',
    glowColor: 'rgba(204,0,255,0.45)',
    borderColor: 'rgba(204,0,255,0.4)',
    stars: 4,
  },
  [ItemRarity.EFSANEVI]: {
    label: 'Efsanevi',
    color: '#ff9900',
    dimColor: 'rgba(255,153,0,0.12)',
    glowColor: 'rgba(255,153,0,0.5)',
    borderColor: 'rgba(255,153,0,0.45)',
    stars: 5,
  },
};

export const CATEGORY_CONFIG: Record<ItemCategory, {
  label: string;
  icon: string;
  color: string;
  dimColor: string;
}> = {
  [ItemCategory.TUMSU]:     { label: 'Tümü',      icon: '◈',  color: '#7b8cde', dimColor: 'rgba(123,140,222,0.12)' },
  [ItemCategory.KAYNAK]:    { label: 'Kaynak',    icon: '⬡',  color: '#ffc832', dimColor: 'rgba(255,200,50,0.12)'  },
  [ItemCategory.EKIPMAN]:   { label: 'Ekipman',   icon: '⚔',  color: '#44d9c8', dimColor: 'rgba(68,217,200,0.12)' },
  [ItemCategory.YUKSELTME]: { label: 'Yükseltme', icon: '◬',  color: '#4a9eff', dimColor: 'rgba(74,158,255,0.12)' },
  [ItemCategory.OZEL]:      { label: 'Özel',      icon: '✦',  color: '#cc00ff', dimColor: 'rgba(204,0,255,0.12)'  },
};

export const DEMO_INVENTORY: InventoryItem[] = [
  {
    id: 'item-001',
    name: 'Mineral Parçası',
    description: 'Ham mineral cevheri. Yapı inşaatında temel malzeme.',
    category: ItemCategory.KAYNAK,
    rarity: ItemRarity.SIRADAN,
    icon: '⬡',
    quantity: 240,
    effects: [{ label: 'Mineral', value: '+240', positive: true }],
    acquiredAt: Date.now() - 60000,
    canUse: true,
    canSell: true,
    sellValue: 5,
  },
  {
    id: 'item-002',
    name: 'Neon Gaz Kapsülü',
    description: 'Sıkıştırılmış nebula gazı. Birim üretiminde kullanılır.',
    category: ItemCategory.KAYNAK,
    rarity: ItemRarity.YAYGIN,
    icon: '⬡',
    quantity: 80,
    effects: [{ label: 'Gas', value: '+80', positive: true }],
    acquiredAt: Date.now() - 120000,
    canUse: true,
    canSell: true,
    sellValue: 12,
  },
  {
    id: 'item-003',
    name: 'Kuantum Enerji Hücresi',
    description: 'Savaş güç kaynağı. Kritik saldırı gücünü artırır.',
    category: ItemCategory.KAYNAK,
    rarity: ItemRarity.NADIR,
    icon: '⚡',
    quantity: 15,
    effects: [
      { label: 'Enerji', value: '+150', positive: true },
      { label: 'Saldırı Gücü', value: '+8%', positive: true },
    ],
    acquiredAt: Date.now() - 300000,
    canUse: true,
    canSell: true,
    sellValue: 50,
  },
  {
    id: 'item-004',
    name: 'Titan Zırh Parçası',
    description: 'Kadim savaşçıların kullandığı yıkılmaz zırh fragmenti.',
    category: ItemCategory.EKIPMAN,
    rarity: ItemRarity.DESTANSI,
    icon: '🛡',
    quantity: 3,
    effects: [
      { label: 'Savunma', value: '+35', positive: true },
      { label: 'HP', value: '+500', positive: true },
      { label: 'Hız', value: '-5', positive: false },
    ],
    acquiredAt: Date.now() - 600000,
    canUse: true,
    canSell: true,
    sellValue: 200,
  },
  {
    id: 'item-005',
    name: 'Yıldız Parçalayan Kılıç',
    description: 'Efsanevi silah. Güneşleri yarabilir güçte plazma bıçağı.',
    category: ItemCategory.EKIPMAN,
    rarity: ItemRarity.EFSANEVI,
    icon: '⚔',
    quantity: 1,
    effects: [
      { label: 'Saldırı', value: '+120', positive: true },
      { label: 'Kritik Şans', value: '+25%', positive: true },
      { label: 'Plazma Hasar', value: '+60', positive: true },
    ],
    acquiredAt: Date.now() - 900000,
    canUse: true,
    canSell: false,
    sellValue: 0,
  },
  {
    id: 'item-006',
    name: 'Gelişim Kristali',
    description: 'Birim seviyesini anında artırır. Nadir keşif ödülü.',
    category: ItemCategory.YUKSELTME,
    rarity: ItemRarity.NADIR,
    icon: '💎',
    quantity: 7,
    effects: [{ label: 'Birim Seviyesi', value: '+3', positive: true }],
    acquiredAt: Date.now() - 1800000,
    canUse: true,
    canSell: true,
    sellValue: 75,
  },
  {
    id: 'item-007',
    name: 'Mutasyon Serumu',
    description: 'Zerg birimlerini efsanevi forma dönüştürür.',
    category: ItemCategory.YUKSELTME,
    rarity: ItemRarity.DESTANSI,
    icon: '🧬',
    quantity: 2,
    effects: [
      { label: 'Mutasyon Seviyesi', value: '+1', positive: true },
      { label: 'Biyolüminesan Güç', value: '+40%', positive: true },
    ],
    acquiredAt: Date.now() - 3600000,
    canUse: true,
    canSell: true,
    sellValue: 300,
  },
  {
    id: 'item-008',
    name: 'Kara Delik Bombası',
    description: 'Özel silah. Geniş alana yıkım verir. Tek kullanımlık.',
    category: ItemCategory.OZEL,
    rarity: ItemRarity.EFSANEVI,
    icon: '💣',
    quantity: 1,
    effects: [
      { label: 'Alan Hasarı', value: '2500', positive: false },
      { label: 'Etki Yarıçapı', value: '5 tile', positive: true },
    ],
    acquiredAt: Date.now() - 7200000,
    canUse: true,
    canSell: false,
    sellValue: 0,
  },
  {
    id: 'item-009',
    name: 'Nebula Taşı',
    description: 'Mistik enerjiyle dolu uzay taşı. Lonca törenlerinde kullanılır.',
    category: ItemCategory.OZEL,
    rarity: ItemRarity.YAYGIN,
    icon: '🌌',
    quantity: 12,
    effects: [{ label: 'Lonca XP', value: '+50', positive: true }],
    acquiredAt: Date.now() - 10800000,
    canUse: true,
    canSell: true,
    sellValue: 20,
  },
  {
    id: 'item-010',
    name: 'Çelik Cıvata',
    description: 'Otomat birimlerinin onarımında kullanılan standart parça.',
    category: ItemCategory.KAYNAK,
    rarity: ItemRarity.SIRADAN,
    icon: '⚙',
    quantity: 300,
    effects: [{ label: 'Onarım Gücü', value: '+50 HP', positive: true }],
    acquiredAt: Date.now() - 14400000,
    canUse: true,
    canSell: true,
    sellValue: 3,
  },
  {
    id: 'item-011',
    name: 'Ruh Parçası',
    description: 'Şeytan birimlerinin esansı. Karanlık güçleri besler.',
    category: ItemCategory.KAYNAK,
    rarity: ItemRarity.NADIR,
    icon: '👁',
    quantity: 9,
    effects: [
      { label: 'Karanlık Güç', value: '+25', positive: true },
      { label: 'Dehşet Menzili', value: '+2 tile', positive: true },
    ],
    acquiredAt: Date.now() - 18000000,
    canUse: true,
    canSell: true,
    sellValue: 60,
  },
  {
    id: 'item-012',
    name: 'Evren Çekirdeği',
    description: 'Sonsuzluk Çekirdeği yapısının anahtarı. Tek adette bulunur.',
    category: ItemCategory.OZEL,
    rarity: ItemRarity.EFSANEVI,
    icon: '✦',
    quantity: 1,
    effects: [
      { label: 'Çağ Açma', value: 'Çağ 6', positive: true },
      { label: 'Tüm Üretim', value: '+15%', positive: true },
    ],
    acquiredAt: Date.now() - 86400000,
    canUse: false,
    canSell: false,
    sellValue: 0,
  },
];
