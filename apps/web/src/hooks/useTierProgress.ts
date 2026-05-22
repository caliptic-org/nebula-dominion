'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  tierApi,
  xpProgressPercent,
  type TierLevel,
  type TierProgressView,
  type TierRequirementsView,
} from '@/lib/tier-api';
import { FetchError } from '@/lib/api';

interface UseTierProgressResult {
  progress: TierProgressView | null;
  requirements: TierRequirementsView | null;
  levels: TierLevel[];
  loading: boolean;
  error: string | null;
  xpPercent: number;
  refresh: () => Promise<void>;
  levelUp: () => Promise<TierProgressView>;
}

/**
 * Loads tier state from /tier/progress + /tier/requirements + /tier/levels.
 * Falls back gracefully when the user is unauthenticated (e.g. demo route):
 * the static 54-level catalog still loads so the page renders something
 * useful instead of an empty error state.
 */
export function useTierProgress(): UseTierProgressResult {
  const [progress, setProgress] = useState<TierProgressView | null>(null);
  const [requirements, setRequirements] = useState<TierRequirementsView | null>(null);
  const [levels, setLevels] = useState<TierLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      tierApi.getProgress(),
      tierApi.getRequirements(),
      tierApi.listLevels(),
    ]);
    if (results[0].status === 'fulfilled') setProgress(results[0].value);
    if (results[1].status === 'fulfilled') setRequirements(results[1].value);
    if (results[2].status === 'fulfilled') setLevels(results[2].value);

    const firstError = results.find((r) => r.status === 'rejected') as
      | PromiseRejectedResult
      | undefined;
    if (firstError) {
      const reason = firstError.reason;
      if (reason instanceof FetchError && reason.status === 401) {
        setError('Tier ilerlemesini görmek için giriş yap');
      } else if (reason instanceof Error) {
        setError(reason.message);
      } else {
        setError('Tier verisi yüklenemedi');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const levelUp = useCallback(async () => {
    const next = await tierApi.levelUp();
    setProgress(next);
    const reqs = await tierApi.getRequirements().catch(() => null);
    setRequirements(reqs);
    return next;
  }, []);

  return {
    progress,
    requirements,
    levels,
    loading,
    error,
    xpPercent: progress ? xpProgressPercent(progress) : 0,
    refresh: load,
    levelUp,
  };
}
