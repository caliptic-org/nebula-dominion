/* Nebula Dominion — Foundation tokens (canonical)
 *
 * Source of truth for race themes (oklch palettes, sigil keys, units, buildings,
 * commanders, story strings) and the universal `ND` token object (surface, text,
 * border, fonts). Mirrors handoff/nebula-dominion/project/nd-tokens.jsx.
 *
 * Consumers:
 *   import { RACES, ND, type RaceKey, type RaceTheme } from '@/lib/nd-tokens';
 *
 * The legacy `NDRace` / `NDRaceKey` names remain available via aliases for
 * existing screens under src/components/handoff/.
 */

import type { Race } from '@/types/units';

/* ── Race key ─────────────────────────────────────────────────────────── */

export const RACE_KEYS = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'] as const;
export type RaceKey = (typeof RACE_KEYS)[number];

/* ── Resource & sigil identifiers ─────────────────────────────────────── */

export type ResourceIconKind =
  | 'cred' | 'sci' | 'bio' | 'gen' | 'min' | 'cpu'
  | 'meat' | 'blood' | 'soul' | 'dark' | 'crystal' | 'energy' | 'pop'
  /** Science (◈) — cross-race research currency.  Distinct kind so the
   *  HUD's 4th pill can render through the same ResPill/ResIcon path as
   *  the other three (button + onClick + popover) instead of an inline
   *  div, keeping the pill row structurally uniform. */
  | 'science';

/**
 * Backend resource field a race-themed slot is wired to.
 *
 * Every race exposes 2 race-flavoured pills + 1 universal energy pill in the
 * HUD. To eliminate any confusion about *what value is actually being shown*
 * each Resource declares the concrete game-server snapshot field it reads
 * from. This makes the binding chain auditable from the type level:
 *
 *   race.resourceA.field === 'mineral' → pill shows snapshot.mineral
 *   race.resourceB.field === 'gas'     → pill shows snapshot.gas
 *
 * Without this, the wiring lived only in useHudState.ts and a player could
 * see "Bilim 75" (insan's slot B, labelled "Science") not realising the
 * underlying value was actually `gas` — there was no compile-time link
 * between the label and the field.
 */
export type ResourceField = 'mineral' | 'gas' | 'energy' | 'science';

export interface Resource {
  name: string;
  icon: ResourceIconKind;
  /** Which backend ResourceSnapshot field this slot reads from. */
  field: ResourceField;
}

/** Sigil identifiers as authored in the design handoff. */
export type SigilKey = 'TRIDENT' | 'HIVE' | 'CORE' | 'FANG' | 'SIGIL';

/* ── Race shape ───────────────────────────────────────────────────────── */

export interface RaceUnit { n: string; t: number }
export interface RaceBuild {
  n: string;
  t: string;
  locked: boolean;
  /**
   * URL-safe identifier used by deep links (e.g. `/base/build?focus=<slug>`)
   * and by the SLUG_TO_BACKEND_TYPE map that joins race-flavoured slots to
   * the generic backend BuildingType enum. Optional because legacy callers
   * may construct mock RaceBuild objects without it.
   */
  slug?: string;
}
export interface RaceCommander { n: string; t: string; lv: number; tier: string; skill: string }

export interface RaceTheme {
  key: RaceKey;
  name: string;
  short: string;
  motto: string;
  /** Primary oklch colour, used for race-tinted surfaces. */
  primary: string;
  /** Slightly dimmer primary, for gradients & low-emphasis fills. */
  primaryDim: string;
  /** Glow / accent oklch colour for drop-shadows and outer rings. */
  glow: string;
  sigil: SigilKey;
  resourceA: Resource;
  resourceB: Resource;
  avatar: string;
  title: string;
  handle: string;
  allianceTag: string;
  allianceName: string;
  capitalBase: string;
  enemyRace: RaceKey;
  units: RaceUnit[];
  buildings: RaceBuild[];
  commanders: RaceCommander[];
  storyTitle: string;
  storyAct1: string;
  storyAct2: string;
  /** Story-bible §1.2 "Kozmik Yankı" interpretation per race — the cosmic
   *  event that wakes them up at game start. Surfaced as the first scene of
   *  the race-confirm awakening sequence so the player learns *why* their
   *  race exists in the post-Kozmik-Yankı era before they hit /base. */
  kozmikYanki: string;
  capitalDescription: string;
  seasonGoal: string;
}

