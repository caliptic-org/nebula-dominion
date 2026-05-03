const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export class FetchError extends Error {
  status: number
  info?: unknown

  constructor(message: string, status: number, info?: unknown) {
    super(message)
    this.status = status
    this.info = info
  }
}

export async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
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
