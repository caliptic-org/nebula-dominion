'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { BattleResultScreen } from '@/components/game/battle-result/BattleResultScreen';
import type { BattleResultData } from '@/components/game/battle-result/BattleResultScreen';

function makeMockData(outcome: 'victory' | 'defeat'): BattleResultData {
  const isVictory = outcome === 'victory';
  return {
    outcome,
    stats: {
      unitsKilled:   isVictory ? 48 : 12,
      unitsLost:     isVictory ? 9  : 31,
      damageDealt:   isVictory ? 142800 : 34200,
      damageTaken:   isVictory ? 41600  : 118400,
      durationSeconds: 7 * 60 + 34,
      score:         isVictory ? 18420 : 3840,
    },
    resources: {
      mineral: isVictory ? 3200 : 800,
      gas:     isVictory ? 1400 : 350,
      energy:  isVictory ? 960  : 240,
    },
    xp: {
      gained:       isVictory ? 4800 : 1200,
      before:       12400,
      after:        isVictory ? 17200 : 13600,
      max:          20000,
      currentLevel: 14,
      levelUp:      isVictory,
      newLevel:     isVictory ? 15 : undefined,
    },
    rewards: isVictory
      ? [
          { id: 'r1', name: 'Kristal',    quantity: 500,  icon: '💎', rarity: 'epic' },
          { id: 'r2', name: 'Komutan XP', quantity: 2000, icon: '⭐', rarity: 'rare' },
          { id: 'r3', name: 'Kasa',       quantity: 1,    icon: '📦', rarity: 'legendary' },
          { id: 'r4', name: 'İyon Topu',  quantity: 3,    icon: '🔮', rarity: 'rare' },
          { id: 'r5', name: 'Metal',      quantity: 1200, icon: '🔩', rarity: 'common' },
          { id: 'r6', name: 'Enerji Çip', quantity: 24,   icon: '⚡', rarity: 'common' },
        ]
      : [
          { id: 'r1', name: 'Teselli XP', quantity: 400,  icon: '💫', rarity: 'common' },
          { id: 'r2', name: 'Metal',      quantity: 200,  icon: '🔩', rarity: 'common' },
          { id: 'r3', name: 'Mana',       quantity: 80,   icon: '🔷', rarity: 'common' },
        ],
    opponentName: 'Komutan Vex-7',
  };
}

function BattleResultInner() {
  const params = useSearchParams();
  const outcomeParam = params.get('outcome') === 'defeat' ? 'defeat' : 'victory';
  const raceParam    = params.get('race') ?? 'insan';

  const { race, setRace } = useRaceTheme();

  useEffect(() => {
    const wanted = (Object.values(Race) as Race[]).find(
      (r) => RACE_DESCRIPTIONS[r].dataRace === raceParam || r === raceParam,
    );
    if (wanted && wanted !== race) setRace(wanted);
  }, [raceParam, race, setRace]);

  const data = makeMockData(outcomeParam);
  return <BattleResultScreen data={data} />;
}

export default function BattleResultPage() {
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
          Yükleniyor…
        </div>
      }
    >
      <BattleResultInner />
    </Suspense>
  );
}
