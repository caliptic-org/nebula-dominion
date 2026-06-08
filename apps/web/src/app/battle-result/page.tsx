'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BattleResultScreen, type BattleResultData, type BattleOutcome } from '@/components/nd/screens';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { RACES, type NDRaceKey } from '@/components/handoff';

const ND_RACE_KEYS: readonly NDRaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];

function isNDRaceKey(value: string | null): value is NDRaceKey {
  return value != null && (ND_RACE_KEYS as readonly string[]).includes(value);
}

interface StashedResult {
  id: string;
  rewards: {
    gold: number;
    gems: number;
    xp: number;
    mineral?: number;
    gas?: number;
    /** Science (◈) — bilim puanı, savaş başına ~15–35 (zafer) / ~3 (yenilgi) */
    science?: number;
  };
  /** Real simulation stats — written by BattleScreen.onContinue alongside
   *  the backend rewards.  Optional because deep-linking to /battle-result
   *  without going through /battle leaves these undefined. */
  stats?: {
    unitsKilled:     number;
    unitsLost:       number;
    damageDealt:     number;
    damageTaken:     number;
    durationSeconds: number;
    score:           number;
  };
  /** Best-performing player unit by total damage dealt. */
  mvp?: {
    name:        string;
    tier:        number;
    kills:       number;
    damageDealt: number;
  } | null;
  status: string;
  savedAt: number;
}

/** Reads + clears the sessionStorage stash written by BattleScreen.onContinue.
 * Returns null when there is no fresh stash (older than 5 minutes counts as
 * stale to avoid a back-button revisit showing the same numbers twice). */
function readBattleStash(): StashedResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem('nebula:last-battle-result:v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StashedResult;
    if (!parsed?.rewards) return null;
    const ageMs = Date.now() - (parsed.savedAt ?? 0);
    if (ageMs > 5 * 60 * 1000) return null;
    // One-shot — clear so a back-button re-entry doesn't show stale rewards.
    window.sessionStorage.removeItem('nebula:last-battle-result:v1');
    return parsed;
  } catch {
    return null;
  }
}

