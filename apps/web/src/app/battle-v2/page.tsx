'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { BattleScreen } from '@/components/game/battle-hud-v2/BattleScreen';

function BattleV2Inner() {
  const params = useSearchParams();
  const raceParam = params.get('race') ?? 'insan';
  const { race, setRace } = useRaceTheme();

  useEffect(() => {
    const wanted = (Object.values(Race) as Race[]).find(
      (r) => RACE_DESCRIPTIONS[r].dataRace === raceParam || r === raceParam,
    );
    if (wanted && wanted !== race) {
      setRace(wanted);
    }
  }, [raceParam, race, setRace]);

  return <BattleScreen />;
}

export default function BattleV2Page() {
  return (
    <Suspense
      fallback={
        <div
          className="h-dvh flex items-center justify-center"
          style={{ background: 'var(--race-bg-deep, #050810)' }}
        >
          <span
            className="font-display text-xs uppercase tracking-widest"
            style={{ color: 'var(--race-text-muted)' }}
          >
            Taktik HUD Yükleniyor…
          </span>
        </div>
      }
    >
      <BattleV2Inner />
    </Suspense>
  );
}
