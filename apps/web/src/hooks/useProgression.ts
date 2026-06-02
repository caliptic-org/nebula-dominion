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
  const [advancing, setAdvancing] = useState(false);
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
    // transports: socket.io's default is ['polling', 'websocket'] —
    // polling first then upgrade to WS. Earlier this hook hardcoded
    // ['websocket'] (skip polling, go straight to upgrade) which is
    // faster on a clean stack BUT fails outright when the WS upgrade
    // path is blocked. On prod, Cloudflare Tunnel → bastion nginx →
    // LXC reverse-proxy chain isn't passing the Upgrade header
    // through cleanly for /socket.io/ — polling probe returns a sid
    // happily, WS probe gets dropped before the handshake completes.
    // Result: every page mount spammed "WebSocket is closed before
    // the connection is established" into the console. Including
    // polling in the transport list gives socket.io a working fall-
    // back so the warning goes away and event delivery still works
    // (just over HTTP long-poll instead of WS). Surfaced by the
    // run-5 autonomous playtest.
    const socket = io(`${process.env.NEXT_PUBLIC_GAME_SERVER_URL}/game`, {
      auth: { userId },
      transports: ['polling', 'websocket'],
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

  const advanceAge = useCallback(async () => {
    if (!userId || advancing) return;
    setAdvancing(true);
    try {
      const token =
        typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
      const res = await fetch(
        `${gameServerBase}/api/progression/${userId}/advance-age`,
        { method: 'POST', headers },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const raw = Array.isArray(body.message) ? body.message.join(' · ') : body.message;
        throw new Error(raw || `Çağ geçişi reddedildi: ${res.status}`);
      }
      // Backend returns { progress, eraPackage }. Refetch the progress
      // DTO via the canonical endpoint so canAdvanceAge / xpToNextLevel /
      // unlockedContent all land in one shape rather than spreading the
      // shallow merge across two divergent shapes.
      await fetchProgress();
    } finally {
      setAdvancing(false);
    }
  }, [userId, gameServerBase, fetchProgress, advancing]);

  return { progress, loading, events, advanceAge, advancing, refresh: fetchProgress };
}
