import { getAccessToken } from './session'
import { FetchError } from './fetcher'

/* Game-server HTTP client (companion to ./fetcher.ts).
 *
 * Why this exists — DRIFT-01 fix:
 *   The guild HTTP surface (search/create/join/donate/membership/tutorial,
 *   plus chat + donate-fulfill flows used by guild-client.ts) lives on the
 *   **game-server** under the `/api/guilds/*` route prefix, NOT on the `api`
 *   service. The original `fetcher.ts` points at `NEXT_PUBLIC_API_URL`
 *   (the `api` host) with no `/api/v1` suffix, so a call like
 *   `fetcher('/guilds/me/membership')` would hit:
 *
 *       https://api-nebula.caliptic.com/guilds/me/membership   → 404
 *
 *   The correct target is:
 *
 *       https://game-nebula.caliptic.com/api/guilds/me/membership
 *
 *   This module routes all guild calls through `NEXT_PUBLIC_GAME_SERVER_URL`
 *   with the `/api` global prefix that game-server boots with
 *   (`app.setGlobalPrefix('api')` in apps/game-server/src/main.ts).
 *
 *   The shared `JWT_SECRET` between `api` and `game-server` (see CLAUDE.md
 *   §1 "JWT cross-service token") means the same bearer token authorises
 *   both surfaces — we only need to swap the base URL, not re-mint a token.
 *
 *   `FetchError` is re-exported from `./fetcher` so existing call-sites that
 *   do `instanceof FetchError` (guildApi.ts, guild-client.ts, useGuildTutorial.tsx)
 *   keep working without changes.
 *
 * Routing matrix:
 *   /guilds/*            → game-server:3001/api/guilds/*
 *   (other paths)        → still use fetcher.ts (api service)
 */

const RAW = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:3001'
const NORMALIZED = RAW.replace(/\/+$/, '')
const BASE_URL = /\/api$/.test(NORMALIZED) ? NORMALIZED : `${NORMALIZED}/api`

export async function gameFetcher<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const info = await res.json().catch(() => ({}))
    const message =
      (info as { message?: string }).message ??
      `Request failed: ${res.status} ${res.statusText}`
    throw new FetchError(message, res.status, info)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// Re-export so callers can keep importing FetchError from a single place
// alongside the fetcher they use.
export { FetchError }
