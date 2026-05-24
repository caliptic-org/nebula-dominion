/**
 * New-player progression wizard — step config.
 *
 * Each step is data: id, copy, route to navigate to, optional building-slot
 * focus, and an `isDone` function evaluated against live server state. The
 * hook (`useWizardStep`) walks this list in order and returns the FIRST
 * step where `isDone` is false — that's "what should the player do next".
 *
 * Two design choices worth calling out:
 *
 * 1. We refer to buildings by SLOT INDEX (race.buildings[1] = primary
 *    resource, [2] = unit production, [3] = research) instead of backend
 *    type codes. Each race's slot 1 is its own thing (insan = Reaktör
 *    Modülü, zerg = Biyokütle Havuzu, otomat = Veri Kaynağı …), so the
 *    wizard stays race-agnostic while pointing at the right race-flavoured
 *    slug at runtime.
 *
 * 2. Completion can be server-derived (owns building / has alliance) or
 *    locally-tracked (visited a route / dismissed the hint). Local state
 *    lives in `nebula:wizard:v1` localStorage — see `useWizardStep` for
 *    the read/write side.
 *
 * Adding a step: append an entry below. Order matters — earlier steps
 * are checked first. To gate a step on another being done, just put it
 * later in the array.
 */

import type { PlayerBuildingDto } from '@/hooks/useGameBuildings';
import type { PlayerUnitDto } from '@/hooks/useGameUnits';
import type { UserProfileDto } from '@/hooks/useUserProfile';
import type { NDRace } from '@/components/handoff/nd-tokens';

/** Race-flavoured slug → canonical backend BuildingType. Mirrors the
 *  per-race table in /base/build + /base/building/[slug]. Used by the
 *  wizard to translate a slot-based step config into the right type
 *  check against liveBuildings. */
const SLUG_TO_BACKEND_TYPE: Record<string, string> = {
  // insan
  komuta_ussu:        'command_center',
  reaktor_modulu:     'solar_plant',
  kisla:              'barracks',
  bilim_akademisi:    'academy',
  subspace_anteni:    'shield_generator',
  genetik_lab:        'factory',
  // zerg
  kovan_cekirdegi:    'command_center',
  biyokutle_havuzu:   'mineral_extractor',
  mutasyon_cukuru:    'spawning_pool',
  genom_tumsegi:      'hatchery',
  yutucu_tumsek:      'shield_generator',
  subspace_damari:    'gas_refinery',
  // otomat
  sonsuzluk_cekirdegi:'command_center',
  veri_kaynagi:       'solar_plant',
  montaj_hatti:       'nano_forge',
  mantik_matrisi:     'cyber_core',
  cihaz_hazinesi:     'quantum_reactor',
  subspace_cozucu:    'defense_matrix',
  // canavar
  alfa_tahti:         'command_center',
  av_kampi:           'mineral_extractor',
  vahsi_cukur:        'barracks',
  atalar_sunagi:      'gas_refinery',
  atalar_magarasi:    'shield_generator',
  boyut_yarigi:       'factory',
  // seytan
  karanlik_taht:      'command_center',
  ruh_toplayici:      'gas_refinery',
  lanet_tapinagi:     'barracks',
  pakt_sembolu:       'academy',
  yasak_grimoire:     'shield_generator',
  yarik_kapisi:       'turret',
};

/** Bag of live state handed to every `isDone` check. */
export interface WizardContext {
  race: NDRace;
  profile: UserProfileDto | null;
  buildings: PlayerBuildingDto[] | null;
  units: PlayerUnitDto[] | null;
  hasAlliance: boolean;
  /** Routes the player has visited at least once (tracked in localStorage). */
  visitedRoutes: Set<string>;
  /** Step IDs the player has explicitly dismissed. */
  dismissed: Set<string>;
}

