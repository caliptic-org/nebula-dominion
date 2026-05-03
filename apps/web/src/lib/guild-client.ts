'use client'

import { io, Socket } from 'socket.io-client'
import { FetchError, fetcher } from '@/lib/fetcher'
import { guildApi } from '@/lib/guildApi'
import { Race } from '@/types/units'
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

const isMockMode = () => process.env.NEXT_PUBLIC_GUILD_BACKEND_READY !== 'true'

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

export interface GuildClientContext {
  guildId: string
  userId: string
}

export interface GuildClient {
  subscribe(listener: Listener): () => void
  getMessages(): Promise<GuildMessage[]>
  getMembers(): Promise<GuildMember[]>
  getDonationRequests(): Promise<DonationRequest[]>
  getDailyLimits(): Promise<DailyLimits>
  getContributionLeaderboard(): Promise<ContributionEntry[]>
  getMyContributionSummary(): Promise<MyContributionSummary>
  getCooldownFor(targetId: string): string | null
  sendMessage(input: SendMessageInput): Promise<SendResult>
  muteAuthor(authorId: string): Promise<void>
  reportMessage(messageId: string, authorId: string): Promise<void>
  createRequest(input: CreateRequestInput): Promise<CreateRequestResult>
  donate(input: DonateInput): Promise<DonateResult>
}

// ────────────────────────────────────────────────────────────────────────────
// Mock client (kept for offline/Storybook/dev runs without auth)
// ────────────────────────────────────────────────────────────────────────────
class MockGuildClient implements GuildClient {
  private members: GuildMemberLite[] = [
    { id: 'me', name: 'Komutan', role: 'officer', online: true },
    { id: 'm-1', name: 'Vex Talon', role: 'leader', online: true },
    { id: 'm-2', name: 'Astra Kael', role: 'officer', online: true },
    { id: 'm-3', name: 'Riven', role: 'member', online: true },
    { id: 'm-4', name: 'Nyx-7', role: 'member', online: false },
    { id: 'm-5', name: 'Halcyon', role: 'member', online: true },
  ]

  private messages: GuildMessage[] = [
    { id: 'msg-seed-1', authorId: 'm-1', authorName: 'Vex Talon', authorRole: 'leader',
      content: 'Bu hafta raid çarşamba 21:00. Hazır olun komutanlar.', createdAt: this.iso(-1800) },
    { id: 'msg-seed-2', authorId: 'm-3', authorName: 'Riven', authorRole: 'member',
      content: 'Sektör 7 tarama tamam. Mineral cebi var, koordinatları DM atıyorum.', createdAt: this.iso(-1500) },
    { id: 'msg-seed-3', authorId: 'm-2', authorName: 'Astra Kael', authorRole: 'officer',
      content: 'Yeni gelenlere hatırlatma: bağış limiti günlük 5 talep / 10 gönderim.', createdAt: this.iso(-900) },
  ]

  private requests: DonationRequest[] = [
    { id: 'req-1', requesterId: 'm-3', requesterName: 'Riven', resource: 'mineral',
      amount: 420, createdAt: this.iso(-1200), expiresAt: this.iso(60 * 60 * 3),
      fulfilledBy: [{ memberId: 'm-2', memberName: 'Astra Kael', amount: 120 }] },
    { id: 'req-2', requesterId: 'm-5', requesterName: 'Halcyon', resource: 'gas',
      amount: 280, createdAt: this.iso(-300), expiresAt: this.iso(60 * 60 * 3.7), fulfilledBy: [] },
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
    resetAt: endOfDayIso(),
  }

  private cooldowns = new Map<string, string>()
  private mutedAuthors = new Set<string>()
  private rateState: RateLimitState = { cooldownMs: 0, perMinuteRemaining: PER_MINUTE_CAP, perMinuteCap: PER_MINUTE_CAP }
  private lastSentAt = 0
  private windowStart = Date.now()
  private listeners = new Set<Listener>()
  private ambientTimer: ReturnType<typeof setInterval> | null = null

  private iso(offsetSec: number): string {
    return new Date(Date.now() + offsetSec * 1000).toISOString()
  }

  private uid(prefix: string) { return `${prefix}-${Math.random().toString(36).slice(2, 10)}` }