function makeMockData(outcome: BattleOutcome, raceKey: NDRaceKey): BattleResultData {
  const isV = outcome === 'victory';
  const race = RACES[raceKey];
  const topUnit = race.units[Math.min(race.units.length - 1, isV ? 4 : 1)];
  return {
    outcome,
    stats: {
      unitsKilled: isV ? 48 : 12,
      unitsLost: isV ? 9 : 31,
      damageDealt: isV ? 142800 : 34200,
      damageTaken: isV ? 41600 : 118400,
      durationSeconds: 7 * 60 + 34,
      score: isV ? 18420 : 3840,
    },
    rewards: {
      resourceA: isV ? 3200 : 800,
      resourceB: isV ? 1400 : 350,
      crystal: isV ? 6 : 1,
      // Science reward — granted server-side via api /battles/:id/claim-reward
      // (fan-out to game-server is internal-service-signed). Mocked here so
      // the demo result screen also shows the ◈ chip and players understand
      // the science economy from day one.
      science: isV ? 18 : 4,
      xpGained: isV ? 4800 : 1200,
      xpBefore: 12400,
      xpAfter: isV ? 17200 : 13600,
      xpMax: 20000,
      level: 14,
      levelUp: isV,
      newLevel: isV ? 15 : undefined,
    },
    mvp: {
      name: topUnit.n,
      tier: topUnit.t,
      kills: isV ? 14 : 5,
      damageDealt: isV ? 38400 : 12600,
    },
  };
}

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const raceParam = params.get('race');
  const urlOutcome: BattleOutcome = params.get('outcome') === 'defeat' ? 'defeat' : 'victory';
  const hasOutcomeParam = params.get('outcome') !== null;
  const { race, setRace } = useRaceTheme();

  // Read the sessionStorage stash once on mount.  null when player navigates
  // here directly without going through /battle (e.g. a deep-link from a
  // dev page).  `stashLoaded` flips true after the initial read; before that
  // a null stash is "unknown" rather than "definitely no battle ran".
  const [stash, setStash] = useState<StashedResult | null>(null);
  const [stashLoaded, setStashLoaded] = useState(false);
  useEffect(() => {
    setStash(readBattleStash());
    setStashLoaded(true);
  }, []);

  // Source of truth for the headline + reward tier: the backend-rolled
  // status carried by `stash.status` (set by BattleScreen.onContinue from
  // POST /battles response). The BE owns the outcome since cycle 4; the
  // FE cinematic may disagree but its result must not drive the result
  // screen UI. Fall back to the URL outcome param only when there is no
  // stash (offline / deep-link demo path).
  const stashOutcome: BattleOutcome | null =
    stash?.status === 'won'
      ? 'victory'
      : stash?.status === 'lost'
        ? 'defeat'
        : null;
  const outcome: BattleOutcome = stashOutcome ?? urlOutcome;
  useEffect(() => {
    if (!stashLoaded || !stash) return;
    if (stashOutcome && stashOutcome !== urlOutcome) {
      // eslint-disable-next-line no-console
      console.warn(
        '[battle-result] stash.status disagrees with URL outcome — rendering stash:',
        { stash: stashOutcome, url: urlOutcome },
      );
    }
  }, [stashLoaded, stash, stashOutcome, urlOutcome]);

  // Honest empty-state: if the player landed here with NO stash AND NO
  // outcome query param, they never actually fought. Rendering the mock
  // "48 yok edilen · MVP Genetic Warrior · +4.8K XP" is a lie that the
  // earlier audit flagged. Bounce to /battle-prep instead.
  useEffect(() => {
    if (!stashLoaded) return;
    if (stash) return;                  // real result, show it
    if (hasOutcomeParam) return;        // deep-link demo path stays
    router.replace('/battle-prep');
  }, [stashLoaded, stash, hasOutcomeParam, router]);

  useEffect(() => {
    if (!raceParam) return;
    const wanted = (Object.values(Race) as Race[]).find(
      (r) => RACE_DESCRIPTIONS[r].dataRace === raceParam || r === raceParam,
    );
    if (wanted && wanted !== race) setRace(wanted);
  }, [raceParam, race, setRace]);

  const forced = isNDRaceKey(raceParam) ? raceParam : undefined;
  const effectiveRace = forced ?? (RACE_DESCRIPTIONS[race].dataRace as NDRaceKey);
  const data = useMemo<BattleResultData>(() => {
    const mock = makeMockData(outcome, effectiveRace);
    if (!stash) return mock;
    // Merge real reward numbers in, keep mock stats/MVP since the stub
    // doesn't expose damage/kills yet. resourceA == gold (race-agnostic in
    // backend terms), resourceB stays at mock (no gas equivalent), crystal
    // == gems. xpGained from backend.
    // Use real simulation stats when present; fall back to mock numbers
    // for direct deep-links (no /battle round-trip).  MVP same pattern —
    // when the sim ran we know exactly who carried the team.
    return {
      ...mock,
      stats: stash.stats ?? mock.stats,
      mvp: stash.mvp ?? mock.mvp,
      rewards: {
        ...mock.rewards,
        // mineral → resourceA (primary mineral currency)
        resourceA: stash.rewards.mineral ?? stash.rewards.gold,
        // gas → resourceB
        resourceB: stash.rewards.gas ?? mock.rewards.resourceB,
        // PvE grants no gems/crystals (premium currency — granting it from
        // battles would be inflationary), so don't show a phantom crystal
        // reward. The pill hides itself when 0 (cycle-28 follow-up).
        crystal: 0,
        // science → research wallet currency (◈), shown beside the resource pills
        science: stash.rewards.science ?? 0,
        xpGained: stash.rewards.xp,
        xpAfter: mock.rewards.xpBefore + stash.rewards.xp,
        // levelUp logic: same as mock, since the stub doesn't track level.
        levelUp: outcome === 'victory' && stash.rewards.xp > 200,
      },
    };
  }, [stash, outcome, effectiveRace]);

  return <BattleResultScreen data={data} forcedRace={forced} />;
}

export default function BattleResultPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
