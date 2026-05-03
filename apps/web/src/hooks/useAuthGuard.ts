'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FetchError as ApiFetchError } from '@/lib/api'
import { FetchError } from '@/lib/fetcher'
import { clearTokens } from '@/lib/session'

/**
 * Watches a fetch error from SWR or hooks and bounces the user back to
 * /login on a 401, clearing any stale tokens so the next request doesn't
 * silently re-fail with the same expired bearer.
 */
export function useAuthGuard(error: unknown) {
  const router = useRouter()

  useEffect(() => {
    if (!error) return
    const status =
      error instanceof FetchError || error instanceof ApiFetchError
        ? error.status
        : null
    if (status === 401) {
      clearTokens()
      router.replace('/login')
    }
  }, [error, router])
}
