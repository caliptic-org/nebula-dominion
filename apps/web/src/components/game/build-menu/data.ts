import { Race } from '@/types/units';
import { STRUCTURE_ASSETS } from '@/lib/assets';

export type BuildState = 'idle' | 'building' | 'maxed';

export interface BuildItem {
  id: string;
  name: string;
  description: string;
  category: number;
  level: number;
  maxLevel: number;
  costA: number;
  costB: number;
  durationSeconds: number;
  state: BuildState;
  /** 0..1 progress while state === 'building'. */
  progress?: number;
  locked: boolean;
  /** Optional precondition shown on the lock chip. */
  unlockHint?: string;
  /** Iconography slot — emoji glyph rendered inside the 56×56 race-tinted tile. */
  glyph: string;
  /** Optional thumbnail image used when no race-specific art is available. */
  thumbnail?: string;
}

export interface RaceCatalog {
  /** Race-specific catalogue title shown in the header. */
  title: string;
  /** Race-specific action verb ("İnşaa", "Mutasyon", …). */
  actionVerb: string;
  /** Four flavour-specific category labels. */
  tabs: [string, string, string, string];
  /** Display name + icon kind for the dual resource cost. */
  resourceA: { name: string; icon: ResourceIconKind };
  resourceB: { name: string; icon: ResourceIconKind };
  items: BuildItem[];
}

export type ResourceIconKind =
  | 'mineral' | 'gas' | 'energy'
  | 'biomass' | 'genome' | 'meat' | 'blood'
  | 'soul' | 'darkmatter' | 'science';

