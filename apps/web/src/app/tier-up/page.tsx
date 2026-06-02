'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { ND, ScrTierUp, useNDRace } from '@/components/handoff';
import { useTierProgress } from '@/hooks/useTierProgress';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useProgression } from '@/hooks/useProgression';

function TierUpInner() {
  const race = useNDRace();
  const { progress, requirements, levels, loading, error, xpPercent, levelUp, refresh } = useTierProgress();

  // useProgression hits game-server (live source of truth for canAdvanceAge).
  // useTierProgress hits api's tier_progression mirror table; the two are
  // kept in sync via api's lazy pull-on-read but canAdvanceAge specifically
  // only exists on game-server's PlayerProgressDto, so we have to bring it
  // in directly. Same userId for both — useUserProfile is the canonical
  // source post-login.
  const { profile } = useUserProfile();
  const {
    progress: liveProgress,
    advanceAge,
    advancing,
    refresh: refreshLive,
  } = useProgression({ userId: profile?.id ?? '' });
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const levelNames = useMemo(() => {
    const map: Record<number, string> = {};
    for (const l of levels) map[l.level] = l.name;
    return map;
  }, [levels]);

  const currentLevel = progress?.currentLevel ?? liveProgress?.level ?? 1;
  const tierName = progress?.raceSpecificTierName ?? progress?.currentTierName ?? race.title;
  const nextDef = requirements?.nextTier;
  const canLevelUp =
    !!progress &&
    !!requirements?.required &&
    BigInt(progress.xp) >= BigInt(requirements.required.xp);
  const canAdvanceAge = liveProgress?.canAdvanceAge ?? false;

  const handleLevelUp = useCallback(async () => {
    try {
      await levelUp();
    } catch {
      // Errors surface via state on next refresh
    }
  }, [levelUp]);

  const handleAdvanceAge = useCallback(async () => {
    setAdvanceError(null);
    try {
      await advanceAge();
      // Refetch both views so the tier_progression mirror + live progress
      // both flip in sync — without this, the UI flickers between the
      // pre-advance (api) and post-advance (game-server) shapes for a tick.
      await Promise.all([refresh(), refreshLive()]);
    } catch (err) {
      setAdvanceError(err instanceof Error ? err.message : 'Çağ geçişi başarısız');
    }
  }, [advanceAge, refresh, refreshLive]);

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
      canAdvanceAge={canAdvanceAge}
      onAdvanceAge={handleAdvanceAge}
      advancing={advancing}
      advanceError={advanceError}
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
