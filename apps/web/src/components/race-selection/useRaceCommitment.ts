'use client';

import { useCallback, useEffect, useState } from 'react';
import { Race } from '@/types/units';

const STORAGE_KEY = 'nebula:race-commitment:v1';
const REROLL_WINDOW_MS = 24 * 60 * 60 * 1000;

interface CommitmentRecord {
  race: Race;
  committedAt: number;
  rerolled: boolean;
}

interface RaceCommitment {
  committed: Race | null;
  committedAt: number | null;
  rerollUsed: boolean;
  rerollAvailable: boolean;
  rerollExpiresAt: number | null;
  remainingMs: number;
  commit: (race: Race) => void;
  reroll: (race: Race) => boolean;
  reset: () => void;
}

function readRecord(): CommitmentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CommitmentRecord;
    if (!parsed.race || typeof parsed.committedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRecord(record: CommitmentRecord | null) {
  if (typeof window === 'undefined') return;
  try {
    if (record === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage may be unavailable (private mode); ignore.
  }
}

export function useRaceCommitment(): RaceCommitment {
  const [record, setRecord] = useState<CommitmentRecord | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setRecord(readRecord());
  }, []);

  useEffect(() => {
    if (!record) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [record]);

  const commit = useCallback((race: Race) => {
    const next: CommitmentRecord = { race, committedAt: Date.now(), rerolled: false };
    writeRecord(next);
    setRecord(next);
    setNow(Date.now());
  }, []);

  const reroll = useCallback(
    (race: Race): boolean => {
      if (!record || record.rerolled) return false;
      const elapsed = Date.now() - record.committedAt;
      if (elapsed > REROLL_WINDOW_MS) return false;
      const next: CommitmentRecord = { race, committedAt: record.committedAt, rerolled: true };
      writeRecord(next);
      setRecord(next);
      setNow(Date.now());
      return true;
    },
    [record],
  );

  const reset = useCallback(() => {
    writeRecord(null);
    setRecord(null);
  }, []);

  const committedAt = record?.committedAt ?? null;
  const rerollExpiresAt = committedAt !== null ? committedAt + REROLL_WINDOW_MS : null;
  const remainingMs =
    rerollExpiresAt !== null ? Math.max(0, rerollExpiresAt - now) : 0;
  const rerollAvailable =
    record !== null && !record.rerolled && remainingMs > 0;

  return {
    committed: record?.race ?? null,
    committedAt,
    rerollUsed: record?.rerolled ?? false,
    rerollAvailable,
    rerollExpiresAt,
    remainingMs,
    commit,
    reroll,
    reset,
  };
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}
