/* Race selection + profile API client.
 *
 * Frontend uses Turkish race keys (insan/zerg/otomat/canavar/seytan) for
 * design tokens, animations, and copy. Backend (apps/api) persists race as
 * an English enum (human/zerg/automaton/beast/demon). This client converts
 * at the boundary so neither side has to learn the other's vocabulary.
 */

import { api } from './api';
import type { NDRaceKey } from '@/components/handoff/nd-tokens';

export type BackendRace = 'human' | 'zerg' | 'automaton' | 'beast' | 'demon';

const FE_TO_BE: Record<NDRaceKey, BackendRace> = {
  insan: 'human',
  zerg: 'zerg',
  otomat: 'automaton',
  canavar: 'beast',
  seytan: 'demon',
};

const BE_TO_FE: Record<BackendRace, NDRaceKey> = {
  human: 'insan',
  zerg: 'zerg',
  automaton: 'otomat',
  beast: 'canavar',
  demon: 'seytan',
};

export const toBackendRace = (race: NDRaceKey): BackendRace => FE_TO_BE[race];
export const toFrontendRace = (race: BackendRace): NDRaceKey => BE_TO_FE[race];

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  race: BackendRace | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileView extends Omit<UserProfile, 'race'> {
  /** Backend race string (canonical persistence form). */
  race: BackendRace | null;
  /** Frontend race key, derived from `race`. `null` when unselected. */
  raceKey: NDRaceKey | null;
}

function toView(p: UserProfile): UserProfileView {
  return { ...p, raceKey: p.race ? BE_TO_FE[p.race] : null };
}

/**
 * Mirror the backend-confirmed race into localStorage so subsequent renders
 * — including the next page's theme provider — pick up the right race
 * without needing another network round-trip. Used by the post-login flow
 * when the user might have committed to a race on a different device.
 */
const RACE_COMMITMENT_KEY = 'nebula:race-commitment:v1';

export function syncRaceCommitmentFromBackend(race: NDRaceKey): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      RACE_COMMITMENT_KEY,
      JSON.stringify({ race, committedAt: Date.now() }),
    );
  } catch {
    /* localStorage may throw in private mode — best-effort. */
  }
}

export const raceApi = {
  async getProfile(): Promise<UserProfileView> {
    const p = await api.get<UserProfile>('/users/profile');
    return toView(p);
  },

  async updateProfile(patch: { username?: string }): Promise<UserProfileView> {
    const p = await api.patch<UserProfile>('/users/profile', patch);
    return toView(p);
  },

  async selectRace(race: NDRaceKey): Promise<UserProfileView> {
    const p = await api.post<UserProfile>('/users/select-race', {
      race: FE_TO_BE[race],
    });
    return toView(p);
  },
};
