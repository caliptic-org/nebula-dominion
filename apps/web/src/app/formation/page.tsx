'use client';

import { useEffect, useState } from 'react';
import { FormationScreen } from '@/components/formation/FormationScreen';
import { getAccessToken } from '@/lib/session';

/* The formation backend wants a UUID. We decode it from the live JWT (sub
 * claim is the user's UUID) instead of using a hardcoded demo id — which
 * was previously causing 404s on /units/player/<demo> for every visit.
 * Falls back to the demo id only when there's no session at all, so guest
 * navigation still doesn't crash. */
const DEMO_PLAYER_ID = '00000000-0000-4000-8000-000000000001';

function playerIdFromToken(): string {
  const token = getAccessToken();
  if (!token) return DEMO_PLAYER_ID;
  try {
    const payload = token.split('.')[1];
    if (!payload) return DEMO_PLAYER_ID;
    // JWT payload is base64url; pad if needed.
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(
      typeof atob === 'function' ? atob(padded.replace(/-/g, '+').replace(/_/g, '/')) : '',
    ) as { sub?: string };
    return json.sub ?? DEMO_PLAYER_ID;
  } catch {
    return DEMO_PLAYER_ID;
  }
}

export default function FormationPage() {
  const [playerId, setPlayerId] = useState(DEMO_PLAYER_ID);
  useEffect(() => {
    setPlayerId(playerIdFromToken());
  }, []);
  return <FormationScreen playerId={playerId} />;
}
