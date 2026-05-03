'use client'

import Link from 'next/link'
import { GuildChatPanel } from '@/components/guild/GuildChatPanel'
import { GuildDonationCenter } from '@/components/guild/GuildDonationCenter'
import { ContributionLeaderboard } from '@/components/guild/ContributionLeaderboard'
import type { GuildMember } from '@/types/guild'

interface GuildViewProps {
  me: { id: string; name: string; role: GuildMember['role'] }
}

export function GuildView({ me }: GuildViewProps) {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      <main className="flex-1 overflow-auto">
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border"
          style={{ background: 'rgba(7, 11, 22, 0.8)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="btn-ghost text-xs px-3 py-1.5" aria-label="Komuta merkezine dön">
              ← Komuta Merkezi
            </Link>
            <div>
              <h1 className="font-display text-lg font-bold text-text-primary">Lonca</h1>
              <p className="text-text-muted text-xs">Galaksi Sığınakçıları · Çağ III</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-brand">Faz 2</span>
            <span className="badge badge-accent">Realtime</span>
          </div>
        </header>

        <div className="p-4 lg:p-6 grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-12 max-w-[1600px]">
          <div className="lg:col-span-7 lg:row-span-2 min-h-[640px] flex">
            <div className="flex-1 min-h-0">
              <GuildChatPanel me={me} />
            </div>
          </div>

          <div className="lg:col-span-5">
            <GuildDonationCenter me={me} />
          </div>

          <div className="lg:col-span-5">
            <ContributionLeaderboard />
          </div>
        </div>
      </main>
    </div>
  )
}
