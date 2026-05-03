'use client'

import { useGuildDonations } from '@/hooks/useGuildDonations'
import { CreateRequestForm } from './CreateRequestForm'
import { DailyLimitsBar } from './DailyLimitsBar'
import { DonationRequestCard } from './DonationRequestCard'

interface GuildDonationCenterProps {
  guildId: string | null
  me: { id: string; name: string }
}

export function GuildDonationCenter({ guildId, me }: GuildDonationCenterProps) {
  const { requests, limits, loading, cooldownFor, createRequest, donate } = useGuildDonations({ guildId, me })

  return (
    <section className="glass-card p-4 space-y-4" aria-labelledby="guild-donations-heading">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden>🤝</span>
          <h2 id="guild-donations-heading" className="font-display text-sm font-bold text-text-primary tracking-widest uppercase">
            Kaynak Yardımlaşma
          </h2>
        </div>
        <span className="text-[10px] text-text-muted font-mono">
          {requests.length} aktif talep
        </span>
      </header>

      {limits && <DailyLimitsBar limits={limits} />}

      {limits && (
        <CreateRequestForm
          requestsRemaining={limits.requestsRemaining}
          onCreate={createRequest}
        />
      )}

      <div className="space-y-3" aria-busy={loading}>
        {loading && (
          <p className="text-text-muted text-xs text-center py-6">Talepler yükleniyor...</p>
        )}
        {!loading && requests.length === 0 && (
          <div
            className="rounded-lg p-6 text-center border border-dashed"
            style={{ borderColor: 'var(--color-border-hover)', background: 'var(--color-bg-elevated)' }}
          >
            <p className="text-text-secondary text-sm">Aktif talep yok.</p>
            <p className="text-text-muted text-xs mt-1">İlk talebi sen oluştur.</p>
          </div>
        )}
        {requests.map((r) => (
          <DonationRequestCard
            key={r.id}
            request={r}
            isOwn={r.requesterId === me.id}
            cooldownUntil={r.requesterId === me.id ? null : cooldownFor(r.requesterId)}
            donatesRemaining={limits?.donatesRemaining ?? 0}
            onDonate={donate}
          />
        ))}
      </div>
    </section>
  )
}