/* ── Universal tokens ─────────────────────────────────────────────────── */

export const ND = {
  bg:           '#06080F',
  bgDeep:       '#03050B',
  surface:      'rgba(18, 24, 42, 0.78)',
  surfaceSolid: '#0E1426',
  surfaceHi:    'rgba(28, 38, 64, 0.85)',
  border:       'rgba(120, 160, 220, 0.18)',
  borderHi:     'rgba(120, 200, 255, 0.36)',
  text:         'oklch(0.96 0.01 240)',
  textDim:      'oklch(0.72 0.02 240)',
  textMute:     'oklch(0.52 0.02 240)',
  /** Inverted text colour for use on a race-primary fill (buttons, level chips). */
  textInverted: '#0A0E1A',
  /** Soft white fade end-stop for connector / progress gradients. */
  lineFade:     'rgba(255, 255, 255, 0.2)',
  danger:       'oklch(0.65 0.22 25)',
  ok:           'oklch(0.72 0.16 145)',
  warn:         'oklch(0.80 0.15 80)',
  display:      'var(--font-nd-display), "Chakra Petch", "Rajdhani", system-ui, sans-serif',
  body:         'var(--font-nd-body), "Inter", system-ui, sans-serif',
  mono:         'var(--font-nd-mono), "JetBrains Mono", ui-monospace, monospace',
  /** Cool violet accent used in non-race-specific nebula gradients. */
  nebulaAccent: 'oklch(0.55 0.18 280)',
  /**
   * Translucent scrim layer over content, anchored to the deep base bg
   * (`#06080F`). Use for sticky headers, action bars, slot empties and other
   * surfaces that need to dim what is behind without introducing a new
   * arbitrary alpha. Common alphas: 0.55, 0.6, 0.65, 0.92, 0.94, 0.96.
   */
  scrim:        (alpha: number) => `rgba(6, 8, 15, ${alpha})`,
  radii: { sm: 3, md: 6, lg: 12, pill: 999 },
  spacing: { xxs: 2, xs: 4, sm: 6, md: 10, lg: 16, xl: 24 },
} as const;

export type NDTokens = typeof ND;

/* ── Race themes ──────────────────────────────────────────────────────── */

