'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { AgeTransitionScreen } from '@/components/progression/AgeTransitionScreen';
import { ContentUnlock } from '@/types/progression';

const DATA_RACE_TO_LORE_KEY: Record<string, string> = {
  insan:   'human',
  zerg:    'zerg',
  otomat:  'automat',
  canavar: 'beast',
  seytan:  'demon',
};

const DEFAULT_UNLOCKS_BY_AGE: Record<number, ContentUnlock[]> = {
  2: [ContentUnlock.CONSTRUCTION_BASICS, ContentUnlock.MODE_RANKED],
  3: [ContentUnlock.ADVANCED_ABILITIES, ContentUnlock.SPECIAL_MAPS],
  4: [ContentUnlock.ADVANCED_TACTICS],
  5: [ContentUnlock.RACE_MONSTER_PREVIEW],
  6: [],
};

function parseUnlocks(raw: string | null): ContentUnlock[] | null {
  if (!raw) return null;
  const valid = new Set(Object.values(ContentUnlock));
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const out = parts.filter((p): p is ContentUnlock => valid.has(p as ContentUnlock));
  return out.length ? out : null;
}

function clampAge(n: number): number {
  if (!Number.isFinite(n)) return 2;
  return Math.min(6, Math.max(2, Math.trunc(n)));
}

function TierUpInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { race, setRace, raceColor, raceGlow } = useRaceTheme();
  const [completed, setCompleted] = useState(false);

  const toAge = clampAge(Number(params.get('toAge') ?? params.get('age') ?? '2'));
  const raceParam = params.get('race');
  const unlocksParam = params.get('unlocks');
  const autoMsParam = params.get('autoMs');

  useEffect(() => {
    if (!raceParam) return;
    const wanted = (Object.values(Race) as Race[]).find(
      (r) => RACE_DESCRIPTIONS[r].dataRace === raceParam || r === raceParam,
    );
    if (wanted && wanted !== race) setRace(wanted);
  }, [raceParam, race, setRace]);

  const dataRace = RACE_DESCRIPTIONS[race].dataRace;
  const loreRace = DATA_RACE_TO_LORE_KEY[dataRace] ?? dataRace;
  const unlocks = parseUnlocks(unlocksParam) ?? DEFAULT_UNLOCKS_BY_AGE[toAge] ?? [];
  const autoAdvanceMs = autoMsParam !== null ? Math.max(0, Number(autoMsParam) || 0) : 0;

  if (completed) {
    return (
      <div
        data-testid="tier-up-completed"
        role="status"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          background: '#080a10',
          color: 'rgba(255,255,255,0.85)',
          fontFamily: 'Share Tech Mono, monospace',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 12, letterSpacing: '0.2em', color: raceColor, textTransform: 'uppercase' }}>
          Çağ {toAge} başladı
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', maxWidth: 320 }}>
          Yeni içeriklerin İlerleme ekranından inceleyebilirsin.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => router.push('/progression')}
            style={{
              fontFamily: 'inherit',
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              padding: '10px 18px',
              background: `${raceColor}18`,
              color: raceColor,
              border: `1px solid ${raceColor}66`,
              cursor: 'pointer',
            }}
          >
            İlerleme
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            style={{
              fontFamily: 'inherit',
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              padding: '10px 18px',
              background: 'transparent',
              color: 'rgba(255,255,255,0.65)',
              border: '1px solid rgba(255,255,255,0.16)',
              cursor: 'pointer',
            }}
          >
            Ana Üs
          </button>
        </div>
      </div>
    );
  }

  return (
    <AgeTransitionScreen
      toAge={toAge}
      race={loreRace}
      raceColor={raceColor}
      raceGlow={raceGlow}
      newUnlocks={unlocks}
      autoAdvanceMs={autoAdvanceMs}
      onComplete={() => setCompleted(true)}
    />
  );
}

export default function TierUpPage() {
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
          Tier Yükseliş hazırlanıyor…
        </div>
      }
    >
      <TierUpInner />
    </Suspense>
  );
}
