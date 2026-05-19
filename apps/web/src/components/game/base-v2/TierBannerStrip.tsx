'use client';

import { useNDRace } from '@/components/handoff/useNDRace';
import { TierBanner } from '@/components/handoff/RaceTierPath';
import { xpProgressPercent } from '@/lib/tier-api';
import { useTierProgress } from '@/hooks/useTierProgress';

/* Tier sub-banner shown under the base resource bar. Falls back to a
 * neutral "ÇAĞ 1 / LV 1" display when the API is unreachable so the
 * layout never collapses for unauthenticated demo views. */
export function TierBannerStrip() {
  const race = useNDRace();
  const { progress } = useTierProgress();
  const level = progress?.currentLevel ?? 1;
  const age = progress?.currentAge ?? 1;
  const xpPercent = progress ? xpProgressPercent(progress) : 0;
  return (
    <div className="base-tier-banner">
      <TierBanner race={race} level={level} age={age} xpPercent={xpPercent} />
    </div>
  );
}
