'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { getRaceVisual } from '@/game/raceVisuals';

const GameCanvas = dynamic(() => import('@/game/GameCanvas'), { ssr: false });

function BattleContent() {
  const params = useSearchParams();
  const race = params.get('race') ?? 'insan';
  const mode = params.get('mode') ?? 'pve';
  const userId = params.get('userId') ?? 'player_demo';

  const visual = getRaceVisual(race);
  const accent = visual.str;
  const glow = `${accent}55`;

  return (
    <div
      className="min-h-[100dvh] flex flex-col relative overflow-hidden"
      style={{ background: '#07090f' }}
      data-race={race}
    >
      {/* Manga halftone overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, rgba(255,255,255,0.6) 1px, transparent 1.5px)',
          backgroundSize: '6px 6px',
        }}
      />

      {/* Speed-line decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-px"
            style={{
              top: `${15 + i * 14}%`,
              left: 0,
              right: 0,
              background: `linear-gradient(90deg, transparent 0%, ${accent}22 50%, transparent 100%)`,
            }}
          />
        ))}
      </div>

      {/* Top manga HUD strip */}
      <header
        className="relative z-50 flex items-center justify-between px-4 py-2"
        style={{
          background: 'rgba(8,10,16,0.95)',
          borderBottom: `2px solid ${accent}33`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs hover:opacity-80 transition-opacity"
            style={{ color: accent }}
          >
            ← Ana Us
          </Link>
          <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: accent, textShadow: '0 0 8px currentColor' }}
          >
            {visual.icon} {visual.label} {'—'} {mode === 'pvp' ? 'PvP Savas' : 'PvE Savas'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded"
            style={{
              background: `${accent}1a`,
              color: accent,
              border: `1px solid ${accent}55`,
            }}
          >
            {mode.toUpperCase()}
          </span>
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#44ff88' }}
            title="Baglanti aktif"
          />
        </div>
      </header>

      {/* Game canvas — full-bleed with race-glow border */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-2 sm:p-3">
        <div
          className="w-full h-full flex items-center justify-center rounded-lg overflow-hidden"
          style={{
            border: `2px solid ${accent}66`,
            boxShadow: `0 0 50px ${glow}, inset 0 0 40px rgba(0,0,0,0.6)`,
            background: 'rgba(7, 9, 15, 0.6)',
          }}
        >
          <GameCanvas race={race} mode={mode} userId={userId} />
        </div>
      </main>

      {/* Bottom manga ribbon */}
      <footer
        className="relative z-50 flex items-center justify-center gap-4 px-4 py-2"
        style={{
          background: 'rgba(8,10,16,0.92)',
          borderTop: `2px solid ${accent}33`,
        }}
      >
        <span
          className="text-[9px] font-bold uppercase tracking-[0.25em]"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          Phaser.js · Gercek Zamanli Savas Motoru
        </span>
      </footer>
    </div>
  );
}

export default function BattlePage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-[100dvh] flex items-center justify-center"
          style={{ background: '#07090f' }}
        >
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">{'⚔'}</div>
            <span
              className="text-xs uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Savas Alani Yukleniyor...
            </span>
          </div>
        </div>
      }
    >
      <BattleContent />
    </Suspense>
  );
}
