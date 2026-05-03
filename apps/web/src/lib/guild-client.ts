'use client'

import type {
  ContributionEntry,
  DailyLimits,
  DonationRequest,
  GuildMember,
  GuildMessage,
  GuildResource,
  GuildSocketEvent,
  MyContributionSummary,
  RateLimitState,
} from '@/types/guild'

const PROFANITY = ['badword1', 'badword2', 'spam']

const MESSAGE_WINDOW = 200
const PER_MINUTE_CAP = 20
const COOLDOWN_MS = 1000
const REQUESTS_PER_DAY = 5
const DONATES_PER_DAY = 10
const SAME_TARGET_COOLDOWN_HOURS = 4
const REQUEST_TTL_HOURS = 4
const DAILY_CONTRIBUTION_CAP = 200

export const GUILD_LIMITS = {
  MESSAGE_WINDOW,
  PER_MINUTE_CAP,
  COOLDOWN_MS,
  REQUESTS_PER_DAY,
  DONATES_PER_DAY,
  SAME_TARGET_COOLDOWN_HOURS,
  REQUEST_TTL_HOURS,
  DAILY_CONTRIBUTION_CAP,
}

type Listener = (event: GuildSocketEvent) => void

const isMockMode = () =>
  process.env.NEXT_PUBLIC_GUILD_BACKEND_READY !== 'true'

export interface SendResult {
  ok: boolean
  reason?: 'rate_limit' | 'profanity' | 'muted' | 'unknown'
  message?: GuildMessage
  rateLimit?: RateLimitState
}

export interface DonateResult {
  ok: boolean
  reason?: 'limit' | 'spam_guard' | 'expired' | 'unknown'
  unlocksAt?: string
  request?: DonationRequest
}

export interface CreateRequestResult {
  ok: boolean
  reason?: 'limit' | 'unknown'
  request?: DonationRequest
}

interface SendMessageInput {
  content: string
  authorId: string
  authorName: string
  authorRole: GuildMember['role']
}

interface CreateRequestInput {
  requesterId: string
  requesterName: string
  resource: GuildResource
  amount: number
}

interface DonateInput {
  requestId: string
  donorId: string
  donorName: string
  amount: number
}

class MockGuildClient {
  private members: GuildMember[] = [
    { id: 'me', name: 'Komutan', role: 'officer', online: true, avatarColor: 'var(--color-brand)' },
    { id: 'm-1', name: 'Vex Talon', role: 'leader', online: true, avatarColor: 'var(--color-accent)' },
    { id: 'm-2', name: 'Astra Kael', role: 'officer', online: true, avatarColor: 'var(--color-energy)' },
    { id: 'm-3', name: 'Riven', role: 'member', online: true, avatarColor: 'var(--color-success)' },
    { id: 'm-4', name: 'Nyx-7', role: 'member', online: false, avatarColor: 'var(--color-warning)' },
    { id: 'm-5', name: 'Halcyon', role: 'member', online: true, avatarColor: 'var(--color-info)' },
  ]

  private messages: GuildMessage[] = [
    {
      id: 'msg-seed-1',
      authorId: 'm-1',
      authorName: 'Vex Talon',
      authorRole: 'leader',
      content: 'Bu hafta raid çarşamba 21:00. Hazır olun komutanlar.',
      createdAt: this.iso(-1800),
    },
    {
      id: 'msg-seed-2',
      authorId: 'm-3',
      authorName: 'Riven',
      authorRole: 'member',
      content: 'Sektör 7 tarama tamam. Mineral cebi var, koordinatları DM atıyorum.',
      createdAt: this.iso(-1500),
    },
    {
      id: 'msg-seed-3',
      authorId: 'm-2',
      authorName: 'Astra Kael',
      authorRole: 'officer',
      content: 'Yeni gelenlere hatırlatma: bağış limiti günlük 5 talep / 10 gönderim.',
      createdAt: this.iso(-900),
    },
  ]

  private requests: DonationRequest[] = [
    {
      id: 'req-1',
      requesterId: 'm-3',
      requesterName: 'Riven',
      resource: 'mineral',
      amount: 420,
      createdAt: this.iso(-1200),
      expiresAt: this.iso(60 * 60 * 3),
      fulfilledBy: [{ memberId: 'm-2', memberName: 'Astra Kael', amount: 120 }],
    },
    {
      id: 'req-2',
      requesterId: 'm-5',
      requesterName: 'Halcyon',
      resource: 'gas',
      amount: 280,
      createdAt: this.iso(-300),
      expiresAt: this.iso(60 * 60 * 3.7),
      fulfilledBy: [],
    },
  ]