export interface WizardStep {
  /** Stable id used for dismiss tracking + analytics. */
  id: string;
  /** Short title in Turkish, max ~28 chars (fits the chip). */
  title: string;
  /** One-sentence guidance shown when the chip is expanded. */
  description: string;
  /** Where to send the player — full path with query string. */
  route: string;
  /** Optional building slot index (0-5) — when set, the resolved route
   *  becomes `<route>?focus=<race.buildings[slot].slug>`. */
  focusBuildingSlot?: number;
  /** CTA button label (defaults to "Git"). */
  ctaText?: string;
  /** Priority indicator for the chip glow — 1 = critical onboarding, 5 = polish. */
  priority: 1 | 2 | 3 | 4 | 5;
  /** Returns true when this step is already done and should be skipped. */
  isDone: (ctx: WizardContext) => boolean;
}

/* ── Helpers used inside isDone ─────────────────────────────────────── */

function ownsBuildingAtSlot(ctx: WizardContext, slot: number): boolean {
  const slug = ctx.race.buildings[slot]?.slug;
  if (!slug) return true; // race has no slot N → step doesn't apply
  const wantedType = SLUG_TO_BACKEND_TYPE[slug];
  if (!wantedType) return true; // unmapped → don't pester
  if (!ctx.buildings) return false; // still loading
  return ctx.buildings.some(
    (b) => b.type === wantedType && (b.status === 'active' || b.status === 'constructing'),
  );
}

/* ── Step list ──────────────────────────────────────────────────────── */

