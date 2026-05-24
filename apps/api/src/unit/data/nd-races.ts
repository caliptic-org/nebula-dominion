/**
 * Server-side mirror of the ND race units catalog.
 *
 * Must stay in sync with `apps/web/src/components/handoff/nd-tokens.ts`
 * (`RACES[race].units`). Used by the merge-preview endpoint to validate
 * recipe legality against the same source the frontend reads from.
 *
 * Keep the shape (`{ name, tier }`) and tiers (1–5) identical.
 */

export type NDRaceKey = 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';

export const ND_RACE_KEYS: ReadonlyArray<NDRaceKey> = [
  'insan',
  'zerg',
  'otomat',
  'canavar',
  'seytan',
];

export interface NDUnitDef {
  name: string;
  tier: number;
}

export const ND_RACE_UNITS: Record<NDRaceKey, ReadonlyArray<NDUnitDef>> = {
  insan: [
    { name: 'Marine',          tier: 1 },
    { name: 'Sniper',          tier: 2 },
    { name: 'Engineer',        tier: 2 },
    { name: 'Mecha Walker',    tier: 3 },
    { name: 'Genetic Warrior', tier: 4 },
    { name: 'Captain',         tier: 5 },
  ],
  zerg: [
    { name: 'Larva',          tier: 1 },
    { name: 'Pençeli Avcı',   tier: 2 },
    { name: 'Tüneli Yutan',   tier: 2 },
    { name: 'Mutasyon Lord',  tier: 3 },
    { name: 'Mega Lokost',    tier: 4 },
    { name: 'Beyin Kurt',     tier: 5 },
  ],
  otomat: [
    { name: 'Sentinel',        tier: 1 },
    { name: 'Drone Operatör',  tier: 2 },
    { name: 'Cataphract',      tier: 3 },
    { name: 'Phoenix Komutan', tier: 3 },
    { name: 'Yargı Çekirdek',  tier: 4 },
    { name: 'Demiurge Birimi', tier: 5 },
  ],
  canavar: [
    { name: 'Howler',          tier: 1 },
    { name: 'Yelmik Avcı',     tier: 2 },
    { name: 'Fırtına Boğası',  tier: 3 },
    { name: 'Ejder Aslanı',    tier: 4 },
    { name: 'Atavar Ruhu',     tier: 4 },
    { name: 'Beast God Yavru', tier: 5 },
  ],
  seytan: [
    { name: 'Imp',            tier: 1 },
    { name: 'Cadı Kalfası',   tier: 2 },
    { name: 'Lanetli Asker',  tier: 2 },
    { name: 'Kanlı Lord',     tier: 3 },
    { name: 'Kanat Şeytanı',  tier: 4 },
    { name: 'Demon Lord',     tier: 5 },
  ],
};

export const ND_MAX_TIER = 5;

/** Slot count required for a single merge step (3 source → 1 result). */
export const ND_MERGE_SLOT_COUNT = 3;

export function isNDRaceKey(value: unknown): value is NDRaceKey {
  return typeof value === 'string' && (ND_RACE_KEYS as ReadonlyArray<string>).includes(value);
}

/** Pick a representative unit definition at a tier for a given race. */
export function firstUnitAtTier(race: NDRaceKey, tier: number): NDUnitDef | undefined {
  return ND_RACE_UNITS[race].find((u) => u.tier === tier);
}