  private contribution = {
    me: { donate: 3, receive: 1, chat: 4, score: 38, weeklyRank: 4 },
    perMember: new Map<string, { donate: number; receive: number; chat: number; score: number }>([
      ['m-1', { donate: 8, receive: 2, chat: 5, score: 86 }],
      ['m-2', { donate: 6, receive: 4, chat: 5, score: 70 }],
      ['m-3', { donate: 4, receive: 5, chat: 3, score: 51 }],
      ['m-4', { donate: 2, receive: 3, chat: 1, score: 26 }],
      ['m-5', { donate: 5, receive: 1, chat: 4, score: 54 }],
    ]),
  }

  private dailyLimits: DailyLimits = {
    requestsRemaining: REQUESTS_PER_DAY - 1,
    requestsCap: REQUESTS_PER_DAY,
    donatesRemaining: DONATES_PER_DAY - 2,
    donatesCap: DONATES_PER_DAY,
    resetAt: this.endOfDayIso(),
  }

  private cooldowns = new Map<string, string>()
  private mutedAuthors = new Set<string>()
  private rateState: RateLimitState = {
    cooldownMs: 0,
    perMinuteRemaining: PER_MINUTE_CAP,
    perMinuteCap: PER_MINUTE_CAP,
  }
  private lastSentAt = 0
  private windowStart = Date.now()
  private listeners = new Set<Listener>()
  private ambientTimer: ReturnType<typeof setInterval> | null = null

  private iso(offsetSec: number): string {
    return new Date(Date.now() + offsetSec * 1000).toISOString()
  }

  private endOfDayIso(): string {
    const now = new Date()
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    return end.toISOString()
  }

  private uid(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
  }

  private emit(event: GuildSocketEvent) {
    this.listeners.forEach((l) => l(event))
  }

  private startAmbient() {
    if (this.ambientTimer) return
    this.ambientTimer = setInterval(() => {
      if (this.listeners.size === 0) return
      const speakers = this.members.filter((m) => m.id !== 'me' && m.online && !this.mutedAuthors.has(m.id))
      if (speakers.length === 0) return
      const speaker = speakers[Math.floor(Math.random() * speakers.length)]
      const lines = [
        'Filo hazır, sinyal bekliyorum.',
        'Mineral fazlası var, paylaşırım.',
        'Sektör 12 hostile, dikkatli olun.',
        'Tech ağacında oy verdim, sıra sizde.',
        'Kim bu akşam raid için müsait?',
      ]
      const msg: GuildMessage = {
        id: this.uid('msg'),
        authorId: speaker.id,
        authorName: speaker.name,
        authorRole: speaker.role,
        content: lines[Math.floor(Math.random() * lines.length)],
        createdAt: new Date().toISOString(),
      }
      this.pushMessage(msg)
      this.emit({ type: 'message', payload: msg })
    }, 12000)
  }

