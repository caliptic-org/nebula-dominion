export type CosmeticCategory = 'skin' | 'frame' | 'title' | 'effect';
export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  price?: number;
  isOwned: boolean;
  isEquipped: boolean;
  previewImage?: string;
  icon: string;
  description: string;
  rarityColor: string;
  rarityGlow: string;
}

export const RARITY_META: Record<CosmeticRarity, { label: string; color: string; glow: string; border: string }> = {
  common:    { label: 'Yaygın',   color: '#a0a8c0', glow: 'rgba(160,168,192,0.25)', border: 'rgba(160,168,192,0.20)' },
  rare:      { label: 'Nadir',    color: '#4a9eff', glow: 'rgba(74,158,255,0.30)',  border: 'rgba(74,158,255,0.35)'  },
  epic:      { label: 'Destansı', color: '#cc00ff', glow: 'rgba(204,0,255,0.30)',   border: 'rgba(204,0,255,0.40)'   },
  legendary: { label: 'Efsanevi', color: '#ffc832', glow: 'rgba(255,200,50,0.35)',  border: 'rgba(255,200,50,0.50)'  },
};

export const DEMO_COSMETICS: CosmeticItem[] = [
  // ── Skinler ─────────────────────────────────────────────────────────────
  {
    id: 'skin-default',      name: 'Standart Zırh',    category: 'skin',   rarity: 'common',
    isOwned: true, isEquipped: true,  price: undefined,
    icon: '⚔️', description: 'Standart komutan görünümü.',
    rarityColor: '#a0a8c0', rarityGlow: 'rgba(160,168,192,0.25)',
    previewImage: '/assets/characters/insan/voss.png',
  },
  {
    id: 'skin-shadow',       name: 'Gölge Komutan',    category: 'skin',   rarity: 'rare',
    isOwned: true, isEquipped: false, price: undefined,
    icon: '🌑', description: 'Gece operasyonları için tasarlanmış stealth zırhı.',
    rarityColor: '#4a9eff', rarityGlow: 'rgba(74,158,255,0.30)',
    previewImage: '/assets/characters/insan/chen.png',
  },
  {
    id: 'skin-void',         name: 'Void Şövalyesi',   category: 'skin',   rarity: 'epic',
    isOwned: false, isEquipped: false, price: 300,
    icon: '🔮', description: 'Karanlık enerjiden oluşturulmuş destansı zırh.',
    rarityColor: '#cc00ff', rarityGlow: 'rgba(204,0,255,0.30)',
    previewImage: '/assets/characters/insan/reyes.png',
  },
  {
    id: 'skin-crimson',      name: 'Kızıl Savaş Lordu', category: 'skin', rarity: 'legendary',
    isOwned: false, isEquipped: false, price: 800,
    icon: '🔴', description: 'Efsanevi Kızıl Savaşçıların gizemli zırhı.',
    rarityColor: '#ffc832', rarityGlow: 'rgba(255,200,50,0.35)',
    previewImage: '/assets/characters/insan/kovacs.png',
  },
  {
    id: 'skin-stellar',      name: 'Yıldız Pilotu',    category: 'skin',   rarity: 'rare',
    isOwned: false, isEquipped: false, price: 150,
    icon: '🚀', description: 'Nebula uçuş kıyafeti — hafif ve aerodinamik.',
    rarityColor: '#4a9eff', rarityGlow: 'rgba(74,158,255,0.30)',
  },
  {
    id: 'skin-arc',          name: 'Arc Trooper',       category: 'skin',  rarity: 'common',
    isOwned: true, isEquipped: false, price: undefined,
    icon: '⚡', description: 'Hızlı saldırı için optimize edilmiş hafif zırh.',
    rarityColor: '#a0a8c0', rarityGlow: 'rgba(160,168,192,0.25)',
  },

  // ── Çerçeveler ──────────────────────────────────────────────────────────
  {
    id: 'frame-default',     name: 'Standart Çerçeve', category: 'frame',  rarity: 'common',
    isOwned: true, isEquipped: true,  price: undefined,
    icon: '▫️', description: 'Minimal nebula çerçevesi.',
    rarityColor: '#a0a8c0', rarityGlow: 'rgba(160,168,192,0.25)',
  },
  {
    id: 'frame-nebula',      name: 'Nebula Sınırı',    category: 'frame',  rarity: 'rare',
    isOwned: true, isEquipped: false, price: undefined,
    icon: '🌌', description: 'Yıldız gazından ilham alan mavi-mor gradient çerçeve.',
    rarityColor: '#4a9eff', rarityGlow: 'rgba(74,158,255,0.30)',
  },
  {
    id: 'frame-plasma',      name: 'Plazma Devresi',   category: 'frame',  rarity: 'rare',
    isOwned: false, isEquipped: false, price: 100,
    icon: '⚡', description: 'Elektrik akımının izinden şekillenen endüstriyel çerçeve.',
    rarityColor: '#4a9eff', rarityGlow: 'rgba(74,158,255,0.30)',
  },
  {
    id: 'frame-golden',      name: 'Altın Mühür',      category: 'frame',  rarity: 'legendary',
    isOwned: false, isEquipped: false, price: 600,
    icon: '🏅', description: 'Efsanevi komutanların statüsünü simgeleyen altın çerçeve.',
    rarityColor: '#ffc832', rarityGlow: 'rgba(255,200,50,0.35)',
  },
  {
    id: 'frame-manga',       name: 'Manga Panel',      category: 'frame',  rarity: 'epic',
    isOwned: false, isEquipped: false, price: 250,
    icon: '🖼️', description: 'Manga çizgi romanından fırlamış siyah-beyaz çerçeve.',
    rarityColor: '#cc00ff', rarityGlow: 'rgba(204,0,255,0.30)',
  },

  // ── Unvanlar ────────────────────────────────────────────────────────────
  {
    id: 'title-default',     name: 'Komutan',          category: 'title',  rarity: 'common',
    isOwned: true, isEquipped: true,  price: undefined,
    icon: '🎖️', description: 'Standart başlangıç unvanı.',
    rarityColor: '#a0a8c0', rarityGlow: 'rgba(160,168,192,0.25)',
  },
  {
    id: 'title-conqueror',   name: 'Galaksi Fatihi',   category: 'title',  rarity: 'rare',
    isOwned: true, isEquipped: false, price: undefined,
    icon: '🌠', description: 'Galaksinin her köşesini dolaşmış savaşçıya verilir.',
    rarityColor: '#4a9eff', rarityGlow: 'rgba(74,158,255,0.30)',
  },
  {
    id: 'title-darklord',    name: 'Karanlık Lord',    category: 'title',  rarity: 'epic',
    isOwned: false, isEquipped: false, price: 200,
    icon: '💀', description: 'Karanlık güçlere hükmedenler için ayrılmış unvan.',
    rarityColor: '#cc00ff', rarityGlow: 'rgba(204,0,255,0.30)',
  },
  {
    id: 'title-legendary',   name: 'Efsanevi Savaşçı', category: 'title', rarity: 'legendary',
    isOwned: false, isEquipped: false, price: 500,
    icon: '🏆', description: 'Yalnızca tarihe geçen komutanlara tanınan efsanevi unvan.',
    rarityColor: '#ffc832', rarityGlow: 'rgba(255,200,50,0.35)',
  },
  {
    id: 'title-neon',        name: 'Neon Şövalye',     category: 'title',  rarity: 'rare',
    isOwned: false, isEquipped: false, price: 120,
    icon: '💡', description: 'Cyberpunk sokak savaşçılarının gizli lakabı.',
    rarityColor: '#4a9eff', rarityGlow: 'rgba(74,158,255,0.30)',
  },

  // ── Efektler ─────────────────────────────────────────────────────────────
  {
    id: 'effect-none',       name: 'Efekt Yok',        category: 'effect', rarity: 'common',
    isOwned: true, isEquipped: true,  price: undefined,
    icon: '○', description: 'Temiz, efektsiz görünüm.',
    rarityColor: '#a0a8c0', rarityGlow: 'rgba(160,168,192,0.25)',
  },
  {
    id: 'effect-static',     name: 'Statik Yük',       category: 'effect', rarity: 'common',
    isOwned: true, isEquipped: false, price: undefined,
    icon: '⚡', description: 'Hafif elektrostatik parçacık efekti.',
    rarityColor: '#a0a8c0', rarityGlow: 'rgba(160,168,192,0.25)',
  },
  {
    id: 'effect-nebula',     name: 'Nebula Parçacıkları', category: 'effect', rarity: 'rare',
    isOwned: false, isEquipped: false, price: 180,
    icon: '✨', description: 'Mavi-mor nebula tozunu andıran yüzen parçacıklar.',
    rarityColor: '#4a9eff', rarityGlow: 'rgba(74,158,255,0.30)',
  },
  {
    id: 'effect-darkaura',   name: 'Karanlık Aura',    category: 'effect', rarity: 'epic',
    isOwned: false, isEquipped: false, price: 350,
    icon: '🌑', description: 'Karakteri saran karanlık enerji dalgaları.',
    rarityColor: '#cc00ff', rarityGlow: 'rgba(204,0,255,0.30)',
  },
  {
    id: 'effect-halo',       name: 'Efsanevi Hale',    category: 'effect', rarity: 'legendary',
    isOwned: false, isEquipped: false, price: 700,
    icon: '👑', description: 'Efsanevi statüyü gösteren altın ışık halkası.',
    rarityColor: '#ffc832', rarityGlow: 'rgba(255,200,50,0.35)',
  },
];
