'use client';

import { useEffect, useState } from 'react';
import { FormationScreenND } from '@/components/formation/FormationScreenND';
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
  // Hold null until after mount so the FormationScreenND's first render (and
  // its initial fetches against /units/player/:id) only fires AFTER we've
  // resolved the real user UUID from the JWT. Avoids the double-fetch +
  // 404 the previous version caused (demo id → real id → both fetched).
  /* MERGE: kept HEAD's JWT-resolved playerId on top of remote's ND
   * component (FormationScreenND). */
  const [playerId, setPlayerId] = useState<string | null>(null);
  useEffect(() => {
    setPlayerId(playerIdFromToken());
  }, []);
  if (!playerId) return null;
  return <FormationScreenND playerId={playerId} />;
}
