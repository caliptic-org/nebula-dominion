'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GlowButton } from '@/components/ui/GlowButton';
import { GuildSearchPanel } from '@/components/guild/GuildSearchPanel';
import { GuildCreatePanel } from '@/components/guild/GuildCreatePanel';
import { GuildDashboard } from '@/components/guild/GuildDashboard';
import { TutorialOverlay } from '@/components/guild/TutorialOverlay';
import { GuildView } from './GuildView';
import { useGuildTutorial } from '@/hooks/useGuildTutorial';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { GuildSummary } from '@/types/guild';

type Tab = 'search' | 'create';

export default function GuildHubPage() {
  const router = useRouter();
  const { state, advance, resetForDemo, openOverlay } = useGuildTutorial();
  const { race } = useRaceTheme();
  const [tab, setTab] = useState<Tab>('search');
  const [activeGuildId, setActiveGuildId] = useState<string | null>(state.guildId);
  const [joining, setJoining] = useState<string | null>(null);

  const handleJoin = async (guild: GuildSummary) => {
    setJoining(guild.id);
    try {
      setActiveGuildId(guild.id);
      if (state.step === 'not_started') {
        await advance(guild.id);
      }
    } finally {
      setJoining(null);
    }
  };

  const handleCreate = async (guild: GuildSummary) => {
    setActiveGuildId(guild.id);
    if (state.step === 'not_started') {
      await advance(guild.id);
    }
  };

  const inGuild = activeGuildId && state.step !== 'not_started';
  const isDev = process.env.NODE_ENV === 'development';

  const me = {
    id: 'me',
    name: 'Komutan',
    role: 'officer' as const,
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border"
        style={{ background: 'rgba(7,11,22,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn-ghost text-xs px-3 py-1.5" aria-label="Dashboard">
            ← Komuta
          </Link>
          <h1 className="font-display text-base sm:text-lg font-bold tracking-widest uppercase text-gradient-race">
            Lonca Merkezi
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isDev && state.step === 'completed' && (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={resetForDemo}
              aria-label="Tutorial'ı yeniden başlat (demo)"
            >
              ↺ Tutorial Demo
            </button>
          )}
          {state.step !== 'completed' && (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={openOverlay}
              aria-label="Tutorial'ı aç"
            >
              Tutorial'ı Aç
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 max-w-5xl mx-auto w-full space-y-6">
        {!inGuild && (
          <>
            <nav
              className="flex items-center gap-2 p-1 rounded-full bg-bg-elevated/60 border border-border w-fit"
              aria-label="Lonca sekmeleri"
            >
              <button
                type="button"
                onClick={() => setTab('search')}
                className={`px-4 py-1.5 rounded-full text-xs font-display tracking-widest uppercase transition-all ${
                  tab === 'search' ? 'bg-brand text-text-inverse' : 'text-text-secondary'
                }`}
                aria-pressed={tab === 'search'}
              >
                Lonca Ara
              </button>
              <button
                type="button"
                onClick={() => setTab('create')}
                className={`px-4 py-1.5 rounded-full text-xs font-display tracking-widest uppercase transition-all ${
                  tab === 'create' ? 'bg-brand text-text-inverse' : 'text-text-secondary'
                }`}
                aria-pressed={tab === 'create'}
              >
                Lonca Kur
              </button>
            </nav>

            {tab === 'search' ? (
              <GuildSearchPanel onJoin={handleJoin} isJoining={joining} />
            ) : (
              <GuildCreatePanel defaultRace={race} onCreated={handleCreate} />
            )}
          </>
        )}

        {inGuild && activeGuildId && (
          <>
            <GuildDashboard guildId={activeGuildId} />

            <GuildView me={me} />

            {state.step !== 'completed' && (
              <div
                className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                style={{ borderColor: 'var(--color-race)', boxShadow: '0 0 24px var(--color-race-glow)' }}
                role="status"
              >
                <div>
                  <p className="font-display text-sm font-bold text-text-primary mb-1">
                    Tutorial devam ediyor
                  </p>
                  <p className="text-text-secondary text-xs">
                    {state.step === 'guild_chosen' && '50 mineral bağışı yaparak ilk katkı puanını kazan.'}
                    {state.step === 'first_donation' && 'İlk lonca görevini al — XP hızla birikecek.'}
                    {state.step === 'first_quest' && 'Tutorial neredeyse tamam, ödülünü topla.'}
                  </p>
                </div>
                <GlowButton size="md" onClick={() => advance()}>
                  Sonraki Adım
                </GlowButton>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => router.push('/dashboard')}
              >
                ← Komuta merkezine dön
              </button>
            </div>
          </>
        )}
      </main>

      <TutorialOverlay />
    </div>
  );
}
