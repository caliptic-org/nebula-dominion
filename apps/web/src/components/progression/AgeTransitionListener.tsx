'use client';

/**
 * <AgeTransitionListener /> — global mount that subscribes to the player's
 * `age_transition` socket event and renders <AgeTransitionScreen /> as a
 * full-screen cinematic when the event arrives.
 *
 * Why a separate component (not folded into ProgressionToaster):
 *   - ProgressionToaster's only side-effect is a toast; this one stages a
 *     full-screen overlay with its own dismissal lifecycle. Keeping them
 *     apart so each has one responsibility.
 *   - Both call useProgression with the same userId — socket.io-client
 *     dedupes the underlying connection by URL+namespace+auth, so the
 *     two listeners share one transport.
 *
 * Mount once in app/layout.tsx alongside ProgressionToaster. The
 * AgeTransitionScreen reads race + unlocks from local sources rather
 * than the wire event (server payload only carries previousAge/newAge/
 * badge_upgrade — race & unlock lookup is client-side).
 */

import { useMemo, useState } from 'react';
import { useProgression, type AgeTransitionWirePayload } from '@/hooks/useProgression';
import { AgeTransitionScreen } from './AgeTransitionScreen';
import { ContentUnlock } from '@/types/progression';
import { RACES, useNDRace } from '@/components/handoff';
import { getAccessToken } from '@/lib/session';

/** Decode JWT `sub` claim — copied from ProgressionToaster (same pattern).
 *  Kept inline (not extracted) because the auth shape is too small to
 *  justify a shared helper file; if a third caller emerges, hoist it then. */
function readUserIdFromJwt(): string | null {
  const tok = getAccessToken();
  if (!tok) return null;
  const parts = tok.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      atob(
        parts[1]
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), '='),
      ),
    ) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Approximate unlock set per new-age — derived from the gates.config.ts
 *  age-gated entries. Static so we don't need to round-trip to /gates on
 *  the first paint of the cinematic. When the real unlock list lands on
 *  the wire (server-side enrichment of AgeTransitionEvent), swap to that. */
const UNLOCKS_BY_AGE: Record<number, ContentUnlock[]> = {
  2: [ContentUnlock.MODE_RANKED],   // Çağ 2 opens Sezon Sıralama
  3: [ContentUnlock.MODE_RANKED],   // Çağ 3 adds guild + commander tier 3
  4: [ContentUnlock.MODE_RANKED],
  5: [ContentUnlock.MODE_RANKED],
  6: [ContentUnlock.MODE_RANKED],
};

export function AgeTransitionListener() {
  const userId = useMemo(() => readUserIdFromJwt(), []);
  const race = useNDRace();
  const [active, setActive] = useState<AgeTransitionWirePayload | null>(null);

  useProgression({
    userId: userId ?? '',
    onAgeTransition: (payload) => {
      // Only stage if a real transition happened — defensive guard against
      // a zero-delta event the server might emit during catch-up packages.
      if (payload.newAge > payload.previousAge) {
        setActive(payload);
      }
    },
  });

  if (!active) return null;

  // RACES is the canonical race token map (nd-tokens.ts). useNDRace returns
  // the active race, which is the player's race — match the cinematic to it.
  const themeRace = RACES[race.key] ?? race;

  return (
    <AgeTransitionScreen
      toAge={active.newAge}
      race={themeRace.key}
      raceColor={themeRace.primary}
      raceGlow={themeRace.glow}
      newUnlocks={UNLOCKS_BY_AGE[active.newAge] ?? []}
      autoAdvanceMs={10_000}
      onComplete={() => setActive(null)}
    />
  );
}
