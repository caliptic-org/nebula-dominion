import { getAccessToken } from './session'
import { translateBackendError } from './translate-backend-error'

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
