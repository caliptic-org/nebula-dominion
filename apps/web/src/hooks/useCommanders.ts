'use client';

import { useCallback, useEffect, useState } from 'react';
import type { NDRaceKey } from '@/components/handoff/nd-tokens';
import { hasSession } from '@/lib/session';

const GAME_SERVER_BASE = (
  process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:3001'
).replace(/\/+$/, '');

/** Bonus shape mirrors game-server's CommanderBonus. All values are
 *  multipliers (0.12 = +12%, -0.18 = -18% / faster / cheaper). */
export interface CommanderBonusView {
  damageMultiplier?: number;
  defenseMultiplier?: number;
  hpMultiplier?: number;
  resourceProductionMultiplier?: number;
  trainSpeedMultiplier?: number;
  buildSpeedMultiplier?: number;
  scienceMultiplier?: number;
  trainCostMultiplier?: number;
  buildCostMultiplier?: number;
}

export interface CommanderDto {
  id: string;
  name: string;
  title: string;
  race: 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';
  level: number;
  xp: number;
  xpToNext: number;
  tier: 'BAŞ KOMUTAN' | 'TIER 2' | 'TIER 3' | 'TIER 4' | 'TIER 5';
  skill: string;
  /** Whether the player has unlocked this commander (player_commanders row
   *  exists with unlocked_at != null). The 4th-tier slot starts locked
   *  until a quest/age gate flips it. */
  unlocked: boolean;
  /** True when this commander is the player's currently-selected one. */
  isActive: boolean;
  /** True when there's a player_commanders row at all (locked or not). */
  owned: boolean;
  portrait: string;
  /** Pre-computed bonus at the player's current level — saves the FE from
   *  rebuilding the level-scale math. */
  bonusAtLevel: CommanderBonusView;
}

/**
 * Race-specific commander roster from game-server.
 *
 * Was previously hitting api's meta stub (`/api/v1/commanders`) which
 * returned a static catalog with hard-coded levels and an in-memory
 * active-commander store that vanished on container restart. Now backed
 * by `player_commanders` table + bonus engine (commit introducing
 * CommandersModule on game-server).
 *
 * Guest mode: the endpoint requires JWT, so unauthenticated callers
 * short-circuit to empty roster + loading=false. ScrCommanders falls
 * back to its static lex in that case.
 */
export function useCommanders(race: NDRaceKey | null) {
  const [commanders, setCommanders] = useState<CommanderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoster = useCallback(async () => {
    if (!hasSession()) {
      setLoading(false);
      setCommanders([]);
      return;
    }
    setLoading(true);
    try {
      const token = window.localStorage.getItem('accessToken');
      const url = race
        ? `${GAME_SERVER_BASE}/api/commanders?race=${encodeURIComponent(race)}`
        : `${GAME_SERVER_BASE}/api/commanders`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as CommanderDto[];
      setCommanders(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [race]);

  useEffect(() => {
    void fetchRoster();
  }, [fetchRoster]);

  const activate = useCallback(
    async (commanderId: string) => {
      if (!hasSession()) return;
      const token = window.localStorage.getItem('accessToken');
      const res = await fetch(
        `${GAME_SERVER_BASE}/api/commanders/${commanderId}/activate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const raw = Array.isArray(body.message) ? body.message.join(' · ') : body.message;
        throw new Error(raw || `Aktive edilemedi: ${res.status}`);
      }
      // Refetch so isActive flips on the right row and any FE consumers
      // (HUD chip, /base bonus pill) see the new active state.
      await fetchRoster();
    },
    [fetchRoster],
  );

  return { commanders, loading, error, activate, refresh: fetchRoster };
}
