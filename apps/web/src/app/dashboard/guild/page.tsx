'use client';

import { useEffect, useState } from 'react';
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
import { GuildSummary, TutorialStep } from '@/types/guild';
import { guildApi } from '@/lib/guildApi';

type Tab = 'search' | 'create';

const FIRST_DONATION_AMOUNT = 50;

export default function GuildHubPage() {
  const router = useRouter();
  const { state, advance, syncFromBackend, resetForDemo, openOverlay } = useGuildTutorial();
  const { race } = useRaceTheme();
  const [tab, setTab] = useState<Tab>('search');
  const [activeGuildId, setActiveGuildId] = useState<string | null>(state.guildId);
  const [joining, setJoining] = useState<string | null>(null);
  const [donating, setDonating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveGuildId(state.guildId);
  }, [state.guildId]);

  const handleJoin = async (guild: GuildSummary) => {
    setJoining(guild.id);
    setError(null);
    try {
      // Backend auto-advances tutorial not_started → guild_chosen on join.
      // We pull the new state back via syncFromBackend rather than
      // optimistically advancing client-side.
      await guildApi.joinGuild(guild.id);
      setActiveGuildId(guild.id);
      await syncFromBackend();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Loncaya katılınamadı.');
    } finally {
      setJoining(null);
    }
  };

  const handleCreate = async (guild: GuildSummary) => {
    setError(null);
    try {
      // Creating a guild as the leader implicitly inserts the membership row;
      // the backend treats this as the join transition, so we sync state.
      setActiveGuildId(guild.id);
      await syncFromBackend();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lonca paneli güncellenemedi.');
    }
  };

  const handleDonate = async () => {
    if (!activeGuildId || donating) return;
    setDonating(true);
    setError(null);
    try {
      await guildApi.donate(activeGuildId, FIRST_DONATION_AMOUNT, 'mineral');
      // Backend auto-advances guild_chosen → first_donation here.
      await syncFromBackend();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağış başarısız oldu.');
    } finally {
      setDonating(false);
    }
  };

  const handleManualAdvance = async () => {
    setError(null);
    try {
      await advance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tutorial ilerletilemedi.');
    }
  };

  const inGuild = activeGuildId && state.step !== 'not_started';
  const isDev = process.env.NODE_ENV === 'development';

  const me = {
    id: 'me',
    name: 'Komutan',
    role: 'officer' as const,
  };

  const stepCallouts: Partial<Record<TutorialStep, { copy: string; cta: string; onClick: () => void; loading?: boolean }>> = {
    guild_chosen: {
      copy: `${FIRST_DONATION_AMOUNT} mineral bağışı yaparak ilk katkı puanını kazan.`,
      cta: `${FIRST_DONATION_AMOUNT} Mineral Bağışla`,
      onClick: handleDonate,
      loading: donating,
    },
    first_donation: {
      copy: 'İlk lonca görevini al — XP hızla birikecek.',
      cta: 'Görevi Aldım',
      onClick: handleManualAdvance,
    },
    first_quest: {
      copy: 'Tutorial neredeyse tamam, ödülünü topla.',
      cta: 'Ödülü Topla',
      onClick: handleManualAdvance,
    },
  };

  const callout = inGuild ? stepCallouts[state.step] : undefined;

  return (
    <div className="h-dvh flex flex-col overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <header
        className="panel-accent-bar sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border"
        style={{ background: 'rgba(7,11,22,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-3 pl-2">
          <Link href="/dashboard" className="btn-ghost text-xs px-3 py-1.5" aria-label="Dashboard">
            ← Komuta
          </Link>
          <h1 className="manga-title" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
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
        {error && (
          <div role="alert" className="glass-card p-3 text-status-danger text-sm border border-status-danger/40">
            {error}
          </div>
        )}

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

            <div className="panel-divider-bold" aria-hidden />

            <GuildView guildId={activeGuildId} me={me} />

            {callout && state.step !== 'completed' && (
              <div
                className="glass-card cinematic-border-race p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                role="status"
              >
                <div>
                  <p className="font-display text-sm font-bold text-text-primary mb-1">
                    Tutorial devam ediyor
                  </p>
                  <p className="text-text-secondary text-xs">{callout.copy}</p>
                </div>
                <GlowButton
                  size="md"
                  onClick={callout.onClick}
                  loading={callout.loading}
                >
                  {callout.cta}
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

      <TutorialOverlay onPrimaryAction={callout?.onClick} primaryActionLoading={callout?.loading} />
    </div>
  );
}
