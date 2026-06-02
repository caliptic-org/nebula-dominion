'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormationScreenND } from '@/components/formation/FormationScreenND';
import { getAccessToken } from '@/lib/session';

/* Resolves the player's UUID from the JWT `sub` claim. Used by the
 * formation backend to look up saved formations. Auth-only screen —
 * unauthenticated visitors redirect to /login rather than firing
 * /formations?playerId=00000000-...-001 with a placeholder UUID
 * (which produced 401 spam on every navigation per the prod audit). */
function playerIdFromToken(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(
      typeof atob === 'function' ? atob(padded.replace(/-/g, '+').replace(/_/g, '/')) : '',
    ) as { sub?: string };
    return json.sub ?? null;
  } catch {
    return null;
  }
}

export default function FormationPage() {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  useEffect(() => {
    const id = playerIdFromToken();
    if (!id) {
      // No session → bounce to login instead of letting the inner
      // component fire authenticated fetches with a placeholder UUID.
      router.replace('/login?next=/formation');
      return;
    }
    setPlayerId(id);
  }, [router]);
  if (!playerId) return null;
  return <FormationScreenND playerId={playerId} />;
}
