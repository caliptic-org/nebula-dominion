'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { DonationRequest } from '@/types/guild'
import type { DonateResult } from '@/lib/guild-client'
import { formatCountdown, resourceIcon, resourceLabel } from './formatters'
import { GUILD_DONATION_LIMITS } from '@/hooks/useGuildDonations'

interface DonationRequestCardProps {
  request: DonationRequest
  isOwn: boolean
  cooldownUntil: string | null
  donatesRemaining: number
  onDonate: (input: { requestId: string; amount: number }) => Promise<DonateResult>
}

export function DonationRequestCard({ request, isOwn, cooldownUntil, donatesRemaining, onDonate }: DonationRequestCardProps) {
  const fulfilled = request.fulfilledBy.reduce((sum, f) => sum + f.amount, 0)
  const pct = Math.min(100, Math.round((fulfilled / request.amount) * 100))
  const remaining = Math.max(0, request.amount - fulfilled)
  const [busy, setBusy] = useState(false)
  const [pendingAmount, setPendingAmount] = useState<number>(Math.min(remaining, 100))
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const cooldownActive = !!cooldownUntil
  const limitExhausted = donatesRemaining <= 0
  const fullyFulfilled = remaining === 0
  const disabled = isOwn || cooldownActive || limitExhausted || fullyFulfilled || busy

  const reasonLabel = (() => {
    if (isOwn) return 'Kendi talebine bağış yapamazsın'
    if (fullyFulfilled) return 'Talep karşılandı'
    if (limitExhausted) return 'Günlük bağış limitin doldu'
    if (cooldownActive)
      return `Aynı oyuncuya ${GUILD_DONATION_LIMITS.SAME_TARGET_COOLDOWN_HOURS} saat sonra tekrar yardım edebilirsin (${formatCountdown(cooldownUntil!)})`
    return null
  })()

  const handleConfirm = async () => {
    setBusy(true)
    setError(null)
    const res = await onDonate({ requestId: request.id, amount: pendingAmount })
    setBusy(false)
    setConfirming(false)
    if (!res.ok) {
      if (res.reason === 'spam_guard' && res.unlocksAt) {
        setError(`Spam guard: ${formatCountdown(res.unlocksAt)} sonra tekrar dene`)
      } else if (res.reason === 'limit') {
        setError('Günlük bağış limiti doldu')
      } else if (res.reason === 'expired') {
        setError('Talep süresi doldu')
      } else {
        setError('Bağış başarısız')
      }
    }
  }

  return (
    <article
      className={clsx(
        'rounded-xl border p-4 space-y-3 transition-all',
        fullyFulfilled
          ? 'border-status-success/40 bg-status-success/5'
          : 'border-border hover:border-border-hover',
      )}
      style={{ background: fullyFulfilled ? undefined : 'var(--color-bg-surface)' }}
      aria-labelledby={`req-${request.id}-title`}
    >
      <header className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ background: 'var(--color-bg-elevated)' }}
          aria-hidden
        >
          {resourceIcon(request.resource)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 id={`req-${request.id}-title`} className="font-display text-sm font-bold text-text-primary truncate">
            {request.requesterName}{isOwn && ' (Sen)'}
          </h3>
          <p className="text-text-secondary text-xs">
            <span className="font-mono tabular-nums">{request.amount.toLocaleString('tr-TR')}</span>{' '}
            {resourceLabel(request.resource)} talep ediyor
          </p>
        </div>
        <span className="text-[10px] font-mono text-text-muted shrink-0" aria-label="Talep süresi">
          ⏱ {formatCountdown(request.expiresAt)}
        </span>
      </header>

      <div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          role="progressbar"
          aria-valuenow={fulfilled}
          aria-valuemin={0}
          aria-valuemax={request.amount}
          aria-label="Karşılanan miktar"
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: fullyFulfilled ? 'var(--color-success)' : 'var(--gradient-brand)',
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-muted font-mono mt-1 tabular-nums">
          <span>{fulfilled.toLocaleString('tr-TR')} karşılandı</span>
          <span>{remaining.toLocaleString('tr-TR')} kalan</span>
        </div>
      </div>

      {request.fulfilledBy.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Bağışta bulunanlar">
          {request.fulfilledBy.map((f, i) => (
            <li
              key={`${f.memberId}-${i}`}
              className="text-[10px] px-2 py-0.5 rounded-full font-mono"
              style={{ background: 'var(--color-brand-dim)', color: 'var(--color-brand)' }}
            >
              {f.memberName} +{f.amount}
            </li>
          ))}
        </ul>
      )}

      {!confirming ? (
        <div className="space-y-2">
          <button
            type="button"
            className={clsx('btn-primary w-full text-xs py-2', disabled && 'opacity-50 cursor-not-allowed')}
            disabled={disabled}
            onClick={() => setConfirming(true)}
            aria-describedby={reasonLabel ? `req-${request.id}-reason` : undefined}
          >
            {fullyFulfilled ? 'Karşılandı' : 'Yardım Gönder'}
          </button>
          {reasonLabel && (
            <p id={`req-${request.id}-reason`} className="text-[11px] text-text-muted text-center" role="status">
              {reasonLabel}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2 rounded-lg p-3 border border-border-hover" style={{ background: 'var(--color-bg-elevated)' }}>
          <label htmlFor={`amt-${request.id}`} className="form-label">
            Bağış miktarı
          </label>
          <input
            id={`amt-${request.id}`}
            type="number"
            min={1}
            max={remaining}
            value={pendingAmount}
            onChange={(e) => setPendingAmount(Math.max(1, Math.min(remaining, Number(e.target.value) || 0)))}
            className="form-input text-sm"
          />
          <p className="text-[11px] text-text-muted">
            {pendingAmount.toLocaleString('tr-TR')} {resourceLabel(request.resource)} → {request.requesterName}
          </p>
          {error && (
            <p className="text-[11px] text-status-danger" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost text-xs flex-1" onClick={() => setConfirming(false)} disabled={busy}>
              İptal
            </button>
            <button type="button" className="btn-primary text-xs flex-1 py-2" onClick={handleConfirm} disabled={busy}>
              {busy ? 'Gönderiliyor...' : 'Onayla'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
