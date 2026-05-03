'use client'

import { GuildChatPanel } from '@/components/guild/GuildChatPanel'
import { GuildDonationCenter } from '@/components/guild/GuildDonationCenter'
import { ContributionLeaderboard } from '@/components/guild/ContributionLeaderboard'
import { isGuildBackendMocked } from '@/lib/guild-client'
import type { GuildMember } from '@/types/guild'

interface GuildViewProps {
  guildId: string | null
  me: { id: string; name: string; role: GuildMember['role'] }
}

export function GuildView({ guildId, me }: GuildViewProps) {
  const mocked = isGuildBackendMocked()

  return (
    <section className="space-y-4" aria-label="Lonca chat ve yardımlaşma">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-display text-sm font-bold tracking-widest uppercase text-text-secondary">
          Lonca Salonu
        </h2>
        <div className="flex items-center gap-2">
          <span className="badge badge-brand">Realtime</span>
          {mocked ? (
            <span
              className="badge"
              style={{ background: 'var(--color-energy-dim)', color: 'var(--color-energy)', borderColor: 'var(--color-energy)' }}
              title="Lonca backend mock modunda. NEXT_PUBLIC_GUILD_BACKEND_READY=true ile gerçek API'ya bağlanır."
            >
              Mock
            </span>
          ) : (
            <span className="badge badge-accent">Canlı API</span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-7 lg:row-span-2 min-h-[480px] flex">
          <div className="flex-1 min-h-0">
            <GuildChatPanel guildId={guildId} me={me} />
          </div>
        </div>

        <div className="lg:col-span-5">
          <GuildDonationCenter guildId={guildId} me={me} />
        </div>

        <div className="lg:col-span-5">
          <ContributionLeaderboard guildId={guildId} me={me} />
        </div>
      </div>
    </section>
  )
}
