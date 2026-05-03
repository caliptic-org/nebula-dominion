'use client'

import clsx from 'clsx'
import { useGuildContribution } from '@/hooks/useGuildContribution'
import { roleLabel } from './formatters'

const RANK_TONES = [
  { color: 'var(--color-energy)', dim: 'var(--color-energy-dim)' },
  { color: 'var(--color-accent)', dim: 'var(--color-accent-dim)' },
  { color: 'var(--color-brand)', dim: 'var(--color-brand-dim)' },
]

interface ContributionLeaderboardProps {
  guildId: string | null
  me: { id: string }
}

export function ContributionLeaderboard({ guildId, me }: ContributionLeaderboardProps) {
  const { leaderboard, summary, loading } = useGuildContribution({ guildId, me })
  const max = leaderboard[0]?.score ?? 1

  return (
    <section className="glass-card p-4 space-y-4" aria-labelledby="guild-leaderboard-heading">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden>🏆</span>
          <h2 id="guild-leaderboard-heading" className="font-display text-sm font-bold text-text-primary tracking-widest uppercase">
            Katkı Sıralaması
          </h2>
        </div>
        <span className="text-[10px] text-text-muted font-mono">Bugün</span>
      </header>

      {summary && (
        <div
          className="rounded-lg p-3 border border-border"
          style={{ background: 'var(--color-bg-elevated)' }}
          aria-label="Senin katkı özetin"
        >
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[10px] font-display uppercase tracking-widest text-text-muted">
              Senin Bugünkü Skorun
            </span>
            <span className="font-display font-black text-2xl text-gradient-brand tabular-nums">
              {summary.todayScore}
              <span className="text-text-muted text-xs font-normal">/{summary.dailyCap}</span>
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden mb-3"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            role="progressbar"
            aria-valuenow={summary.todayScore}
            aria-valuemin={0}
            aria-valuemax={summary.dailyCap}
          >
            <div
              className="h-full"
              style={{
                width: `${Math.min(100, (summary.todayScore / summary.dailyCap) * 100)}%`,
                background: 'var(--gradient-brand)',
              }}
            />
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-[10px] text-text-muted uppercase tracking-wider">Bağış</dt>
              <dd className="font-display font-bold text-status-success tabular-nums">{summary.breakdown.donate}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-text-muted uppercase tracking-wider">Aldı</dt>
              <dd className="font-display font-bold text-accent tabular-nums">{summary.breakdown.receive}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-text-muted uppercase tracking-wider">Chat</dt>
              <dd className="font-display font-bold text-energy tabular-nums">{summary.breakdown.chat}</dd>
            </div>
          </dl>
          {summary.weeklyRank && (
            <p className="text-[11px] text-text-muted mt-3 text-center">
              Haftalık rank: <span className="text-text-primary font-bold">#{summary.weeklyRank}</span>
            </p>
          )}
        </div>
      )}

      <ol className="space-y-2" aria-busy={loading}>
        {loading && (
          <li className="text-text-muted text-xs text-center py-4">Yükleniyor...</li>
        )}
        {leaderboard.map((entry, idx) => {
          const tone = RANK_TONES[idx] ?? null
          const pct = (entry.score / max) * 100
          return (
            <li
              key={entry.member.userId}
              className="rounded-lg p-2.5 border border-border flex items-center gap-3"
              style={{ background: idx < 3 ? tone?.dim : 'var(--color-bg-surface)' }}
            >
              <span
                className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center font-display font-black text-xs shrink-0',
                  idx < 3 ? '' : 'border border-border',
                )}
                style={tone ? { background: tone.color, color: '#080a10' } : { background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}
                aria-label={`${idx + 1}. sıra`}
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-sm font-bold text-text-primary truncate">
                    {entry.member.name}
                  </span>
                  <span className="font-display font-black tabular-nums text-text-primary">
                    {entry.score}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] mt-0.5">
                  <span className="text-text-muted">{roleLabel(entry.member.role)}</span>
                  <span className="font-mono text-text-muted" aria-label="Katkı dağılımı">
                    🤝{entry.breakdown.donate} · 📥{entry.breakdown.receive} · 💬{entry.breakdown.chat}
                  </span>
                </div>
                <div
                  className="h-0.5 rounded-full overflow-hidden mt-1.5"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                  aria-hidden
                >
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, background: tone?.color ?? 'var(--color-text-muted)' }}
                  />
                </div>
              </div>
              <span
                className={clsx('w-2 h-2 rounded-full shrink-0', (entry.member.online ?? entry.member.isOnline) && 'animate-pulse-slow')}
                style={{ background: (entry.member.online ?? entry.member.isOnline) ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                aria-label={(entry.member.online ?? entry.member.isOnline) ? 'Çevrimiçi' : 'Çevrimdışı'}
              />
            </li>
          )
        })}
      </ol>
    </section>
  )
}
