'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { PlayerProgress, LevelUpPayload, XpGainedPayload } from '@/types/progression';

/** Wire-shape of the `age_transition` socket event emitted by
 *  apps/game-server/src/progression/progression.gateway.ts. Distinct from
 *  AgeTransitionPayload in types/progression — that one is the component-
 *  facing shape (carries race colours + onComplete callback). The
 *  AgeTransitionListener bridges the two. */
export interface AgeTransitionWirePayload {
  previousAge: number;
  newAge: number;
  totalXpAtTransition: number;
  badge_upgrade: {
    previousBadgeTier: string | null;
    newBadgeTier: string;
    badgeLabel: string;
  };
}

type ProgressionEvent =
  | { type: 'level_up'; payload: LevelUpPayload }
  | { type: 'xp_gained'; payload: XpGainedPayload }
  | { type: 'age_transition'; payload: AgeTransitionWirePayload };

interface UseProgressionOptions {
  userId: string;
  onLevelUp?: (payload: LevelUpPayload) => void;
  onXpGained?: (payload: XpGainedPayload) => void;
  onAgeTransition?: (payload: AgeTransitionWirePayload) => void;
}

export function useProgression({ userId, onLevelUp, onXpGained, onAgeTransition }: UseProgressionOptions) {
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ProgressionEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);
  // Progression module lives on game-server, NOT the api service. Earlier
  // versions of this hook hit `${NEXT_PUBLIC_API_URL}/progression/:id`
  // which resolved to api-nebula.caliptic.com/progression/:id → 404 every
  // single time (api has /tier/* not /progression/*). Switched to
  // game-server's URL + /api/progression/:id path. Also passes the JWT
  // because the route is HttpJwtGuard-protected — without it we'd get
  // 401 instead of 404 (still wrong but less obviously so).
  const gameServerBase = (
    process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:3001'
  ).replace(/\/+$/, '');

  const fetchProgress = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      // Read token from the same storage key the rest of the app uses.
      // Without auth this 401s; we treat that as "no progression yet"
      // and leave progress null so guarded screens render gracefully.
      const token = typeof window !== 'undefined'
        ? window.localStorage.getItem('accessToken')
        : null;
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${gameServerBase}/api/progression/${userId}`, { headers });
      if (res.ok) setProgress(await res.json());
    } finally {
      setLoading(false);
    }
  }, [userId, gameServerBase]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  useEffect(() => {
    if (!userId) return;
    const socket = io(`${process.env.NEXT_PUBLIC_GAME_SERVER_URL}/game`, {
      auth: { userId },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('level_up', (payload: LevelUpPayload) => {
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              level: payload.newLevel,
              tier: payload.tier,
              unlockedContent: [...prev.unlockedContent, ...payload.newUnlocks],
            }
          : prev,
      );
      setEvents((prev) => [{ type: 'level_up' as const, payload }, ...prev].slice(0, 20));
      onLevelUp?.(payload);
    });

    socket.on('xp_gained', (payload: XpGainedPayload) => {
      setProgress((prev) =>
        prev
          ? { ...prev, currentXp: payload.currentXp, xpToNextLevel: payload.xpToNext }
          : prev,
      );
      setEvents((prev) => [{ type: 'xp_gained' as const, payload }, ...prev].slice(0, 20));
      onXpGained?.(payload);
    });

    socket.on('age_transition', (payload: AgeTransitionWirePayload) => {
      setProgress((prev) =>
        prev ? { ...prev, age: payload.newAge } : prev,
      );
      setEvents((prev) => [{ type: 'age_transition' as const, payload }, ...prev].slice(0, 20));
      onAgeTransition?.(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, onLevelUp, onXpGained, onAgeTransition]);

  return { progress, loading, events };
}
