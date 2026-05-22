'use client';

import { Suspense, useCallback, useMemo } from 'react';
import { ND, ScrTierUp, useNDRace } from '@/components/handoff';
import { useTierProgress } from '@/hooks/useTierProgress';

function TierUpInner() {
  const race = useNDRace();
  const { progress, requirements, levels, loading, error, xpPercent, levelUp, refresh } = useTierProgress();

  const levelNames = useMemo(() => {
    const map: Record<number, string> = {};
    for (const l of levels) map[l.level] = l.name;
    return map;
  }, [levels]);

  const currentLevel = progress?.currentLevel ?? 1;
  const tierName = progress?.raceSpecificTierName ?? progress?.currentTierName ?? race.title;
  const nextDef = requirements?.nextTier;
  const canLevelUp =
    !!progress &&
    !!requirements?.required &&
    BigInt(progress.xp) >= BigInt(requirements.required.xp);

  const handleLevelUp = useCallback(async () => {
    try {
      await levelUp();
    } catch {
      // Errors surface via state on next refresh
    }
  }, [levelUp]);

  const notice =
    error && !progress
      ? `${error} — Demo modunda 54 seviyelik yol gösteriliyor.`
      : loading && !progress
        ? 'Tier verisi yükleniyor…'
        : undefined;

  const xpLabel = progress
    ? `${progress.xp} / ${progress.xpToNextLevel}`
    : undefined;

  return (
    <ScrTierUp
      race={race}
      currentLevel={currentLevel}
      xpPercent={xpPercent}
      xpLabel={xpLabel}
      tierName={tierName}
      nextTierName={nextDef?.name}
      nextTierDescription={
        nextDef ? `${nextDef.durationLabel} · ${nextDef.description}` : undefined
      }
      isMaxLevel={!!progress?.isMaxLevel}
      canLevelUp={canLevelUp}
      onLevelUp={handleLevelUp}
      onRefresh={refresh}
      levelNames={levelNames}
      notice={notice}
      noticeKind={error && !progress ? 'warn' : 'info'}
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
            background: ND.bgDeep,
            color: 'oklch(0.72 0.02 240)',
            fontFamily: ND.mono,
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
