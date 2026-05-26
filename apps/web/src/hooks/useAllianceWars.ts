'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';

/* Alliance wars client — wraps GET /api/v1/alliance-wars/:allianceId.
 *
 * Backs the alliance page's "Savaş" tab. Returns the raw backend rows so
 * the consumer can format opponent labels, scores, and status pills from
 * the relations (attacker + defender). `refresh()` lets the declare-war
 * modal force a re-fetch after a successful POST. */

export interface AllianceSummaryDto {
  id: string;
  name: string;
  tag: string;
}

export interface AllianceWarDto {
  id: string;
  attackerId: string;
  defenderId: string;
  attacker?: AllianceSummaryDto | null;
  defender?: AllianceSummaryDto | null;
  status: 'declared' | 'active' | 'truce' | 'ended';
  attackerScore: number;
  defenderScore: number;
  winnerId: string | null;
  declaredAt: string;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseAllianceWarsResult {
  wars: AllianceWarDto[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAllianceWars(allianceId: string | null | undefined): UseAllianceWarsResult {
  const [wars, setWars] = useState<AllianceWarDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!allianceId) {
      setWars([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<AllianceWarDto[]>(`/alliance-wars/${allianceId}`)
      .then((data) => {
        if (!cancelled) setWars(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof FetchError && err.status === 401) {
          // Guest read of an alliance's wars — treat as empty rather than
          // surfacing a misleading "auth required" error to the panel.
          setWars([]);
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allianceId, tick]);

  return { wars, loading, error, refresh };
}