export const FILTER_KEYS = ['all', 'open', 'locked', 'building'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export const FILTER_LABELS: Record<FilterKey, string> = {
  all:      'Tümü',
  open:     'Açık',
  locked:   'Kilitli',
  building: 'İnşada',
};

export const RACE_CATALOGS: Record<Race, RaceCatalog> = {
  [Race.INSAN]: {
    title: 'İnşa Kataloğu',
    actionVerb: 'İnşaa',
    tabs: ['ALTYAPI', 'ASKERİ', 'BİLİM', 'GENETİK'],
    resourceA: { name: 'Kredi', icon: 'mineral' },
    resourceB: { name: 'Bilim', icon: 'science' },
    items: [
      { id: 'ins-cmd',  name: 'Komuta Üssü',       description: 'Ana yapı · birim hızı +18%', category: 0, level: 9, maxLevel: 15, costA: 3200, costB: 1200, durationSeconds: 1800, state: 'idle',     locked: false, glyph: '⌂', thumbnail: STRUCTURE_ASSETS.yutucu_yildiz_akademisi },
      { id: 'ins-rct',  name: 'Reaktör Modülü',    description: 'Enerji üretir',              category: 0, level: 6, maxLevel: 12, costA: 1400, costB:  340, durationSeconds:  720, state: 'idle',     locked: false, glyph: '⚛' },
      { id: 'ins-brk',  name: 'Kışla I',           description: 'Birim eğitim hattı',         category: 1, level: 5, maxLevel: 10, costA:  680, costB:  140, durationSeconds:  420, state: 'building', progress: 0.48, locked: false, glyph: '⚔' },
      { id: 'ins-mech', name: 'Mecha Atölyesi',    description: 'Yürüyücü inşaatı',           category: 1, level: 3, maxLevel: 10, costA: 1200, costB:  420, durationSeconds:  900, state: 'idle',     locked: false, glyph: '⚙' },
      { id: 'ins-sci',  name: 'Bilim Akademisi',   description: 'Araştırma kapasitesi',       category: 2, level: 4, maxLevel: 10, costA:  900, costB:  640, durationSeconds:  900, state: 'idle',     locked: false, glyph: '⚗', thumbnail: STRUCTURE_ASSETS.yutucu_yildiz_akademisi },
      { id: 'ins-ant',  name: 'Subspace Anteni',   description: 'Galaksi haberleşmesi',       category: 2, level: 0, maxLevel: 8,  costA: 2400, costB: 1200, durationSeconds: 1440, state: 'idle',     locked: true,  unlockHint: 'Akademi Lv.6', glyph: '◬' },
      { id: 'ins-gen',  name: 'Genetik Lab',       description: 'Tier-4 birimler',            category: 3, level: 0, maxLevel: 8,  costA: 4800, costB: 2400, durationSeconds: 2700, state: 'idle',     locked: true,  unlockHint: 'Akademi Lv.8', glyph: '⌬' },
      { id: 'ins-clone',name: 'Klon Tankı',        description: 'Birim çoğaltma',             category: 3, level: 0, maxLevel: 6,  costA: 3600, costB: 1800, durationSeconds: 2400, state: 'idle',     locked: true,  unlockHint: 'Genetik Lab', glyph: '⬡' },
    ],
  },
  [Race.ZERG]: {
    title: 'Mutasyon Çukuru',
    actionVerb: 'Mutasyon',
    tabs: ['KOVAN', 'EVRİM', 'GENOM', 'EMME'],
    resourceA: { name: 'Biyokütle', icon: 'biomass' },
    resourceB: { name: 'Genom',     icon: 'genome' },
    items: [
      { id: 'zrg-hive',  name: 'Kovan Çekirdeği',   description: 'Ana yapı · biyokütle +22%', category: 0, level: 8, maxLevel: 15, costA: 2800, costB: 1100, durationSeconds: 1500, state: 'idle',     locked: false, glyph: '◉', thumbnail: STRUCTURE_ASSETS.kovan_kalbi },
      { id: 'zrg-pool',  name: 'Biyokütle Havuzu',  description: 'Salgı depo',                category: 0, level: 5, maxLevel: 10, costA: 1100, costB:  220, durationSeconds:  600, state: 'idle',     locked: false, glyph: '~' },
      { id: 'zrg-mut',   name: 'Mutasyon Çukuru',   description: 'Birim üretimi',             category: 1, level: 6, maxLevel: 10, costA:  580, costB:  180, durationSeconds:  300, state: 'building', progress: 0.62, locked: false, glyph: '✶', thumbnail: STRUCTURE_ASSETS.mutasyon_cukuru },
      { id: 'zrg-sal',   name: 'Salgı Bezi',        description: 'Birim hızı +12%',           category: 1, level: 3, maxLevel: 10, costA:  720, costB:  300, durationSeconds:  540, state: 'idle',     locked: false, glyph: '⌗' },
      { id: 'zrg-gen',   name: 'Genom Tümseği',     description: 'Mutasyon hızı',             category: 2, level: 4, maxLevel: 10, costA:  840, costB:  540, durationSeconds:  720, state: 'idle',     locked: false, glyph: '⊛' },
      { id: 'zrg-brain', name: 'Beyin Yumurta',     description: 'Lider sürü çağrısı',        category: 2, level: 0, maxLevel: 6,  costA: 2200, costB: 1800, durationSeconds: 1800, state: 'idle',     locked: true,  unlockHint: 'Genom Lv.6', glyph: '⌖' },
      { id: 'zrg-eat',   name: 'Yutucu Tümsek',     description: 'Kadim güç emme',            category: 3, level: 0, maxLevel: 8,  costA: 3600, costB: 1600, durationSeconds: 2400, state: 'idle',     locked: true,  unlockHint: 'Kovan Lv.10', glyph: '⊗', thumbnail: STRUCTURE_ASSETS.yutucu_tumsegi },
      { id: 'zrg-warp',  name: 'Subspace Damarı',   description: 'Boyut seyahati',            category: 3, level: 0, maxLevel: 6,  costA: 4400, costB: 3200, durationSeconds: 3000, state: 'idle',     locked: true,  unlockHint: 'Yutucu Lv.4', glyph: '∞' },
    ],
  },
  [Race.OTOMAT]: {
    title: 'Montaj Mimarisi',
    actionVerb: 'Derleme',
    tabs: ['HUB', 'ÜRETİM', 'MANTIK', 'KADİM'],
    resourceA: { name: 'Mineral', icon: 'mineral' },
    resourceB: { name: 'Hesap',   icon: 'energy' },
    items: [
      { id: 'otm-core',  name: 'Sonsuzluk Çekirdeği', description: 'Ana yapı · hesap +18%',  category: 0, level: 9, maxLevel: 15, costA: 3400, costB: 1500, durationSeconds: 1800, state: 'idle',     locked: false, glyph: '◆', thumbnail: STRUCTURE_ASSETS.sonsuzluk_cekirdegi },
      { id: 'otm-data',  name: 'Veri Kaynağı',        description: 'Hesap üretir',           category: 0, level: 5, maxLevel: 10, costA: 1200, costB:  600, durationSeconds:  720, state: 'idle',     locked: false, glyph: '▤' },
      { id: 'otm-asm',   name: 'Montaj Hattı',        description: 'Birim üretimi',          category: 1, level: 4, maxLevel: 10, costA:  680, costB:  240, durationSeconds:  480, state: 'building', progress: 0.30, locked: false, glyph: '▥' },
      { id: 'otm-fab',   name: 'Drone Fabrikası',     description: 'Hızlı işçi üretimi',     category: 1, level: 2, maxLevel: 10, costA:  820, costB:  320, durationSeconds:  540, state: 'idle',     locked: false, glyph: '◇' },
      { id: 'otm-mtx',   name: 'Mantık Matrisi',      description: 'Araştırma',              category: 2, level: 4, maxLevel: 10, costA: 1100, costB:  780, durationSeconds:  900, state: 'idle',     locked: false, glyph: '▦' },
      { id: 'otm-cyb',   name: 'Sibernetik Çekirdek', description: 'Hava silah araştırma',   category: 2, level: 1, maxLevel: 10, costA: 1600, costB: 1100, durationSeconds: 1200, state: 'idle',     locked: false, glyph: '⬢' },
      { id: 'otm-vault', name: 'Cihaz Hazinesi',      description: 'Kadim teknoloji',        category: 3, level: 0, maxLevel: 8,  costA: 4200, costB: 2600, durationSeconds: 2700, state: 'idle',     locked: true,  unlockHint: 'Mantık Lv.8', glyph: '◈' },
      { id: 'otm-warp',  name: 'Subspace Çözücü',     description: 'Boyutlar arası',         category: 3, level: 0, maxLevel: 6,  costA: 5000, costB: 3400, durationSeconds: 3000, state: 'idle',     locked: true,  unlockHint: 'Hazine Lv.4', glyph: '◊' },
    ],
  },
  [Race.CANAVAR]: {
    title: 'Av Mevkii',
    actionVerb: 'Kurulum',
    tabs: ['TAHT', 'AV', 'ATA', 'YIRTIK'],
    resourceA: { name: 'Vahşi Et', icon: 'meat' },
    resourceB: { name: 'Kan Özü',  icon: 'blood' },
    items: [
      { id: 'cnv-thr',   name: 'Alfa Tahtı',       description: 'Ana yapı · sürü gücü +20%', category: 0, level: 8, maxLevel: 15, costA: 2600, costB: 1000, durationSeconds: 1500, state: 'idle',     locked: false, glyph: '⛧', thumbnail: STRUCTURE_ASSETS.atalar_magarasi },
      { id: 'cnv-alt',   name: 'Hiyerarşi Sunağı', description: 'Yeni kan akışı',            category: 0, level: 4, maxLevel: 10, costA: 1300, costB:  520, durationSeconds:  900, state: 'idle',     locked: false, glyph: '♆' },
      { id: 'cnv-hunt',  name: 'Av Kampı',         description: 'Et üretimi · birim eğitim', category: 1, level: 5, maxLevel: 10, costA:  720, costB:  220, durationSeconds:  360, state: 'building', progress: 0.75, locked: false, glyph: '⚔' },
      { id: 'cnv-pit',   name: 'Vahşi Çukur',      description: 'Yırtıcı eğitim',            category: 1, level: 4, maxLevel: 10, costA:  860, costB:  320, durationSeconds:  540, state: 'idle',     locked: false, glyph: '☠', thumbnail: STRUCTURE_ASSETS.yutucu_tumsegi },
      { id: 'cnv-anc',   name: 'Atalar Sunağı',    description: 'Kan Özü üretimi',           category: 2, level: 3, maxLevel: 10, costA: 1100, costB:  640, durationSeconds:  780, state: 'idle',     locked: false, glyph: '⚑' },
      { id: 'cnv-cave',  name: 'Atalar Mağarası',  description: 'Kadim yetenekler',          category: 2, level: 0, maxLevel: 6,  costA: 3400, costB: 1800, durationSeconds: 2400, state: 'idle',     locked: true,  unlockHint: 'Sunak Lv.6', glyph: '⌬' },
      { id: 'cnv-rift',  name: 'Boyut Yarığı',     description: 'Subspace av',               category: 3, level: 0, maxLevel: 6,  costA: 4400, costB: 3000, durationSeconds: 3000, state: 'idle',     locked: true,  unlockHint: 'Mağara Lv.4', glyph: '⛧' },
      { id: 'cnv-tot',   name: 'Kan Totemi',       description: 'Bölgesel saldırı',          category: 3, level: 0, maxLevel: 8,  costA: 2400, costB: 1400, durationSeconds: 1500, state: 'idle',     locked: true,  unlockHint: 'Av Kampı Lv.8', glyph: '☥' },
    ],
  },
  [Race.SEYTAN]: {
    title: 'Pakt Tapınağı',
    actionVerb: 'Çağırım',
    tabs: ['TAHT', 'RUH', 'LANET', 'PAKT'],
    resourceA: { name: 'Ruh Özü',      icon: 'soul' },
    resourceB: { name: 'Karanlık Md.', icon: 'darkmatter' },
    items: [
      { id: 'sey-thr',   name: 'Karanlık Taht',   description: 'Ana yapı · pakt menzili +25%', category: 0, level: 9, maxLevel: 15, costA: 3000, costB: 1300, durationSeconds: 1800, state: 'idle',     locked: false, glyph: '✠', thumbnail: STRUCTURE_ASSETS.karanlik_mahkeme },
      { id: 'sey-exile', name: 'Sürgün Mahkemesi',description: 'Borç tahsili',                 category: 0, level: 4, maxLevel: 10, costA: 1200, costB:  580, durationSeconds:  840, state: 'idle',     locked: false, glyph: '✦' },
      { id: 'sey-soul',  name: 'Ruh Toplayıcı',   description: 'Ruh Özü üretir',               category: 1, level: 5, maxLevel: 10, costA: 1000, costB:  340, durationSeconds:  660, state: 'idle',     locked: false, glyph: '✤' },
      { id: 'sey-core',  name: 'Ruh Çekirdeği',   description: 'Birim çağırma',                category: 1, level: 3, maxLevel: 10, costA:  860, costB:  420, durationSeconds:  480, state: 'building', progress: 0.18, locked: false, glyph: '✺' },
      { id: 'sey-tmp',   name: 'Lanet Tapınağı',  description: 'Pakt yetenekleri',             category: 2, level: 6, maxLevel: 10, costA: 1300, costB:  720, durationSeconds:  900, state: 'idle',     locked: false, glyph: '☩', thumbnail: STRUCTURE_ASSETS.lanet_tapinagi },
      { id: 'sey-wing',  name: 'Kanat Çağrısı',   description: 'Hava lanet birimi',            category: 2, level: 0, maxLevel: 8,  costA: 2800, costB: 1500, durationSeconds: 1800, state: 'idle',     locked: true,  unlockHint: 'Tapınak Lv.8', glyph: '⚜' },
      { id: 'sey-pact',  name: 'Pakt Sembolü',    description: 'Pakt menzil bonusu',           category: 3, level: 3, maxLevel: 10, costA:  940, costB:  520, durationSeconds:  720, state: 'idle',     locked: false, glyph: '⌘' },
      { id: 'sey-grim',  name: 'Yasak Grimoire',  description: 'Kadim yetenekler',             category: 3, level: 0, maxLevel: 6,  costA: 4400, costB: 3000, durationSeconds: 2700, state: 'idle',     locked: true,  unlockHint: 'Pakt Sembolü Lv.6', glyph: '⛧' },
    ],
  },
};