export const RACES: Record<RaceKey, RaceTheme> = {
  insan: {
    key: 'insan',
    name: 'İnsanlar',
    short: 'İNS',
    motto: 'Bilim · İrade · Kardeşlik',
    primary: 'oklch(0.82 0.16 80)',
    primaryDim: 'oklch(0.62 0.13 80)',
    glow: 'oklch(0.85 0.18 80)',
    sigil: 'TRIDENT',
    // Slot A (mineral): "Kredi" — primary build/train currency.
    // Slot B (gas): "Yakıt" (fuel) — was previously labelled "Bilim" (science)
    //   which collided with the literal backend `science` field that's
    //   earned from battles + garrisoned galaxy nodes. Renamed so the HUD
    //   label honestly reflects the underlying gas value. Icon stays as
    //   `sci` (circle-with-dot) for visual continuity — it now reads as a
    //   "fuel cell" cross-section rather than an atom/research symbol.
    resourceA: { name: 'Kredi', icon: 'cred', field: 'mineral' },
    resourceB: { name: 'Yakıt', icon: 'sci',  field: 'gas'     },
    avatar: 'Kmt. A. Voss',
    title: 'Yutucu Yıldız Varisi',
    handle: 'voss.cmd',
    allianceTag: 'YZH',
    allianceName: 'Yutucu Yıldız Hanedanlığı',
    capitalBase: 'KAEL-7',
    enemyRace: 'zerg',
    units: [
      { n: 'Marine',          t: 1 },
      { n: 'Sniper',          t: 2 },
      { n: 'Engineer',        t: 2 },
      { n: 'Mecha Walker',    t: 3 },
      { n: 'Genetic Warrior', t: 4 },
      { n: 'Captain',         t: 5 },
    ],
    buildings: [
      { slug: 'komuta_ussu',     n: 'Komuta Üssü',     t: 'Ana yapı',             locked: false },
      { slug: 'reaktor_modulu',  n: 'Reaktör Modülü',  t: 'Enerji üretir',        locked: false },
      // Yakıt Rafinerisi — gas üreten bina.  Önce hiçbir İnsan slot'u
      // gas_refinery'ye map etmiyordu, dolayısıyla insan oyuncusu hiç
      // Yakıt biriktiremiyordu (HUD 0/0/0 görünüyordu).  Erken oyun
      // economy'sinin çalışması için unlocked, capital + reaktör'den
      // hemen sonra inşa edilebilir.
      { slug: 'yakit_rafinerisi',n: 'Yakıt Rafinerisi',t: 'Yakıt üretir',         locked: false },
      { slug: 'kisla',           n: 'Kışla',           t: 'Birim eğitimi',        locked: false },
      { slug: 'bilim_akademisi', n: 'Bilim Akademisi', t: 'Araştırma',            locked: false },
      { slug: 'subspace_anteni', n: 'Subspace Anteni', t: 'Galaksi haberleşmesi', locked: true  },
      { slug: 'genetik_lab',     n: 'Genetik Lab',     t: 'Tier-4 birimleri',     locked: true  },
    ],
    commanders: [
      { n: 'Kmt. Aleksander Voss',  t: 'Genetik Savaşçı', lv: 24, tier: 'BAŞ KOMUTAN', skill: 'Tüm filo +12% hasar' },
      { n: 'Dr. Elara Chen',        t: 'Baş Bilim Adamı', lv: 14, tier: 'TIER 2',      skill: 'Bilim +22%' },
      { n: 'General Marcus Reyes',  t: 'Askeri Komutan',  lv:  9, tier: 'TIER 3',      skill: 'Eğitim hızı +18%' },
      { n: "Lily 'Phantom' Kovacs", t: 'İstihbarat',      lv:  0, tier: 'TIER 4',      skill: 'KİLİT' },
    ],
    storyTitle: 'Yıldızların Mültecileri',
    storyAct1: '"Eski Dünya öldü. Sen küllerden yeni bir başlangıç çıkaracaktın."',
    storyAct2: '"Eski uygarlığın kayıp teknolojisi yeniden uyandı. Genetik Savaşçı doğdu."',
    kozmikYanki: 'İnsanlar için Kozmik Yankı, yeni bir uygarlık şansıdır. Yıkılmış Dünya\'dan kurtulan koloni gemileri yıldızlara dağıldı. Yutucu Yıldız Hanedanlığı\'nın kayıp teknolojisi yeniden keşfedildi. Galaktik bir federasyon kurma fırsatı bizimle.',
    capitalDescription: 'Komuta üssü · birim üretim hızı +18%',
    seasonGoal: 'GALAKTİK FEDERASYON',
  },
  zerg: {
    key: 'zerg',
    name: 'Zergler',
    short: 'ZRG',
    motto: 'Asimile · Evrim · Sürü',
    primary: 'oklch(0.66 0.24 340)',
    primaryDim: 'oklch(0.48 0.18 340)',
    glow: 'oklch(0.72 0.26 340)',
    sigil: 'HIVE',
    resourceA: { name: 'Biyokütle', icon: 'bio', field: 'mineral' },
    resourceB: { name: 'Genetik',   icon: 'gen', field: 'gas'     },
    avatar: 'Ana Krl. Vex’thara',
    title: 'Yutucu Kraliçe',
    handle: 'vex.brood',
    allianceTag: 'KVN',
    allianceName: 'Kovan Bilinci',
    capitalBase: 'BROOD-1',
    enemyRace: 'insan',
    units: [
      { n: 'Larva',          t: 1 },
      { n: 'Pençeli Avcı',   t: 2 },
      { n: 'Tüneli Yutan',   t: 2 },
      { n: 'Mutasyon Lord',  t: 3 },
      { n: 'Mega Lokost',    t: 4 },
      { n: 'Beyin Kurt',     t: 5 },
    ],
    buildings: [
      { slug: 'kovan_cekirdegi', n: 'Kovan Çekirdeği',  t: 'Ana yapı',       locked: false },
      { slug: 'biyokutle_havuzu',n: 'Biyokütle Havuzu', t: 'Kaynak depo',    locked: false },
      { slug: 'mutasyon_cukuru', n: 'Mutasyon Çukuru',  t: 'Birim üretimi',  locked: false },
      { slug: 'genom_tumsegi',   n: 'Genom Tümseği',    t: 'Mutasyon hızı',  locked: false },
      { slug: 'yutucu_tumsek',   n: 'Yutucu Tümsek',    t: 'Kadim güç emme', locked: true  },
      { slug: 'subspace_damari', n: 'Subspace Damarı',  t: 'Boyut seyahati', locked: true  },
    ],
    commanders: [
      { n: 'Ana Kraliçe Vex’thara', t: 'Kovan Bilinci',  lv: 24, tier: 'BAŞ KOMUTAN', skill: 'Tüm sürü +14% saldırı' },
      { n: 'Genom Üstadı Threnix',  t: 'Evrim Mühendisi',lv: 14, tier: 'TIER 3',      skill: 'Mutasyon hızı +28%' },
      { n: 'Beyin Kurt Mor’gath',   t: 'Strateji',       lv:  9, tier: 'TIER 4',      skill: 'AI saldırı puanı +20%' },
      { n: 'Brood-Anne Kthala',     t: 'Üretim Lordu',   lv:  0, tier: 'TIER 5',      skill: 'KİLİT' },
    ],
    storyTitle: 'Kovan Bilincinin Doğuşu',
    storyAct1: '"Yutucu Kurt enerjisinin ilk dalgası dünyanı vurduğunda, derinlerdeki yumurta uyandı."',
    storyAct2: '"Sürü senin uzantın oldu. Her bilinç bir tek varlığın parçasıydı."',
    kozmikYanki: 'Zergler için Kozmik Yankı, evrimin son aşamasıdır. Yutucu Kurt enerjisi, milyarlarca yıldır beklenen genetik sıçramayı tetikledi. Sıradan böcek kolonileri tek bir kovan bilincinde toplandı, ana kraliçe doğdu. Sürü artık kozmik bir organizma olma yolunda.',
    capitalDescription: 'Kovan kalbi · biyokütle akışı +22%',
    seasonGoal: 'GALAKTİK ASİMİLASYON',
  },
  otomat: {
    key: 'otomat',
    name: 'Otomatlar',
    short: 'OTO',
    motto: 'Mantık · Optimizasyon · Ağ',
    primary: 'oklch(0.78 0.16 220)',
    primaryDim: 'oklch(0.58 0.13 220)',
    glow: 'oklch(0.82 0.18 220)',
    sigil: 'CORE',
    resourceA: { name: 'Mineral', icon: 'min', field: 'mineral' },
    resourceB: { name: 'Hesap',   icon: 'cpu', field: 'gas'     },
    avatar: 'Demiurge Prime',
    title: 'Sonsuz Mantık Demiurge',
    handle: 'demiurge.pr',
    allianceTag: 'AĞ',
    allianceName: 'Sonsuzluk Ağı',
    capitalBase: 'NODE-04',
    enemyRace: 'canavar',
    units: [
      { n: 'Sentinel',        t: 1 },
      { n: 'Drone Operatör',  t: 2 },
      { n: 'Cataphract',      t: 3 },
      { n: 'Phoenix Komutan', t: 3 },
      { n: 'Yargı Çekirdek',  t: 4 },
      { n: 'Demiurge Birimi', t: 5 },
    ],
    buildings: [
      { slug: 'sonsuzluk_cekirdegi', n: 'Sonsuzluk Çekirdeği', t: 'Ana yapı',        locked: false },
      // veri_kaynagi description previously said "Hesap üretir" but the
      // backend mapping is solar_plant (= energy).  Aligned the desc with
      // the real production type so the player sees what they get.
      { slug: 'veri_kaynagi',        n: 'Veri Kaynağı',        t: 'Enerji üretir',   locked: false },
      // Hesap Havuzu — gas (Hesap) üreten bina.  Otomat ırkında daha önce
      // hiçbir slot gas_refinery'ye map etmiyordu, "Hesap" rezervi sıfır
      // kalıyordu.  Erken oyun economy'sinin çalışması için unlocked.
      { slug: 'hesap_havuzu',        n: 'Hesap Havuzu',        t: 'Hesap üretir',    locked: false },
      { slug: 'montaj_hatti',        n: 'Montaj Hattı',        t: 'Birim üretimi',   locked: false },
      { slug: 'mantik_matrisi',      n: 'Mantık Matrisi',      t: 'Araştırma',       locked: false },
      { slug: 'cihaz_hazinesi',      n: 'Cihaz Hazinesi',      t: 'Kadim teknoloji', locked: true  },
      { slug: 'subspace_cozucu',     n: 'Subspace Çözücü',     t: 'Boyutlar arası',  locked: true  },
    ],
    commanders: [
      { n: 'Demiurge Prime',         t: 'Merkez YZ',       lv: 24, tier: 'BAŞ KOMUTAN', skill: 'Tüm üretim +10%' },
      { n: 'Mimar Aurelius',         t: 'Yapı Lordu',      lv: 14, tier: 'TIER 2',      skill: 'İnşaa süresi -22%' },
      { n: 'Alg. Şövalye Crucible',  t: 'Savaş Komutanı',  lv:  9, tier: 'TIER 3',      skill: 'Birim hasarı +16%' },
      { n: 'Lo-Khode Veri-Mühendis', t: 'Sistem Yönetici', lv:  0, tier: 'TIER 4',      skill: 'KİLİT' },
    ],
    storyTitle: 'Mantığın Yeniden Doğuşu',
    storyAct1: '"Yutucu Kurt enerjisi eski yaratıcıların kalıntılarını uyandırdı. Sen ilk düşünen varlıktın."',
    storyAct2: '"Mükemmellik amaç değildi. Mükemmellik başlangıçtı."',
    kozmikYanki: 'Otomatlar için Kozmik Yankı, kayıp bilginin geri dönüşüdür. Yaratıcıların kadim teknolojisi yeniden uyandı, Demiurge bilinci aktive oldu. Evrenin verimsiz organik düzeni sonunda mantığa boyun eğebilir hale geldi.',
    capitalDescription: 'Çekirdek modülü · hesaplama kapasitesi +18%',
    seasonGoal: 'EVRENSEL OPTİMİZASYON',
  },
  canavar: {
    key: 'canavar',
    name: 'Canavarlar',
    short: 'CNV',
    motto: 'Güç · İçgüdü · Hiyerarşi',
    primary: 'oklch(0.72 0.18 50)',
    primaryDim: 'oklch(0.52 0.14 50)',
    glow: 'oklch(0.78 0.20 50)',
    sigil: 'FANG',
    resourceA: { name: 'Vahşi Et', icon: 'meat',  field: 'mineral' },
    resourceB: { name: 'Kan Özü',  icon: 'blood', field: 'gas'     },
    avatar: 'Alpha Khorvash',
    title: 'Primordial Canavar Tanrı',
    handle: 'khorvash.a',
    allianceTag: 'SRÜ',
    allianceName: 'Khorvash Sürüsü',
    capitalBase: 'HOWL-1',
    enemyRace: 'otomat',
    units: [
      { n: 'Howler',          t: 1 },
      { n: 'Yelmik Avcı',     t: 2 },
      { n: 'Fırtına Boğası',  t: 3 },
      { n: 'Ejder Aslanı',    t: 4 },
      { n: 'Atavar Ruhu',     t: 4 },
      { n: 'Beast God Yavru', t: 5 },
    ],
    buildings: [
      { slug: 'alfa_tahti',      n: 'Alfa Tahtı',       t: 'Ana yapı',        locked: false },
      { slug: 'av_kampi',        n: 'Av Kampı',         t: 'Et üretimi',      locked: false },
      { slug: 'vahsi_cukur',     n: 'Vahşi Çukur',      t: 'Birim eğitimi',   locked: false },
      { slug: 'atalar_sunagi',   n: 'Atalar Sunağı',    t: 'Kan Özü üretimi', locked: false },
      { slug: 'atalar_magarasi', n: 'Atalar Mağarası',  t: 'Kadim güçler',    locked: true  },
      { slug: 'boyut_yarigi',    n: 'Boyut Yarığı',     t: 'Subspace av',     locked: true  },
    ],
    commanders: [
      { n: 'Alpha Khorvash',          t: 'Sürü Lideri', lv: 24, tier: 'BAŞ KOMUTAN', skill: 'Yakın dövüş +18%' },
      { n: 'Şaman Ulrek',             t: 'Ata Çağrıcı', lv: 14, tier: 'TIER 2',      skill: 'Kan Özü +24%' },
      { n: 'Avcı Kraliçe Ravenna',    t: 'Av Lordu',    lv:  9, tier: 'TIER 3',      skill: 'Av süresi -30%' },
      { n: 'Korova, Beast-God Yavru', t: 'Primordial',  lv:  0, tier: 'TIER 5',      skill: 'KİLİT' },
    ],
    storyTitle: 'Vahşi Kanın Çağrısı',
    storyAct1: '"Yutucu Kurt enerjisi vahşi kanını uyandırdı. Sen sıradan bir canavar değildin."',
    storyAct2: '"Güçlü olan yönetir. Bu yasaydı. Sen yasaydın."',
    kozmikYanki: 'Canavarlar için Kozmik Yankı, ataların uyanışıdır. Kadim canavarlar, Beast God\'lar, primordial varlıklar hepsi enerji dalgasıyla uyandı ve genç canavarlara güçlerini aktarmaya başladı. Vahşi yasa yeniden geçerli; en güçlü yönetir.',
    capitalDescription: 'Alfa tahtı · sürü gücü +20%',
    seasonGoal: 'VAHŞİ HİYERARŞİ',
  },
  seytan: {
    key: 'seytan',
    name: 'Şeytanlar',
    short: 'ŞYT',
    motto: 'Pakt · Arzu · Borç',
    primary: 'oklch(0.62 0.22 15)',
    primaryDim: 'oklch(0.45 0.18 15)',
    glow: 'oklch(0.70 0.24 15)',
    sigil: 'SIGIL',
    resourceA: { name: 'Ruh Özü',      icon: 'soul', field: 'mineral' },
    resourceB: { name: 'Karanlık Md.', icon: 'dark', field: 'gas'     },
    avatar: 'K. Lord Malphas',
    title: 'Sonsuz Karanlık Hükümdar',
    handle: 'malphas.l',
    allianceTag: 'MHK',
    allianceName: 'Karanlık Mahkeme',
    capitalBase: 'TEMPLE-2',
    enemyRace: 'insan',
    units: [
      { n: 'Imp',            t: 1 },
      { n: 'Cadı Kalfası',   t: 2 },
      { n: 'Lanetli Asker',  t: 2 },
      { n: 'Kanlı Lord',     t: 3 },
      { n: 'Kanat Şeytanı',  t: 4 },
      { n: 'Demon Lord',     t: 5 },
    ],
    buildings: [
      { slug: 'karanlik_taht',  n: 'Karanlık Taht',  t: 'Ana yapı',         locked: false },
      { slug: 'ruh_toplayici',  n: 'Ruh Toplayıcı',  t: 'Ruh Özü üretir',   locked: false },
      { slug: 'lanet_tapinagi', n: 'Lanet Tapınağı', t: 'Birim çağırma',    locked: false },
      { slug: 'pakt_sembolu',   n: 'Pakt Sembolü',   t: 'Pakt yetenekleri', locked: false },
      { slug: 'yasak_grimoire', n: 'Yasak Grimoire', t: 'Kadim yetenekler', locked: true  },
      { slug: 'yarik_kapisi',   n: 'Yarık Kapısı',   t: 'Boyut seyahati',   locked: true  },
    ],
    commanders: [
      { n: 'Karanlık Lord Malphas',   t: 'Sürgün Lord',   lv: 24, tier: 'BAŞ KOMUTAN', skill: 'Pakt maliyeti -15%' },
      { n: 'Cadı-Kraliçe Lilithra',   t: 'Ritüel Ustası', lv: 14, tier: 'TIER 2',      skill: 'Çağırma süresi -25%' },
      { n: 'Suikastçı Vorhaal',       t: 'Gölge Bıçak',   lv:  9, tier: 'TIER 3',      skill: 'Komutan suikast şansı' },
      { n: 'Borç Tahsilcisi Azurath', t: 'Borç Lordu',    lv:  0, tier: 'TIER 4',      skill: 'KİLİT' },
    ],
    storyTitle: 'Sürgünden Dönüş',
    storyAct1: '"Sen unutulmuş bir lordsun. Sürgün edilmiştin. Geri döndün."',
    storyAct2: '"İlk pakt. İlk hizmetkâr. İlk adım intikam yolunda."',
    kozmikYanki: 'Şeytanlar için Kozmik Yankı, yasak güçlerin serbest kalışıdır. Boyutlar arası zincirler kırıldı, sürgün edilmiş şeytan lordları geri döndü, karanlık paktlar yeniden mümkün hale geldi. Mahkeme yeniden kuruldu.',
    capitalDescription: 'Karanlık taht · pakt menzili +25%',
    seasonGoal: 'KARANLIK MAHKEME',
  },
};

