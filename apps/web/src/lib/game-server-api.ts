import { getAccessToken } from './session';
import { FetchError, maybeRedirectToLogin } from './api';
import { translateBackendError } from './translate-backend-error';

/* Game-server HTTP client.
 *
 * Mirrors `lib/api.ts` but points at `NEXT_PUBLIC_GAME_SERVER_URL` and
 * prefixes paths with `/api` (game-server's global prefix). The bearer
 * token is the same one issued by api `/auth/login` — both services now
 * share `JWT_SECRET`, so an api-issued token authorises game-server
 * routes guarded by `HttpJwtGuard`.
 *
 * Endpoints reachable from here:
 *   GET  /api/buildings/types        (public)
 *   GET  /api/buildings              (JWT)
 *   POST /api/buildings              (JWT)
 *   GET  /api/units/configs/:race    (public)
 *   GET  /api/units                  (JWT)
 *   POST /api/units/train            (JWT)
 *   GET  /api/units/training-queue   (JWT)
 */

const RAW = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:3001';
const NORMALIZED = RAW.replace(/\/+$/, '');
const BASE_URL = /\/api$/.test(NORMALIZED) ? NORMALIZED : `${NORMALIZED}/api`;

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, ...rest } = options;
  const token = getAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    // 401 with a sent token = expired/invalid session.  Game-server polls
    // (useGameResources, useGameBuildings, useTrainingQueue) fire on a 5-30s
    // cadence so an expired token would spam silent 401s; route to /login
    // once via the shared guard in api.ts.
    if (res.status === 401 && token) {
      maybeRedirectToLogin();
    }
    const data = await res.json().catch(() => ({}));
    // NestJS returns either {message: "..."} or {message: ["...", "..."]}
    // — flatten then translate to Turkish so toast.error(err.message)
    // renders in the UI language.
    const raw = (data as { message?: string | string[] }).message;
    const flat =
      Array.isArray(raw) ? raw.join(' · ')
      : typeof raw === 'string' ? raw
      : `Game-server error: ${res.status} ${res.statusText}`;
    const message = translateBackendError(flat);
    throw new FetchError(res.status, res.statusText, message, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const gameServerApi = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'GET' }),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),

  /** Advance the player to the next age. game-server-side gate checks
   *  command_center.level >= getMaxLevel(currentAge) before transitioning.
   *  Throws BadRequest if the HQ isn't high enough (with Turkish message). */
  advanceAge: <T = unknown>(userId: string) =>
    request<T>(`/progression/${userId}/advance-age`, { method: 'POST' }),
};
