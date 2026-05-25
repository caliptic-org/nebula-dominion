import { clearTokens, getAccessToken } from './session'
import { translateBackendError } from './translate-backend-error'

/* Module-level guard so simultaneous 401s (HUD poll + battle-history fetch
 * + buffs poll firing in the same tick) only trigger ONE redirect.  Without
 * this, multiple in-flight requests each call window.location.replace and
 * the browser thrashes between intermediate states. Reset is implicit on
 * page reload. */
let redirectingTo401: boolean = false

/* Pathnames where a 401 shouldn't auto-redirect. /login itself obviously,
 * plus /register and /splash which are the entry doors that can legally
 * 401 (e.g. a bad password attempt). */
const NO_REDIRECT_PATHS = new Set<string>([
  '/login',
  '/register',
  '/splash',
  '/',
])

/* Exported so game-server-api.ts (separate HTTP client) shares the same
 * guard flag — otherwise both clients could fire concurrent redirects. */
export function maybeRedirectToLogin(): void {
  if (typeof window === 'undefined') return
  if (redirectingTo401) return
  if (NO_REDIRECT_PATHS.has(window.location.pathname)) return
  redirectingTo401 = true
  clearTokens()
  // Preserve where the player was so post-login we can route them back.
  const here = window.location.pathname + window.location.search
  const next = encodeURIComponent(here)
  window.location.replace(`/login?next=${next}&reason=expired`)
}

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const NORMALIZED = RAW_API_URL.replace(/\/+$/, '')
const BASE_URL = /\/api\/v1$/.test(NORMALIZED) ? NORMALIZED : `${NORMALIZED}/api/v1`

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

export class FetchError extends Error {
  readonly status: number
  readonly statusText: string
  readonly data: unknown

  constructor(status: number, statusText: string, message: string, data: unknown) {
    super(message)
    this.name = 'FetchError'
    this.status = status
    this.statusText = statusText
    this.data = data
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, ...rest } = options
  const token = getAccessToken()

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    // 401 with a sent token = expired/invalid session.  Most call sites
    // swallow this silently (just sets `error` on a hook) so the player
    // sees half-loaded screens.  Force a clean logout-and-redirect so the
    // session restarts deterministically.  Skips redirect when no token
    // was sent (legitimate 401 on a public/login endpoint).
    if (res.status === 401 && token) {
      maybeRedirectToLogin()
    }
    const data = await res.json().catch(() => ({}))
    // NestJS returns either {message: "..."} or {message: ["...", "..."]}
    // (class-validator multi-error case). Flatten then translate to Turkish
    // so toast.error(err.message) renders in the UI language.
    const raw = (data as { message?: string | string[] }).message
    const flat =
      Array.isArray(raw) ? raw.join(' · ')
      : typeof raw === 'string' ? raw
      : `API error: ${res.status} ${res.statusText}`
    const message = translateBackendError(flat)
    throw new FetchError(res.status, res.statusText, message, data)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'GET' }),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
}