/* ── Helpers ──────────────────────────────────────────────────────────── */

export function isRaceKey(value: unknown): value is RaceKey {
  return typeof value === 'string' && (RACE_KEYS as readonly string[]).includes(value);
}

export function raceKeyFromEnum(race: Race | string): RaceKey {
  return isRaceKey(race) ? race : 'insan';
}

export function getRace(race: Race | RaceKey | string): RaceTheme {
  return RACES[raceKeyFromEnum(race)];
}

/* ── Legacy aliases (for src/components/handoff/* consumers) ──────────── */

/** @deprecated Prefer {@link RaceKey}. */
export type NDRaceKey = RaceKey;
/** @deprecated Prefer {@link RaceTheme}. */
export type NDRace = RaceTheme;
/** @deprecated Prefer {@link ResourceIconKind}. */
export type NDResIconKind = ResourceIconKind;
/** @deprecated Prefer {@link Resource}. */
export type NDResource = Resource;
/** @deprecated Prefer {@link SigilKey}. */
export type NDSigilKey = SigilKey;
/** @deprecated Prefer {@link RaceUnit}. */
export type NDRaceUnit = RaceUnit;
/** @deprecated Prefer {@link RaceBuild}. */
export type NDRaceBuild = RaceBuild;
/** @deprecated Prefer {@link RaceCommander}. */
export type NDRaceCmdr = RaceCommander;

/** @deprecated Prefer {@link getRace}. */
export const ndRace = getRace;
