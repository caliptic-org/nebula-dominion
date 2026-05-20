'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import './battle-result.css';

export type BattleOutcome = 'victory' | 'defeat';
export type RewardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface BattleReward {
  id: string;
  name: string;
  quantity: number;
  icon: string;
  rarity: RewardRarity;
}

export interface BattleResultData {
  outcome: BattleOutcome;
  stats: {
    unitsKilled: number;
    unitsLost: number;
    damageDealt: number;
    damageTaken: number;
    durationSeconds: number;
    score: number;
  };
  resources: {
    mineral: number;
    gas: number;
    energy: number;
  };
  xp: {
    gained: number;
    before: number;
    after: number;
    max: number;
    currentLevel: number;
    levelUp: boolean;
    newLevel?: number;
  };
  rewards: BattleReward[];
  opponentName?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/* Demo particles — 16 floating specks */
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  top: `${20 + Math.random() * 60}%`,
  left: `${10 + Math.random() * 80}%`,
  dur: `${2.8 + Math.random() * 2.4}s`,
  delay: `${Math.random() * 2}s`,
  tx: `${(Math.random() - 0.5) * 120}px`,
  ty: `${-(60 + Math.random() * 100)}px`,
}));

export function BattleResultScreen({ data }: { data: BattleResultData }) {
  const { raceColor, meta } = useRaceTheme();
  const { outcome, stats, resources, xp, rewards } = data;
  const isVictory = outcome === 'victory';

  /* XP bar fill (animated after mount) */
  const [xpFill, setXpFill] = useState(0);
  const [xpGainWidth, setXpGainWidth] = useState(0);
  const [xpGainLeft, setXpGainLeft] = useState(0);
  const didAnimate = useRef(false);

  useEffect(() => {
    if (didAnimate.current) return;
    didAnimate.current = true;

    const beforePct = (xp.before / xp.max) * 100;
    const afterPct  = (xp.after  / xp.max) * 100;

    setXpFill(beforePct);
    setXpGainLeft(beforePct);
    setXpGainWidth(0);

    const timer = window.setTimeout(() => {
      setXpFill(afterPct);
      setXpGainWidth(afterPct - beforePct);
    }, 50);

    return () => window.clearTimeout(timer);
  }, [xp]);

  return (
    <div
      className={`br-root ${isVictory ? 'is-victory' : 'is-defeat'}`}
      data-race={meta.dataRace}
      style={{ '--race-primary-rgb': hexToRgb(raceColor) } as React.CSSProperties}
    >
      {/* Background */}
      <div className="br-bg">
        <div className="br-bg-radial" />
        <div className="br-bg-scanlines" />
        {isVictory && (
          <div className="br-particles" aria-hidden>
            {PARTICLES.map((p) => (
              <span
                key={p.id}
                className="br-particle"
                style={{
                  '--top':   p.top,
                  '--left':  p.left,
                  '--dur':   p.dur,
                  '--delay': p.delay,
                  '--tx':    p.tx,
                  '--ty':    p.ty,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </div>

      <div className="br-content">
        {/* ── Hero Banner ── */}
        <section className="br-hero">
          <div className="br-hero-image" aria-hidden>
            {/* Image from CAL-488 Image Generator goes here */}
            <img
              src="/assets/battle-result/hero-placeholder.jpg"
              alt=""
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>

          <span className="br-duration">
            ⏱ {formatDuration(stats.durationSeconds)}
          </span>

          <div className="br-hero-eyebrow">
            <span>{meta.icon}</span>
            <span>{meta.name}</span>
            {data.opponentName && <span>vs {data.opponentName}</span>}
          </div>

          <h1 className="br-outcome-label">
            {isVictory ? 'ZAFERİMİZ' : 'YENİLGİ'}
          </h1>

          <p className="br-hero-sub">
            {isVictory ? 'Galaksi sizi selamlıyor' : 'Güçlenin ve geri dönün'}
          </p>

          <div className="br-score-badge">
            <span className="br-score-glyph">⭐</span>
            <span className="br-score-num">{formatNumber(stats.score)}</span>
            <span className="br-score-label">puan</span>
          </div>
        </section>

        {/* ── Combat Stats ── */}
        <div className="br-stats-row">
          {([
            { label: 'Yok Edilen',   val: stats.unitsKilled,  glyph: '💀' },
            { label: 'Kaybedilen',   val: stats.unitsLost,    glyph: '🪦' },
            { label: 'Verilen Hasar',val: stats.damageDealt,  glyph: '⚡' },
            { label: 'Alınan Hasar', val: stats.damageTaken,  glyph: '🛡' },
          ] as const).map(({ label, val, glyph }) => (
            <div className="br-stat" key={label}>
              <span className="br-stat-val">{formatNumber(val)}</span>
              <span className="br-stat-label">{glyph} {label}</span>
            </div>
          ))}
        </div>

        {/* ── Resources Gained ── */}
        <div className="br-panel-shell" style={{ '--stagger-delay': '280ms' } as React.CSSProperties}>
          <div className="br-panel">
            <div className="br-panel-title">Kaynak Kazanımı</div>
            <div className="br-resources">
              <div className="br-resource">
                <span className="br-resource-icon">🔷</span>
                <div className="br-resource-body">
                  <span className="br-resource-val positive">{formatNumber(resources.mineral)}</span>
                  <span className="br-resource-label">Mineral</span>
                </div>
              </div>
              <div className="br-resource">
                <span className="br-resource-icon">🟢</span>
                <div className="br-resource-body">
                  <span className="br-resource-val positive">{formatNumber(resources.gas)}</span>
                  <span className="br-resource-label">Gaz</span>
                </div>
              </div>
              <div className="br-resource">
                <span className="br-resource-icon">⚡</span>
                <div className="br-resource-body">
                  <span className="br-resource-val positive">{formatNumber(resources.energy)}</span>
                  <span className="br-resource-label">Enerji</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── XP Bar ── */}
        <div className="br-panel-shell" style={{ '--stagger-delay': '360ms' } as React.CSSProperties}>
          <div className="br-panel">
            <div className="br-panel-title">Deneyim Puanı</div>
            <div className="br-xp-section">
              <div className="br-xp-row">
                <div className="br-xp-level">
                  <div className="br-xp-level-badge">
                    {xp.levelUp ? (xp.newLevel ?? xp.currentLevel + 1) : xp.currentLevel}
                  </div>
                  <div>
                    <div className="br-xp-gained">
                      {formatNumber(xp.gained)} XP
                    </div>
                    <div className="br-xp-gained-label">Bu savaştan</div>
                  </div>
                </div>
              </div>

              <div className="br-xp-bar-wrap" role="progressbar" aria-valuenow={xp.after} aria-valuemax={xp.max}>
                <div
                  className="br-xp-bar-fill"
                  style={{ width: `${xpFill}%` }}
                />
                <div
                  className="br-xp-bar-gain"
                  style={{ left: `${xpGainLeft}%`, width: `${xpGainWidth}%` }}
                />
              </div>

              <div className="br-xp-numbers">
                <span>{formatNumber(xp.after)} XP</span>
                <span>{formatNumber(xp.max)} XP</span>
              </div>

              {xp.levelUp && (
                <div className="br-levelup" role="status" aria-live="polite">
                  <span className="br-levelup-icon">🏆</span>
                  <span className="br-levelup-text">
                    Seviye Atladı → {xp.newLevel ?? xp.currentLevel + 1}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Rewards ── */}
        {rewards.length > 0 && (
          <div className="br-panel-shell" style={{ '--stagger-delay': '440ms' } as React.CSSProperties}>
            <div className="br-panel">
              <div className="br-panel-title">Ödüller</div>
              <div className="br-rewards-grid">
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="br-reward-card"
                    data-rarity={reward.rarity}
                    title={reward.name}
                  >
                    <span className="br-reward-icon">{reward.icon}</span>
                    <span className="br-reward-name">{reward.name}</span>
                    <span className="br-reward-qty">{reward.quantity}</span>
                    <span className="br-reward-rarity">{RARITY_LABELS[reward.rarity]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="br-actions">
          <Link
            href="/battle-v2"
            className="br-btn br-btn-primary"
          >
            <span>Tekrar Savaş</span>
            <span className="br-btn-icon">↺</span>
          </Link>
          <Link
            href="/"
            className="br-btn br-btn-secondary"
          >
            <span>Ana Üs</span>
            <span className="br-btn-icon">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

const RARITY_LABELS: Record<RewardRarity, string> = {
  common:    'Sıradan',
  rare:      'Nadir',
  epic:      'Epik',
  legendary: 'Efsane',
};

function hexToRgb(hex: string): string {
  const v = hex.replace('#', '');
  return `${parseInt(v.slice(0,2),16)}, ${parseInt(v.slice(2,4),16)}, ${parseInt(v.slice(4,6),16)}`;
}
