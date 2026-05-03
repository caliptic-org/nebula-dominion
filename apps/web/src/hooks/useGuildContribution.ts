'use client'

import { useEffect, useMemo, useState } from 'react'
import { getGuildClient } from '@/lib/guild-client'
import type { ContributionEntry, MyContributionSummary } from '@/types/guild'

export interface UseGuildContribution {
  leaderboard: ContributionEntry[]
  summary: MyContributionSummary | null
  loading: boolean
}

export function useGuildContribution(): UseGuildContribution {
  const client = useMemo(() => getGuildClient(), [])
  const [leaderboard, setLeaderboard] = useState<ContributionEntry[]>([])
  const [summary, setSummary] = useState<MyContributionSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([client.getContributionLeaderboard(), client.getMyContributionSummary()]).then(([l, s]) => {
      if (cancelled) return
      setLeaderboard(l)
      setSummary(s)
      setLoading(false)
    })

    const refresh = setInterval(async () => {
      const [l, s] = await Promise.all([
        client.getContributionLeaderboard(),
        client.getMyContributionSummary(),
      ])
      if (cancelled) return
      setLeaderboard(l)
      setSummary(s)
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(refresh)
    }
  }, [client])

  return { leaderboard, summary, loading }
}
