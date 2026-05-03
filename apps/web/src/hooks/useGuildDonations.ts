'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GUILD_LIMITS, getGuildClient, type CreateRequestResult, type DonateResult } from '@/lib/guild-client'
import type { DailyLimits, DonationRequest, GuildResource } from '@/types/guild'

interface UseGuildDonationsOptions {
  me: { id: string; name: string }
}

export interface UseGuildDonations {
  requests: DonationRequest[]
  limits: DailyLimits | null
  loading: boolean
  cooldownFor: (memberId: string) => string | null
  createRequest: (input: { resource: GuildResource; amount: number }) => Promise<CreateRequestResult>
  donate: (input: { requestId: string; amount: number }) => Promise<DonateResult>
}

export function useGuildDonations({ me }: UseGuildDonationsOptions): UseGuildDonations {
  const client = useMemo(() => getGuildClient(), [])
  const [requests, setRequests] = useState<DonationRequest[]>([])
  const [limits, setLimits] = useState<DailyLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [, forceTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([client.getDonationRequests(), client.getDailyLimits()]).then(([r, l]) => {
      if (cancelled) return
      setRequests(r)
      setLimits(l)
      setLoading(false)
    })
    const unsub = client.subscribe((event) => {
      if (event.type === 'donation:created') {
        setRequests((prev) => [event.payload, ...prev])
      } else if (event.type === 'donation:fulfilled') {
        setRequests((prev) => prev.map((r) => (r.id === event.payload.id ? event.payload : r)))
      } else if (event.type === 'donation:expired') {
        setRequests((prev) => prev.filter((r) => r.id !== event.payload.id))
      }
    })
    const tick = setInterval(() => forceTick((t) => t + 1), 1000)
    return () => {
      cancelled = true
      unsub()
      clearInterval(tick)
    }
  }, [client])

  useEffect(() => {
    setRequests((prev) => prev.filter((r) => new Date(r.expiresAt).getTime() > Date.now()))
  })

  const cooldownFor = useCallback((memberId: string) => client.getCooldownFor(memberId), [client])

  const createRequest = useCallback(
    async (input: { resource: GuildResource; amount: number }) => {
      const res = await client.createRequest({
        requesterId: me.id,
        requesterName: me.name,
        resource: input.resource,
        amount: input.amount,
      })
      if (res.ok) {
        const next = await client.getDailyLimits()
        setLimits(next)
      }
      return res
    },
    [client, me.id, me.name],
  )

  const donate = useCallback(
    async (input: { requestId: string; amount: number }) => {
      const res = await client.donate({
        requestId: input.requestId,
        donorId: me.id,
        donorName: me.name,
        amount: input.amount,
      })
      if (res.ok) {
        const next = await client.getDailyLimits()
        setLimits(next)
      }
      return res
    },
    [client, me.id, me.name],
  )

  return {
    requests,
    limits,
    loading,
    cooldownFor,
    createRequest,
    donate,
  }
}

export const GUILD_DONATION_LIMITS = {
  REQUESTS_PER_DAY: GUILD_LIMITS.REQUESTS_PER_DAY,
  DONATES_PER_DAY: GUILD_LIMITS.DONATES_PER_DAY,
  SAME_TARGET_COOLDOWN_HOURS: GUILD_LIMITS.SAME_TARGET_COOLDOWN_HOURS,
  REQUEST_TTL_HOURS: GUILD_LIMITS.REQUEST_TTL_HOURS,
}
