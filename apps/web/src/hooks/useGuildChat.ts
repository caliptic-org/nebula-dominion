'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GUILD_LIMITS, getGuildClient, type SendResult } from '@/lib/guild-client'
import type { GuildMember, GuildMessage } from '@/types/guild'

interface UseGuildChatOptions {
  me: { id: string; name: string; role: GuildMember['role'] }
}

export interface UseGuildChat {
  messages: GuildMessage[]
  members: GuildMember[]
  loading: boolean
  cooldownMs: number
  perMinuteRemaining: number
  perMinuteCap: number
  lastError: SendResult | null
  send: (content: string) => Promise<SendResult>
  mute: (authorId: string) => Promise<void>
  report: (messageId: string) => Promise<void>
  isOfficer: boolean
}

export function useGuildChat({ me }: UseGuildChatOptions): UseGuildChat {
  const client = useMemo(() => getGuildClient(), [])
  const [messages, setMessages] = useState<GuildMessage[]>([])
  const [members, setMembers] = useState<GuildMember[]>([])
  const [loading, setLoading] = useState(true)
  const [cooldownMs, setCooldownMs] = useState(0)
  const [perMinuteRemaining, setPerMinuteRemaining] = useState(GUILD_LIMITS.PER_MINUTE_CAP)
  const [lastError, setLastError] = useState<SendResult | null>(null)
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([client.getMessages(), client.getMembers()]).then(([m, mb]) => {
      if (cancelled) return
      setMessages(m)
      setMembers(mb)
      setLoading(false)
    })
    const unsub = client.subscribe((event) => {
      if (event.type === 'message') {
        setMessages((prev) => [...prev, event.payload].slice(-GUILD_LIMITS.MESSAGE_WINDOW))
      }
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [client])

  useEffect(() => {
    if (cooldownMs <= 0) return
    cooldownTimer.current = setInterval(() => {
      setCooldownMs((ms) => {
        const next = Math.max(0, ms - 200)
        return next
      })
    }, 200)
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    }
  }, [cooldownMs])

  const send = useCallback(
    async (content: string) => {
      const res = await client.sendMessage({
        content,
        authorId: me.id,
        authorName: me.name,
        authorRole: me.role,
      })
      if (!res.ok) {
        setLastError(res)
        if (res.rateLimit) setCooldownMs(res.rateLimit.cooldownMs)
      } else {
        setLastError(null)
        if (res.rateLimit) {
          setCooldownMs(res.rateLimit.cooldownMs)
          setPerMinuteRemaining(res.rateLimit.perMinuteRemaining)
        }
      }
      return res
    },
    [client, me.id, me.name, me.role],
  )

  const mute = useCallback(
    async (authorId: string) => {
      await client.muteAuthor(authorId)
      setMessages((prev) => prev.map((m) => (m.authorId === authorId ? { ...m, mutedAuthor: true } : m)))
    },
    [client],
  )

  const report = useCallback(
    async (messageId: string) => {
      await client.reportMessage(messageId)
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, flagged: true } : m)))
    },
    [client],
  )

  const isOfficer = me.role === 'officer' || me.role === 'leader'

  return {
    messages,
    members,
    loading,
    cooldownMs,
    perMinuteRemaining,
    perMinuteCap: GUILD_LIMITS.PER_MINUTE_CAP,
    lastError,
    send,
    mute,
    report,
    isOfficer,
  }
}
