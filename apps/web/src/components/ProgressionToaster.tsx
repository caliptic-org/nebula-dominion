'use client';

/**
 * <ProgressionToaster /> — global listener that fires toast notifications
 * whenever the game-server emits an `xp_gained` or `level_up` event on the
 * authenticated player's socket room.
 *
 * Mounted once in app/layout.tsx so every route family benefits without
 * each page rewiring the socket. The hook (useProgression) is the single
 * source of subscriptions; this component only adds the visual feedback.
 *
 * Why a global component instead of inline in /base:
 *   - Players can earn XP from /battle, /missions claim, /events, etc.
 *     A per-route listener would miss the toast when the action lands a
 *     route away from the one the player is on.
 *   - Keeps the toast copy + styling in one place so the feedback is
 *     identical regardless of source.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useProgression } from '@/hooks/useProgression';
import { toast } from '@/components/handoff/Toaster';
import { getAccessToken } from '@/lib/session';

/** Map XpSource enum (game-server config/level-config.ts) → user-facing copy.
 *  Keep aligned with apps/game-server/src/progression/config/level-config.ts
 *  XP_BASE_AMOUNTS so the labels match the surfaced amounts. */
const XP_SOURCE_LABELS: Record<string, string> = {
  daily_mission:   'Günlük görev',
  pve_win:         'PvE zaferi',
  pve_loss:        'PvE',
  pvp_win:         'PvP zaferi',
  pvp_loss:        'PvP',
  construction:    'İnşa',
  guild_activity:  'Lonca',
  achievement:     'Başarım',
  event:           'Etkinlik',
  // Legacy aliases — backend keeps emitting these for older flows.
  battle_win:      'Zafer',
  battle_loss:     'Yenilgi',
  quest_easy:      'Kolay görev',
  quest_medium:    'Görev',
  quest_hard:      'Zorlu görev',
};

/** Decode a JWT payload's `sub` claim (= user id). Returns null if no token
 *  or the token can't be parsed — useProgression handles the empty case by
 *  not subscribing, so we don't need to guard further upstream. */
function readUserIdFromJwt(): string | null {
  const tok = getAccessToken();
  if (!tok) return null;
  const parts = tok.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(parts[1].length + (4 - (parts[1].length % 4)) % 4, '=')),
    ) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function ProgressionToaster() {
  // Re-derive userId on every render is cheap and we only mount once;
  // useMemo so the dependency below sees a stable value until login changes.
  const userId = useMemo(() => readUserIdFromJwt(), []);
  // Throttle: avoid spam if the server batches several xp_gained events in
  // the same tick. Hold the running total and flush after a 250 ms idle.
  const pendingRef = useRef<{ amount: number; sources: Set<string>; t?: ReturnType<typeof setTimeout> }>({
    amount: 0,
    sources: new Set(),
  });

  useProgression({
    userId: userId ?? '',
    onXpGained: (payload) => {
      // Accumulate; the timer below flushes a single toast for the batch.
      pendingRef.current.amount += payload.xpGained;
      pendingRef.current.sources.add(payload.source);
      if (pendingRef.current.t) clearTimeout(pendingRef.current.t);
      pendingRef.current.t = setTimeout(() => {
        const { amount, sources } = pendingRef.current;
        pendingRef.current = { amount: 0, sources: new Set() };
        if (amount <= 0) return;
        // Pick the first source as the label — when multiple sources mix
        // in a batch, fall back to "Aksiyon" so we don't misattribute.
        const label = sources.size === 1
          ? XP_SOURCE_LABELS[[...sources][0]] ?? [...sources][0]
          : 'Aksiyon';
        toast.success(`+${amount} XP — ${label}`);
      }, 250);
    },
    onLevelUp: (payload) => {
      // Level-up is the headline event — toast it without batching so the
      // player sees it land in real time. The route-level levelUpToast
      // banner in /base also fires off the cached /tier/progress poll, so
      // the two are complementary (banner = persistent CTA to /tier-up,
      // toast = ephemeral celebration).
      toast.success(
        `🎉 Seviye ${payload.newLevel}${payload.tier ? ` · Tier ${payload.tier}` : ''}`,
      );
    },
  });

  // useEffect cleanup — clear any pending throttle timer on unmount so we
  // don't leak across hot-reload boundaries in dev.
  useEffect(() => {
    return () => {
      if (pendingRef.current.t) clearTimeout(pendingRef.current.t);
    };
  }, []);

  return null; // pure side-effect component
}