export const WIZARD_STEPS: WizardStep[] = [
  /* Identity */
  {
    id: 'race-select',
    title: 'Irkını seç',
    description: 'Beş ırktan birini seç — bu karar üssünü, birimlerini ve hikâyeni belirler.',
    route: '/race-select',
    ctaText: 'Irk Seç',
    priority: 1,
    isDone: (ctx) => Boolean(ctx.profile?.race),
  },

  /* Base setup — slot 1 (primary resource building) */
  {
    id: 'build-resource',
    title: 'Kaynak binası inşa et',
    description:
      'Üssünde sürekli üretim için bir kaynak binası gerekli. /base/build kısmından inşa edebilirsin.',
    route: '/base/build',
    focusBuildingSlot: 1,
    ctaText: 'İnşa Et',
    priority: 1,
    isDone: (ctx) => ownsBuildingAtSlot(ctx, 1),
  },

  /* Base setup — slot 2 (unit production building) */
  {
    id: 'build-military',
    title: 'Askeri yapı inşa et',
    description:
      'Birim üretmek için kışlanı (veya ırk eşdeğerini) ayağa kaldır. Savaşa hazırlığın ilk adımı.',
    route: '/base/build',
    focusBuildingSlot: 2,
    ctaText: 'İnşa Et',
    priority: 1,
    isDone: (ctx) => ownsBuildingAtSlot(ctx, 2),
  },

  /* First unit */
  {
    id: 'train-first-unit',
    title: 'İlk birimini eğit',
    description:
      'Askeri yapı hazır. /base/production sayfasından ilk birimini eğitim kuyruğuna ekle.',
    route: '/base/production',
    ctaText: 'Eğit',
    priority: 1,
    isDone: (ctx) => Boolean(ctx.units && ctx.units.length > 0),
  },

  /* See the roster */
  {
    id: 'visit-inventory',
    title: 'Envanterini gör',
    description: 'Eğittiğin birimleri ve cihazları envanterden incele.',
    route: '/inventory',
    ctaText: 'Envanteri Aç',
    priority: 2,
    isDone: (ctx) => ctx.visitedRoutes.has('/inventory'),
  },

  /* Research */
  {
    id: 'build-research',
    title: 'Araştırma binası inşa et',
    description: 'Araştırma binası daha güçlü birimler ve buff\'lar açar.',
    route: '/base/build',
    focusBuildingSlot: 3,
    ctaText: 'İnşa Et',
    priority: 2,
    isDone: (ctx) => ownsBuildingAtSlot(ctx, 3),
  },

  /* Galaxy / combat preparation */
  {
    id: 'visit-galaxy',
    title: 'Galaksiyi keşfet',
    description: 'Komşu sektörleri ve hedef üsleri /map\'ten gör — saldırı planlamak için ilk adım.',
    route: '/map',
    ctaText: 'Haritayı Aç',
    priority: 2,
    isDone: (ctx) => ctx.visitedRoutes.has('/map'),
  },

  /* First battle */
  {
    id: 'first-battle-prep',
    title: 'İlk savaşına hazırlan',
    description:
      'Komutan + birim seç, formasyonunu kur. Battle-prep ekranı seni başlangıç savaşına hazırlar.',
    route: '/battle-prep',
    ctaText: 'Hazırlığa Git',
    priority: 2,
    isDone: (ctx) => ctx.visitedRoutes.has('/battle-prep') || ctx.visitedRoutes.has('/battle'),
  },

  /* Merge mechanic */
  {
    id: 'try-merge',
    title: 'Birim birleştirmeyi dene',
    description:
      'Aynı tür iki birimi birleştirip tier-up yap — daha güçlü tek bir birim oluştur.',
    route: '/merge',
    ctaText: 'Birleştir',
    priority: 3,
    isDone: (ctx) => ctx.visitedRoutes.has('/merge'),
  },

  /* Alliance */
  {
    id: 'join-alliance',
    title: 'Bir ittifaka katıl',
    description: 'İttifaklar haftalık raid, bağış ve savaşlara erişim sağlar — uzun vadede kritik.',
    route: '/alliance',
    ctaText: 'İttifaklara Bak',
    priority: 3,
    isDone: (ctx) => ctx.hasAlliance,
  },

  /* Missions */
  {
    id: 'check-missions',
    title: 'Görevlerini kontrol et',
    description: 'Günlük + sezon görevlerini tamamla — XP, kaynak, kozmetik kazan.',
    route: '/missions',
    ctaText: 'Görevleri Gör',
    priority: 3,
    isDone: (ctx) => ctx.visitedRoutes.has('/missions'),
  },

  /* Story */
  {
    id: 'read-story',
    title: 'Hikayeni okumaya başla',
    description: 'Çağ 1 hikâye bölümünü oku — ırkının evren içindeki yerini öğren.',
    route: '/story-gallery',
    ctaText: 'Hikâyeye Git',
    priority: 4,
    isDone: (ctx) =>
      ctx.visitedRoutes.has('/story-gallery') || ctx.visitedRoutes.has('/story'),
  },

  /* Commanders */
  {
    id: 'visit-commanders',
    title: 'Komutanlarını yönet',
    description: 'Komutanlarına yetenek yükselt ve aktif komutanını seç.',
    route: '/commanders',
    ctaText: 'Komutanları Aç',
    priority: 4,
    isDone: (ctx) => ctx.visitedRoutes.has('/commanders'),
  },

  /* Shop awareness */
  {
    id: 'visit-shop',
    title: 'Mağazaya göz at',
    description: 'Hızlandırıcılar, kalkanlar ve kozmetikler /shop\'ta. Kristal harcamasan da göz at.',
    route: '/shop',
    ctaText: 'Mağazayı Aç',
    priority: 5,
    isDone: (ctx) => ctx.visitedRoutes.has('/shop'),
  },

  /* Customization */
  {
    id: 'visit-customization',
    title: 'Kozmetiklerini incele',
    description: 'Skin, çerçeve ve emote\'ları /customization\'da seç.',
    route: '/customization',
    ctaText: 'Özelleştir',
    priority: 5,
    isDone: (ctx) => ctx.visitedRoutes.has('/customization'),
  },
];

/* ── Route resolver ─────────────────────────────────────────────────── */

/** Resolves a step's `route` + `focusBuildingSlot` into a final URL with
 *  the race-correct ?focus= slug applied. */
export function resolveStepRoute(step: WizardStep, race: NDRace): string {
  if (typeof step.focusBuildingSlot !== 'number') return step.route;
  const slug = race.buildings[step.focusBuildingSlot]?.slug;
  if (!slug) return step.route;
  const sep = step.route.includes('?') ? '&' : '?';
  return `${step.route}${sep}focus=${slug}`;
}
