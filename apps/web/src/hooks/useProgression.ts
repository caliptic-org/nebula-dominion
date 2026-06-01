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
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const fetchProgress = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/progression/${userId}`);
      if (res.ok) setProgress(await res.json());
    } finally {
      setLoading(false);
    }
  }, [userId, apiBase]);

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
