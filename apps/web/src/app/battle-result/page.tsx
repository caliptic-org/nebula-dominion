'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BattleResultScreen, type BattleResultData, type BattleOutcome } from '@/components/nd/screens';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { RACES, type NDRaceKey } from '@/components/handoff';

const ND_RACE_KEYS: readonly NDRaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];

function isNDRaceKey(value: string | null): value is NDRaceKey {
  return value != null && (ND_RACE_KEYS as readonly string[]).includes(value);
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
  const raceParam = params.get('race');
  const outcome: BattleOutcome = params.get('outcome') === 'defeat' ? 'defeat' : 'victory';
  const { race, setRace } = useRaceTheme();

  useEffect(() => {
    if (!raceParam) return;
    const wanted = (Object.values(Race) as Race[]).find(
      (r) => RACE_DESCRIPTIONS[r].dataRace === raceParam || r === raceParam,
    );
    if (wanted && wanted !== race) setRace(wanted);
  }, [raceParam, race, setRace]);

  const forced = isNDRaceKey(raceParam) ? raceParam : undefined;
  const effectiveRace = forced ?? (RACE_DESCRIPTIONS[race].dataRace as NDRaceKey);
  const data = makeMockData(outcome, effectiveRace);
  return <BattleResultScreen data={data} forcedRace={forced} />;
}

export default function BattleResultPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
