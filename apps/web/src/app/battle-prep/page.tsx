'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { BattlePrepScreen } from '@/components/game/battle-prep/BattlePrepScreen';

function BattlePrepInner() {
  const params = useSearchParams();
  const raceParam = params.get('race') ?? 'insan';
  const { race, setRace } = useRaceTheme();

  useEffect(() => {
    const wanted = (Object.values(Race) as Race[]).find(
      r => RACE_DESCRIPTIONS[r].dataRace === raceParam || r === raceParam,
    );
    if (wanted && wanted !== race) setRace(wanted);
  }, [raceParam, race, setRace]);

  return <BattlePrepScreen />;
}

export default function BattlePrepPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#050810',
            color: 'rgba(74,158,255,0.5)',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          Hazırlık Yükleniyor…
        </div>
      }
    >
      <BattlePrepInner />
    </Suspense>
  );
}