  private pushMessage(msg: GuildMessage) {
    this.messages = [...this.messages, msg].slice(-MESSAGE_WINDOW)
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    this.startAmbient()
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0 && this.ambientTimer) {
        clearInterval(this.ambientTimer)
        this.ambientTimer = null
      }
    }
  }

  async getMessages(): Promise<GuildMessage[]> {
    return [...this.messages]
  }

  async getMembers(): Promise<GuildMember[]> {
    return [...this.members]
  }

  async getDonationRequests(): Promise<DonationRequest[]> {
    return this.requests.filter((r) => new Date(r.expiresAt).getTime() > Date.now())
  }

  async getDailyLimits(): Promise<DailyLimits> {
    return { ...this.dailyLimits }
  }

  async getContributionLeaderboard(): Promise<ContributionEntry[]> {
    return this.members
      .filter((m) => m.id !== 'me')
      .map((m) => {
        const c = this.contribution.perMember.get(m.id) ?? { donate: 0, receive: 0, chat: 0, score: 0 }
        return { member: m, score: c.score, breakdown: { donate: c.donate, receive: c.receive, chat: c.chat } }
      })
      .sort((a, b) => b.score - a.score)
  }

  async getMyContributionSummary(): Promise<MyContributionSummary> {
    const me = this.contribution.me
    return {
      todayScore: me.score,
      dailyCap: DAILY_CONTRIBUTION_CAP,
      breakdown: { donate: me.donate, receive: me.receive, chat: me.chat },
      weeklyRank: me.weeklyRank,
    }
  }

  getCooldownFor(targetId: string): string | null {
    const at = this.cooldowns.get(targetId)
    if (!at) return null
    if (new Date(at).getTime() < Date.now()) {
      this.cooldowns.delete(targetId)
      return null
    }
    return at
  }

  async sendMessage(input: SendMessageInput): Promise<SendResult> {
    const now = Date.now()
    if (now - this.windowStart > 60_000) {
      this.windowStart = now
      this.rateState.perMinuteRemaining = PER_MINUTE_CAP
    }
    if (this.rateState.perMinuteRemaining <= 0) {
      return { ok: false, reason: 'rate_limit', rateLimit: { ...this.rateState, cooldownMs: 60_000 - (now - this.windowStart) } }
    }
    const sinceLast = now - this.lastSentAt
    if (sinceLast < COOLDOWN_MS) {
      return { ok: false, reason: 'rate_limit', rateLimit: { ...this.rateState, cooldownMs: COOLDOWN_MS - sinceLast } }
    }
    const trimmed = input.content.trim()
    if (!trimmed) return { ok: false, reason: 'unknown' }
    if (PROFANITY.some((w) => trimmed.toLowerCase().includes(w))) {
      return { ok: false, reason: 'profanity' }
    }
    this.lastSentAt = now
    this.rateState.perMinuteRemaining -= 1
    const msg: GuildMessage = {
      id: this.uid('msg'),
      authorId: input.authorId,
      authorName: input.authorName,
      authorRole: input.authorRole,
      content: trimmed,
      createdAt: new Date().toISOString(),
    }
    this.pushMessage(msg)
    this.emit({ type: 'message', payload: msg })

    this.contribution.me.chat = Math.min(5, this.contribution.me.chat + 1)
    this.contribution.me.score = this.computeMyScore()

    return { ok: true, message: msg, rateLimit: { ...this.rateState, cooldownMs: COOLDOWN_MS } }
  }

  async muteAuthor(authorId: string): Promise<void> {
    this.mutedAuthors.add(authorId)
    this.messages = this.messages.map((m) =>
      m.authorId === authorId ? { ...m, mutedAuthor: true } : m,
    )
  }

  async reportMessage(messageId: string): Promise<void> {
    this.messages = this.messages.map((m) =>
      m.id === messageId ? { ...m, flagged: true } : m,
    )
  }

  async createRequest(input: CreateRequestInput): Promise<CreateRequestResult> {
    if (this.dailyLimits.requestsRemaining <= 0) {
      return { ok: false, reason: 'limit' }
    }
    const req: DonationRequest = {
      id: this.uid('req'),
      requesterId: input.requesterId,
      requesterName: input.requesterName,
      resource: input.resource,
      amount: input.amount,
      createdAt: new Date().toISOString(),
      expiresAt: this.iso(REQUEST_TTL_HOURS * 3600),
      fulfilledBy: [],
    }
    this.requests = [req, ...this.requests]
    this.dailyLimits.requestsRemaining -= 1
    this.emit({ type: 'donation:created', payload: req })
    return { ok: true, request: req }
  }

  async donate(input: DonateInput): Promise<DonateResult> {
    if (this.dailyLimits.donatesRemaining <= 0) {
      return { ok: false, reason: 'limit' }
    }
    const req = this.requests.find((r) => r.id === input.requestId)
    if (!req) return { ok: false, reason: 'unknown' }
    if (new Date(req.expiresAt).getTime() < Date.now()) {
      return { ok: false, reason: 'expired' }
    }
    const cooldown = this.getCooldownFor(req.requesterId)
    if (cooldown) {
      return { ok: false, reason: 'spam_guard', unlocksAt: cooldown }
    }

    const updated: DonationRequest = {
      ...req,
      fulfilledBy: [...req.fulfilledBy, { memberId: input.donorId, memberName: input.donorName, amount: input.amount }],
    }
    this.requests = this.requests.map((r) => (r.id === req.id ? updated : r))
    this.dailyLimits.donatesRemaining -= 1
    this.cooldowns.set(req.requesterId, this.iso(SAME_TARGET_COOLDOWN_HOURS * 3600))
    this.emit({ type: 'donation:fulfilled', payload: updated })

    this.contribution.me.donate += 1
    this.contribution.me.score = this.computeMyScore()

    return { ok: true, request: updated }
  }

  private computeMyScore() {
    const me = this.contribution.me
    const score = me.donate * 10 + me.receive * 2 + me.chat * 0.5
    return Math.min(DAILY_CONTRIBUTION_CAP, Math.round(score))
  }
}

let mockClient: MockGuildClient | null = null

export function getGuildClient() {
  if (!isMockMode() && typeof window !== 'undefined') {
    console.warn(
      '[guild-client] Real backend client not yet implemented — falling back to mock. Backend prerequisite: CAL-239.',
    )
  }
  if (!mockClient) mockClient = new MockGuildClient()
  return mockClient
}

export function isGuildBackendMocked(): boolean {
  return isMockMode()
}
