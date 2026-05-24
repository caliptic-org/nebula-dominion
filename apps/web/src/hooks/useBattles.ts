'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '') + '/api/v1';

export interface BattleStateDto {
  id: string;
  attackerRace: string;
  defenderRace: string;
  status: 'pending' | 'in-progress' | 'won' | 'lost';
  turnsElapsed: number;
  maxTurns: number;
  winProb: number;
  log: { turn: number; text: string }[];
  rewards: { gold: number; gems: number; xp: number };
  createdAt: string;
}

export interface FormationDto {
  id: string;
  name: string;
  slots: { idx: number; unitType: string; count: number }[];
  power: number;
}

/* Battle state machine client.
 *
 *   - `startBattle(attacker, defender)` → creates a new battle, returns state
 *   - `pollBattle(id)` → refetches; the stub advances one turn per call so a
 *     simple interval drives the in-progress animation forward
 *   - `loadLastBattle()` → returns the most recent battle (for /battle-result)
 *
 * The hook does not auto-poll; the consumer drives ticks so battle-result can
 * settle on the final state without extra rolls. */
export function useBattles() {
  const [state, setState] = useState<BattleStateDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startBattle = useCallback(async (attackerRace: string, defenderRace: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/battles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attackerRace, defenderRace }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as BattleStateDto;
      setState(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const pollBattle = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/battles/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as BattleStateDto;
      setState(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, []);

  const loadLastBattle = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/battles/me/last`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as BattleStateDto | null;
      if (data) setState(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { state, loading, error, startBattle, pollBattle, loadLastBattle };
}

/* Standalone helper: fetch the default formation saved for the player.
 * /battle-prep uses this to seed the formation grid. POST back when the
 * player customises (handled by the page, not this hook). */
export function useFormation() {
  const [formation, setFormation] = useState<FormationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetch(`${API_BASE}/battle-prep/formation`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as FormationDto;
      })
      .then(setFormation)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  return { formation, loading, error };
}
