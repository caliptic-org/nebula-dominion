'use client'

import clsx from 'clsx'
import { formatCountdown } from './formatters'
import type { DailyLimits } from '@/types/guild'

interface DailyLimitsBarProps {
  limits: DailyLimits
}

function Slot({
  label,
  remaining,
  cap,
  tone,
}: {
  label: string
  remaining: number
  cap: number
  tone: 'request' | 'donate'
}) {
  const pct = Math.max(0, Math.min(100, (remaining / cap) * 100))
  const color = tone === 'request' ? 'var(--color-accent)' : 'var(--color-success)'
  const dim = tone === 'request' ? 'var(--color-accent-dim)' : 'rgba(68,255,136,0.12)'
  const exhausted = remaining <= 0
  return (
    <div
      className="flex-1 rounded-lg p-3 border"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: exhausted ? 'var(--color-danger)' : 'var(--color-border)',
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[10px] font-display uppercase tracking-widest text-text-muted">{label}</span>
        <span
          className={clsx('font-display font-black tabular-nums', exhausted ? 'text-status-danger' : 'text-text-primary')}
          style={!exhausted ? { color } : undefined}
        >
          {remaining}
          <span className="text-text-muted text-xs font-normal">/{cap}</span>
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
        role="progressbar"
        aria-valuenow={remaining}
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-label={`${label}: ${remaining} kalan`}
      >
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: exhausted ? 'var(--color-danger)' : color, boxShadow: `0 0 8px ${dim}` }}
        />
      </div>
    </div>
  )
}

export function DailyLimitsBar({ limits }: DailyLimitsBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs font-bold tracking-widest text-text-muted uppercase">
          Günlük Limit
        </h3>
        <span className="text-[10px] text-text-muted font-mono" aria-live="polite">
          Sıfırlanma: {formatCountdown(limits.resetAt)}
        </span>
      </div>
      <div className="flex gap-3">
        <Slot label="Talep" remaining={limits.requestsRemaining} cap={limits.requestsCap} tone="request" />
        <Slot label="Bağış" remaining={limits.donatesRemaining} cap={limits.donatesCap} tone="donate" />
      </div>
    </div>
  )
}