  private emit(event: GuildSocketEvent) { this.listeners.forEach((l) => l(event)) }

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
        authorId: speaker.id, authorName: speaker.name, authorRole: speaker.role,
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
        clearInterval(this.ambientTimer); this.ambientTimer = null
      }
    }
  }

  async getMessages(): Promise<GuildMessage[]> { return [...this.messages] }
  async getMembers(): Promise<GuildMember[]> { return this.members.map(toMockGuildMember) }
  async getDonationRequests(): Promise<DonationRequest[]> {
    return this.requests.filter((r) => new Date(r.expiresAt).getTime() > Date.now())
  }
  async getDailyLimits(): Promise<DailyLimits> { return { ...this.dailyLimits } }

  async getContributionLeaderboard(): Promise<ContributionEntry[]> {
    return this.members
      .filter((m) => m.id !== 'me')
      .map((m) => {
        const c = this.contribution.perMember.get(m.id) ?? { donate: 0, receive: 0, chat: 0, score: 0 }
        return {
          member: toMockGuildMember(m),
          score: c.score,
          breakdown: { donate: c.donate, receive: c.receive, chat: c.chat },
        }
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
    if (new Date(at).getTime() < Date.now()) { this.cooldowns.delete(targetId); return null }
    return at
  }

  async sendMessage(input: SendMessageInput): Promise<SendResult> {
    const now = Date.now()
    if (now - this.windowStart > 60_000) { this.windowStart = now; this.rateState.perMinuteRemaining = PER_MINUTE_CAP }
    if (this.rateState.perMinuteRemaining <= 0) {
      return { ok: false, reason: 'rate_limit', rateLimit: { ...this.rateState, cooldownMs: 60_000 - (now - this.windowStart) } }
    }
    const sinceLast = now - this.lastSentAt
    if (sinceLast < COOLDOWN_MS) {
      return { ok: false, reason: 'rate_limit', rateLimit: { ...this.rateState, cooldownMs: COOLDOWN_MS - sinceLast } }
    }
    const trimmed = input.content.trim()
    if (!trimmed) return { ok: false, reason: 'unknown' }
    if (PROFANITY.some((w) => trimmed.toLowerCase().includes(w))) return { ok: false, reason: 'profanity' }
    this.lastSentAt = now
    this.rateState.perMinuteRemaining -= 1
    const msg: GuildMessage = {
      id: this.uid('msg'),
      authorId: input.authorId, authorName: input.authorName, authorRole: input.authorRole,
      content: trimmed, createdAt: new Date().toISOString(),
    }
    this.pushMessage(msg)
    this.emit({ type: 'message', payload: msg })
    this.contribution.me.chat = Math.min(5, this.contribution.me.chat + 1)
    this.contribution.me.score = this.computeMyScore()
    return { ok: true, message: msg, rateLimit: { ...this.rateState, cooldownMs: COOLDOWN_MS } }
  }

  async muteAuthor(authorId: string): Promise<void> {
    this.mutedAuthors.add(authorId)
    this.messages = this.messages.map((m) => (m.authorId === authorId ? { ...m, mutedAuthor: true } : m))
  }

  async reportMessage(messageId: string): Promise<void> {
    this.messages = this.messages.map((m) => (m.id === messageId ? { ...m, flagged: true } : m))
  }

  async createRequest(input: CreateRequestInput): Promise<CreateRequestResult> {
    if (this.dailyLimits.requestsRemaining <= 0) return { ok: false, reason: 'limit' }
    const req: DonationRequest = {
      id: this.uid('req'), requesterId: input.requesterId, requesterName: input.requesterName,
      resource: input.resource, amount: input.amount,
      createdAt: new Date().toISOString(), expiresAt: this.iso(REQUEST_TTL_HOURS * 3600), fulfilledBy: [],
    }
    this.requests = [req, ...this.requests]
    this.dailyLimits.requestsRemaining -= 1
    this.emit({ type: 'donation:created', payload: req })
    return { ok: true, request: req }
  }

  async donate(input: DonateInput): Promise<DonateResult> {
    if (this.dailyLimits.donatesRemaining <= 0) return { ok: false, reason: 'limit' }
    const req = this.requests.find((r) => r.id === input.requestId)
    if (!req) return { ok: false, reason: 'unknown' }
    if (new Date(req.expiresAt).getTime() < Date.now()) return { ok: false, reason: 'expired' }
    const cooldown = this.getCooldownFor(req.requesterId)
    if (cooldown) return { ok: false, reason: 'spam_guard', unlocksAt: cooldown }
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

interface GuildMemberLite {
  id: string
  name: string
  role: GuildMember['role']
  online: boolean
}

function toMockGuildMember(m: GuildMemberLite): GuildMember {
  return {
    userId: m.id,
    guildId: 'mock',
    name: m.name,
    role: m.role,
    race: Race.INSAN,
    joinedAt: new Date().toISOString(),
    contributionPts: 0,
    weeklyContribution: 0,
    lastActiveAt: new Date().toISOString(),
    isOnline: m.online,
    online: m.online,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Backend client (talks to /guilds/:guildId/... REST + /guild-chat WS)
// ────────────────────────────────────────────────────────────────────────────

interface BackendChatMessageView {
  id: string
  guildId: string
  userId: string
  content: string
  filtered: boolean
  createdAt: string
}

interface BackendDonateRequest {
  id: string
  guildId: string
  requesterId: string
  resourceType: GuildResource
  amountRequested: number
  amountFulfilled: number
  status: 'open' | 'fulfilled' | 'expired' | 'cancelled'
  expiresAt: string
  createdAt: string
}

interface BackendDonateFulfillment {
  id: string
  requestId: string
  guildId: string
  donorId: string
  recipientId: string
  resourceType: GuildResource
  amount: number
  createdAt: string
}

interface DonationCounters {
  day: string
  requestsUsed: number
  donatesUsed: number
}

class BackendGuildClient implements GuildClient {
  private readonly guildId: string
  private readonly userId: string
  private readonly baseUrl: string
  private socket: Socket | null = null
  private listeners = new Set<Listener>()
  private membersCache: GuildMember[] = []
  private memberById = new Map<string, GuildMember>()
  private membersReady: Promise<void>
  private cooldowns = new Map<string, string>()
  private optimisticDonors = new Map<string, { memberId: string; memberName: string; amount: number }[]>()
  private localContribution = { donate: 0, receive: 0, chat: 0 }

  constructor(ctx: GuildClientContext, baseUrl: string) {
    this.guildId = ctx.guildId
    this.userId = ctx.userId
    this.baseUrl = baseUrl
    this.membersReady = this.loadMembers()
  }

  private async loadMembers() {
    try {
      const profile = await guildApi.getProfile(this.guildId)
      this.membersCache = profile?.members ?? []
      this.memberById = new Map(this.membersCache.map((m) => [m.userId, m]))
    } catch {
      this.membersCache = []
    }
  }

  private memberFor(userId: string): GuildMember | undefined {
    return this.memberById.get(userId)
  }

  private toMessage(view: BackendChatMessageView): GuildMessage {
    const member = this.memberFor(view.userId)
    return {
      id: view.id,
      authorId: view.userId,
      authorName: member?.name ?? 'Bilinmeyen',
      authorRole: member?.role ?? 'member',
      content: view.content,
      createdAt: view.createdAt,
      flagged: view.filtered ? true : undefined,
    }
  }

  private toDonationRequest(r: BackendDonateRequest): DonationRequest {
    const requester = this.memberFor(r.requesterId)
    return {
      id: r.id,
      requesterId: r.requesterId,
      requesterName: requester?.name ?? 'Bilinmeyen',
      resource: r.resourceType,
      amount: r.amountRequested,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      fulfilledBy: this.optimisticDonors.get(r.id) ?? this.synthFulfilledFromAmount(r),
    }
  }

  private synthFulfilledFromAmount(r: BackendDonateRequest): DonationRequest['fulfilledBy'] {
    if (r.amountFulfilled <= 0) return []
    return [{ memberId: 'aggregate', memberName: 'Loncadan', amount: r.amountFulfilled }]
  }

  private ensureSocket() {
    if (this.socket) return this.socket
    const wsUrl = this.baseUrl.replace(/\/$/, '')
    const socket = io(`${wsUrl}/guild-chat`, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: { userId: this.userId },
    })
    socket.on('history', async (history: BackendChatMessageView[]) => {
      await this.membersReady
      const messages = history.map((m) => this.toMessage(m))
      messages.forEach((m) => this.emit({ type: 'message', payload: m }))
    })
    socket.on('message', (view: BackendChatMessageView) => {
      const msg = this.toMessage(view)
      this.emit({ type: 'message', payload: msg })
    })
    this.socket = socket
    return socket
  }

  private emit(event: GuildSocketEvent) {
    this.listeners.forEach((l) => l(event))
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    this.ensureSocket()
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0 && this.socket) {
        this.socket.disconnect()
        this.socket = null
      }
    }
  }

  async getMessages(): Promise<GuildMessage[]> {
    await this.membersReady
    try {
      const window = await fetcher<BackendChatMessageView[]>(`/guilds/${this.guildId}/chat/window`)
      return window.map((m) => this.toMessage(m))
    } catch (err) {
      console.error('[guild-client] chat/window failed', err)
      return []
    }
  }

  async getMembers(): Promise<GuildMember[]> {
    await this.membersReady
    return this.membersCache
  }

  async getDonationRequests(): Promise<DonationRequest[]> {
    await this.membersReady
    try {
      const requests = await fetcher<BackendDonateRequest[]>(`/guilds/${this.guildId}/donate/requests`)
      return requests.map((r) => this.toDonationRequest(r))
    } catch (err) {
      console.error('[guild-client] donate/requests failed', err)
      return []
    }
  }

  async getDailyLimits(): Promise<DailyLimits> {
    const counters = readCounters(this.userId)
    return {
      requestsRemaining: Math.max(0, REQUESTS_PER_DAY - counters.requestsUsed),
      requestsCap: REQUESTS_PER_DAY,
      donatesRemaining: Math.max(0, DONATES_PER_DAY - counters.donatesUsed),
      donatesCap: DONATES_PER_DAY,
      resetAt: endOfDayIso(),
    }
  }

  async getContributionLeaderboard(): Promise<ContributionEntry[]> {
    await this.membersReady
    return this.membersCache
      .filter((m) => m.userId !== this.userId)
      .map<ContributionEntry>((member) => ({
        member,
        score: member.weeklyContribution ?? member.contributionPts ?? 0,
        breakdown: { donate: 0, receive: 0, chat: 0 },
      }))
      .sort((a, b) => b.score - a.score)
  }

  async getMyContributionSummary(): Promise<MyContributionSummary> {
    await this.membersReady
    const me = this.memberFor(this.userId)
    const local = this.localContribution
    const computed = Math.min(
      DAILY_CONTRIBUTION_CAP,
      Math.round(local.donate * 10 + local.receive * 2 + Math.min(5, local.chat) * 0.5),
    )
    return {
      todayScore: computed,
      dailyCap: DAILY_CONTRIBUTION_CAP,
      breakdown: { ...local },
      weeklyRank: me?.weeklyContribution ? null : null,
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
    const trimmed = input.content.trim()
    if (!trimmed) return { ok: false, reason: 'unknown' }
    try {
      const view = await fetcher<BackendChatMessageView>(`/guilds/${this.guildId}/chat/send`, {
        method: 'POST',
        body: JSON.stringify({ content: trimmed }),
      })
      const message = this.toMessage(view)
      this.localContribution.chat += 1
      // The gateway will broadcast the message to other clients; the local
      // sender doesn't get the WS echo (REST path), so emit locally too.
      this.emit({ type: 'message', payload: message })
      return { ok: true, message, rateLimit: { cooldownMs: COOLDOWN_MS, perMinuteRemaining: PER_MINUTE_CAP, perMinuteCap: PER_MINUTE_CAP } }
    } catch (err) {
      return mapSendError(err)
    }
  }

  async muteAuthor(authorId: string): Promise<void> {
    try {
      await fetcher(`/guilds/${this.guildId}/moderation/mute`, {
        method: 'POST',
        body: JSON.stringify({ userId: authorId, durationSeconds: 60 * 60, reason: 'Frontend officer mute' }),
      })
    } catch (err) {
      console.error('[guild-client] mute failed', err)
      throw err
    }
  }

  async reportMessage(messageId: string, authorId: string): Promise<void> {
    try {
      await fetcher(`/guilds/${this.guildId}/moderation/report`, {
        method: 'POST',
        body: JSON.stringify({ targetUserId: authorId, messageId, reason: 'Üye tarafından bildirildi' }),
      })
    } catch (err) {
      console.error('[guild-client] report failed', err)
      throw err
    }
  }

  async createRequest(input: CreateRequestInput): Promise<CreateRequestResult> {
    try {
      const created = await fetcher<BackendDonateRequest>(`/guilds/${this.guildId}/donate/request`, {
        method: 'POST',
        body: JSON.stringify({ resourceType: input.resource, amount: input.amount }),
      })
      bumpCounters(this.userId, { requests: 1 })
      const req = this.toDonationRequest(created)
      this.emit({ type: 'donation:created', payload: req })
      return { ok: true, request: req }
    } catch (err) {
      if (isForbidden(err)) return { ok: false, reason: 'limit' }
      return { ok: false, reason: 'unknown' }
    }
  }

  async donate(input: DonateInput): Promise<DonateResult> {
    try {
      const fulfillment = await fetcher<BackendDonateFulfillment>(`/guilds/${this.guildId}/donate/fulfill`, {
        method: 'POST',
        body: JSON.stringify({ requestId: input.requestId, amount: input.amount }),
      })
      bumpCounters(this.userId, { donates: 1 })
      this.localContribution.donate += 1

      // Optimistic donor entry until next refresh
      const existing = this.optimisticDonors.get(input.requestId) ?? []
      this.optimisticDonors.set(input.requestId, [
        ...existing,
        { memberId: input.donorId, memberName: input.donorName, amount: fulfillment.amount },
      ])

      // Re-fetch the request list to broadcast updated state
      const refreshed = await this.getDonationRequests()
      const updated = refreshed.find((r) => r.id === input.requestId)
      if (updated) this.emit({ type: 'donation:fulfilled', payload: updated })

      const cooldownIso = new Date(Date.now() + SAME_TARGET_COOLDOWN_HOURS * 3600 * 1000).toISOString()
      // We don't know recipientId from the input; fetch from current request state
      const target = updated?.requesterId
      if (target) this.cooldowns.set(target, cooldownIso)

      return { ok: true, request: updated }
    } catch (err) {
      if (err instanceof FetchError) {
        const info = err.info as { error?: string; message?: string } | undefined
        const message = info?.message ?? info?.error ?? err.message
        if (err.status === 403 && /Daily donate limit/i.test(message)) return { ok: false, reason: 'limit' }
        if (err.status === 403 && /Spam guard/i.test(message)) {
          const unlocksAt = new Date(Date.now() + SAME_TARGET_COOLDOWN_HOURS * 3600 * 1000).toISOString()
          return { ok: false, reason: 'spam_guard', unlocksAt }
        }
        if (err.status === 409 && /expired/i.test(message)) return { ok: false, reason: 'expired' }
      }
      return { ok: false, reason: 'unknown' }
    }
  }
}

function endOfDayIso(): string {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return end.toISOString()
}

function mapSendError(err: unknown): SendResult {
  if (err instanceof FetchError) {
    const info = err.info as { error?: string; reason?: string; retryAfterSeconds?: number; message?: string } | undefined
    const errorCode = info?.error ?? ''
    if (err.status === 429 || errorCode === 'rate_limited') {
      const retryMs = (info?.retryAfterSeconds ?? 1) * 1000
      const minuteQuota = info?.reason === 'minute_quota'
      return {
        ok: false,
        reason: 'rate_limit',
        rateLimit: {
          cooldownMs: retryMs,
          perMinuteRemaining: minuteQuota ? 0 : PER_MINUTE_CAP,
          perMinuteCap: PER_MINUTE_CAP,
        },
      }
    }
    if (err.status === 403 && /muted/i.test(info?.message ?? err.message)) {
      return { ok: false, reason: 'muted' }
    }
    if (err.status === 400 && /content/i.test(info?.message ?? err.message)) {
      return { ok: false, reason: 'profanity' }
    }
  }
  return { ok: false, reason: 'unknown' }
}

function isForbidden(err: unknown): boolean {
  return err instanceof FetchError && err.status === 403
}

const COUNTERS_KEY = 'nebula:guild:donate-counters'

function todayKey(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function readCounters(userId: string): DonationCounters {
  if (typeof window === 'undefined') return { day: todayKey(), requestsUsed: 0, donatesUsed: 0 }
  try {
    const raw = localStorage.getItem(`${COUNTERS_KEY}:${userId}`)
    if (raw) {
      const parsed = JSON.parse(raw) as DonationCounters
      if (parsed.day === todayKey()) return parsed
    }
  } catch {
    // ignore
  }
  return { day: todayKey(), requestsUsed: 0, donatesUsed: 0 }
}

function bumpCounters(userId: string, delta: { requests?: number; donates?: number }) {
  if (typeof window === 'undefined') return
  const cur = readCounters(userId)
  const next: DonationCounters = {
    day: todayKey(),
    requestsUsed: cur.requestsUsed + (delta.requests ?? 0),
    donatesUsed: cur.donatesUsed + (delta.donates ?? 0),
  }
  try {
    localStorage.setItem(`${COUNTERS_KEY}:${userId}`, JSON.stringify(next))
  } catch {
    // ignore
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Factory
// ────────────────────────────────────────────────────────────────────────────

const clients = new Map<string, GuildClient>()

export function getGuildClient(ctx?: GuildClientContext): GuildClient {
  if (!ctx || isMockMode()) {
    const key = '__mock__'
    let client = clients.get(key)
    if (!client) {
      client = new MockGuildClient()
      clients.set(key, client)
    }
    return client
  }
  const key = `${ctx.guildId}:${ctx.userId}`
  let client = clients.get(key)
  if (!client) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
    client = new BackendGuildClient(ctx, baseUrl)
    clients.set(key, client)
  }
  return client
}

export function isGuildBackendMocked(): boolean {
  return isMockMode()
}
