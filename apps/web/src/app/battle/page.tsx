'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { RACE_DESCRIPTIONS } from '@/types/units';

const GameCanvas = dynamic(() => import('@/game/GameCanvas'), { ssr: false });

function BattleContent() {
  const params = useSearchParams();
  const race = params.get('race') ?? 'insan';
  const mode = params.get('mode') ?? 'pve';
  const userId = params.get('userId') ?? 'player_demo';
  const tutorial = params.get('tutorial') === '1';

  const raceKey = (race in RACE_DESCRIPTIONS) ? race as keyof typeof RACE_DESCRIPTIONS : 'insan' as keyof typeof RACE_DESCRIPTIONS;
  const raceDesc = RACE_DESCRIPTIONS[raceKey as keyof typeof RACE_DESCRIPTIONS];

  return (
    <div
      className="h-dvh flex flex-col relative overflow-hidden"
      style={{ background: '#07090f' }}
      data-race={raceDesc?.dataRace ?? 'insan'}
    >
      {/* Manga panel top HUD */}
      <header
        className="relative z-50 flex items-center justify-between px-4 py-2"
        style={{
          background: 'rgba(8,10,16,0.95)',
          borderBottom: `1px solid ${raceDesc?.color ?? '#4a9eff'}22`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-display text-text-muted text-xs hover:text-text-primary transition-colors"
          >
            ← Ana Üs
          </Link>
          <div
            className="h-3 w-px"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          />
          <span
            className="font-display text-[10px] font-black uppercase tracking-widest"
            style={{ color: raceDesc?.color ?? '#4a9eff' }}
          >
            {raceDesc?.icon} {raceDesc?.name ?? race} —{' '}
            {tutorial ? 'Egitim Savasi' : mode === 'pvp' ? 'PvP Savaş' : 'PvE Savaş'}
          </span>
          {tutorial && (
            <span
              className="badge text-[9px] font-display font-black uppercase tracking-widest"
              style={{
                background: 'rgba(255,200,50,0.12)',
                color: 'var(--color-energy)',
                border: '1px solid rgba(255,200,50,0.3)',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
              aria-label="Egitim modu — kayip imkansiz"
            >
              ★ EGITIM
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className="badge text-[9px]"
            style={{
              background: raceDesc ? raceDesc.bgColor : 'rgba(74,158,255,0.1)',
              color: raceDesc?.color ?? '#4a9eff',
              border: `1px solid ${raceDesc?.color ?? '#4a9eff'}30`,
            }}
          >
            {mode.toUpperCase()}
          </span>
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#44ff88' }}
            title="Bağlantı aktif"
          />
        </div>
      </header>

      {/* Manga speed lines + halftone — active battle overlay */}
      <div className="speed-lines-battle-active" aria-hidden />
      <span
        className="manga-halftone-overlay"
        style={{ color: raceDesc?.color ?? '#4a9eff' }}
        aria-hidden
      />

      {/* Phaser Game Canvas */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-2">
        <div className="w-full ink-border-race overflow-hidden">
          <GameCanvas race={race} mode={mode} userId={userId} tutorial={tutorial} />
        </div>
      </main>

      {/* Bottom status strip */}
      <footer
        className="relative z-50 flex items-center justify-center gap-4 px-4 py-2"
        style={{
          background: 'rgba(8,10,16,0.9)',
          borderTop: `1px solid ${raceDesc?.color ?? '#4a9eff'}15`,
        }}
      >
        <span className="font-display text-[9px] text-text-muted uppercase tracking-widest">
          Phaser.js 3.60 · Gerçek Zamanlı Savaş Motoru
        </span>
      </footer>
    </div>
  );
}

export default function BattlePage() {
  return (
    <Suspense fallback={
      <div
        className="h-dvh flex items-center justify-center"
        style={{ background: '#07090f' }}
      >
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚔️</div>
          <span className="font-display text-xs text-text-muted uppercase tracking-widest">
            Savaş Alanı Yükleniyor…
          </span>
        </div>
      </div>
    }>
      <BattleContent />
    </Suspense>
  );
}
