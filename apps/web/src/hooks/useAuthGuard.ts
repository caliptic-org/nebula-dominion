'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FetchError } from '@/lib/fetcher'

export function useAuthGuard(error: unknown) {
  const router = useRouter()

  useEffect(() => {
    if (error instanceof FetchError && error.status === 401) {
      router.replace('/login')
    }
  }, [error, router])
}
