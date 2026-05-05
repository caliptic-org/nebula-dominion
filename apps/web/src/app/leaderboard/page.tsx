'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { MangaPanel } from '@/components/ui/MangaPanel';

// ── Types ──────────────────────────────────────────────────────────────────

type LeaderboardCategory = 'power' | 'pvp' | 'alliance';

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  race: string;
  raceIcon: string;
  raceColor: string;
  portrait: string;
  score: number;
  scoreLabel: string;
  allianceName?: string;
  isMe?: boolean;
  deltaRank?: number; // positive = climbed, negative = fell
}

interface PeriodTimer {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// ── Mock Data ──────────────────────────────────────────────────────────────

const RACE_META: Record<string, { icon: string; color: string; dataRace: string }> = {
  'İnsan':  { icon: '⚔️', color: '#4a9eff', dataRace: 'insan' },
  'Zerg':   { icon: '🦟', color: '#44ff44', dataRace: 'zerg' },
  'Otomat': { icon: '⚙️', color: '#00cfff', dataRace: 'otomat' },
  'Canavar':{ icon: '🐉', color: '#ff6600', dataRace: 'canavar' },
  'Şeytan': { icon: '👁️', color: '#cc00ff', dataRace: 'seytan' },
};

function makeEntry(
  rank: number, id: string, name: string, race: string,
  score: number, scoreLabel: string, allianceName?: string,
  isMe?: boolean, delta?: number
): LeaderboardEntry {
  const m = RACE_META[race];
  return {
    rank, id, name, race,
    raceIcon: m.icon, raceColor: m.color,
    portrait: `/assets/characters/${m.dataRace}/${name.toLowerCase().replace(/\s+/g, '_')}.png`,
    score, scoreLabel, allianceName, isMe,
    deltaRank: delta,
  };
}

const POWER_DATA: LeaderboardEntry[] = [
  makeEntry(1,  'p1',  'Commander Voss',  'İnsan',   4_872_000, '4.87M',  'Nebula Vanguard', false,  3),
  makeEntry(2,  'p2',  'Demiurge Prime',  'Otomat',  4_581_300, '4.58M',  'Iron Grid',       false,  0),
  makeEntry(3,  'p3',  'Morgath',         'Zerg',    4_210_800, '4.21M',  'Swarm Eternal',   false, -1),
  makeEntry(4,  'p4',  'Malphas',         'Şeytan',  3_987_400, '3.99M',  'Void Council',    false,  5),
  makeEntry(5,  'p5',  'Khorvash',        'Canavar', 3_742_100, '3.74M',  'Stone Fang',      false,  2),
  makeEntry(6,  'p6',  'Aurelius',        'Otomat',  3_611_200, '3.61M',  'Iron Grid',       false, -2),
  makeEntry(7,  'p7',  'Ravenna',         'Canavar', 3_498_700, '3.50M',  'Stone Fang',      false,  1),
  makeEntry(8,  'p8',  'Lilithra',        'Şeytan',  3_344_500, '3.34M',  'Void Council',    false, -3),
  makeEntry(9,  'p9',  'Chen',            'İnsan',   3_201_800, '3.20M',  'Nebula Vanguard', false,  0),
  makeEntry(10, 'p10', 'Vex Thara',       'Zerg',    3_104_200, '3.10M',  'Swarm Eternal',   false,  4),
  makeEntry(11, 'p11', 'Reyes',           'İnsan',   2_977_500, '2.98M',  'Nebula Vanguard', false,  0),
  makeEntry(12, 'p12', 'Threnix',         'Zerg',    2_845_000, '2.85M',  'Swarm Eternal',   false, -1),
  makeEntry(13, 'p13', 'Crucible',        'Otomat',  2_712_300, '2.71M',  'Iron Grid',       false,  2),
  makeEntry(14, 'p14', 'Vorhaal',         'Şeytan',  2_601_700, '2.60M',  'Void Council',    false,  0),
  makeEntry(42, 'me',  'Sen',             'İnsan',   1_287_400, '1.29M',  'Nebula Vanguard', true,   7),
];

const PVP_DATA: LeaderboardEntry[] = [
  makeEntry(1,  'v1',  'Khorvash',        'Canavar', 18_420,    '18,420 Puan', 'Stone Fang',   false,  2),
  makeEntry(2,  'v2',  'Malphas',         'Şeytan',  17_805,    '17,805 Puan', 'Void Council', false,  1),
  makeEntry(3,  'v3',  'Commander Voss',  'İnsan',   16_992,    '16,992 Puan', 'Nebula Vanguard',false,-1),
  makeEntry(4,  'v4',  'Morgath',         'Zerg',    15_877,    '15,877 Puan', 'Swarm Eternal',false,  3),
  makeEntry(5,  'v5',  'Ravenna',         'Canavar', 14_441,    '14,441 Puan', 'Stone Fang',   false,  0),
  makeEntry(6,  'v6',  'Lilithra',        'Şeytan',  13_984,    '13,984 Puan', 'Void Council', false, -2),
  makeEntry(7,  'v7',  'Demiurge Prime',  'Otomat',  13_211,    '13,211 Puan', 'Iron Grid',    false,  4),
  makeEntry(8,  'v8',  'Vex Thara',       'Zerg',    12_650,    '12,650 Puan', 'Swarm Eternal',false,  0),
  makeEntry(9,  'v9',  'Aurelius',        'Otomat',  11_988,    '11,988 Puan', 'Iron Grid',    false, -1),
  makeEntry(10, 'v10', 'Chen',            'İnsan',   11_401,    '11,401 Puan', 'Nebula Vanguard',false,2),
  makeEntry(11, 'v11', 'Reyes',           'İnsan',   10_822,    '10,822 Puan', 'Nebula Vanguard',false,0),
  makeEntry(12, 'v12', 'Crucible',        'Otomat',  10_199,    '10,199 Puan', 'Iron Grid',    false,  1),
  makeEntry(13, 'v13', 'Vorhaal',         'Şeytan',  9_744,     '9,744 Puan',  'Void Council', false, -3),
  makeEntry(14, 'v14', 'Ulrek',           'Canavar', 9_102,     '9,102 Puan',  'Stone Fang',   false,  0),
  makeEntry(38, 'me2', 'Sen',             'İnsan',   4_287,     '4,287 Puan',  'Nebula Vanguard',true, 5),
];

const ALLIANCE_DATA: LeaderboardEntry[] = [
  makeEntry(1,  'a1',  'Swarm Eternal',   'Zerg',   18_920_000, '18.92M',  undefined, false,  2),
  makeEntry(2,  'a2',  'Void Council',    'Şeytan', 17_441_200, '17.44M',  undefined, false,  1),
  makeEntry(3,  'a3',  'Iron Grid',       'Otomat', 16_007_800, '16.01M',  undefined, false, -1),
  makeEntry(4,  'a4',  'Stone Fang',      'Canavar',14_882_500, '14.88M',  undefined, false,  3),
  makeEntry(5,  'a5',  'Nebula Vanguard', 'İnsan',  13_544_100, '13.54M',  undefined, false,  0),
  makeEntry(6,  'a6',  'Nova Strike',     'İnsan',  11_901_700, '11.90M',  undefined, false, -2),
  makeEntry(7,  'a7',  'Hive Mind',       'Zerg',   10_774_400, '10.77M',  undefined, false,  1),
  makeEntry(8,  'a8',  'Chrome Order',    'Otomat', 9_441_200,  '9.44M',   undefined, false,  0),
  makeEntry(9,  'a9',  'Ember Clan',      'Canavar', 8_200_500,  '8.20M',   undefined, false,  4),
  makeEntry(10, 'a10', 'Rune Pact',       'Şeytan',  7_881_300,  '7.88M',   undefined, false, -1),
  makeEntry(11, 'a11', 'Steel Dawn',      'İnsan',   6_744_200,  '6.74M',   undefined, false,  0),
  makeEntry(12, 'a12', 'Acid Tide',       'Zerg',    5_901_700,  '5.90M',   undefined, false,  2),
  makeEntry(42, 'my',  'Nebula Vanguard', 'İnsan',  13_544_100, '13.54M',  undefined, true,   0),
];

const CATEGORY_LABELS: Record<LeaderboardCategory, { label: string; icon: string; scoreUnit: string }> = {
  power:    { label: 'Güç',       icon: '⚡', scoreUnit: 'Güç Puanı' },
  pvp:      { label: 'PvP Skoru', icon: '⚔️', scoreUnit: 'PvP Puanı' },
  alliance: { label: 'Lonca',     icon: '🤝', scoreUnit: 'Lonca Gücü' },
};

const DATA_BY_CAT: Record<LeaderboardCategory, LeaderboardEntry[]> = {
  power: POWER_DATA,
  pvp: PVP_DATA,
  alliance: ALLIANCE_DATA,
};

// ── Period Timer ───────────────────────────────────────────────────────────

function useCountdown(targetMs: number): PeriodTimer {
  const calc = useCallback(() => {
    const diff = Math.max(0, targetMs - Date.now());
    return {
      days:    Math.floor(diff / 86_400_000),
      hours:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
      seconds: Math.floor((diff % 60_000) / 1_000),
    };
  }, [targetMs]);

  const [timer, setTimer] = useState<PeriodTimer>(calc);

  useEffect(() => {
    const id = setInterval(() => setTimer(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);

  return timer;
}

// ── Medal config ───────────────────────────────────────────────────────────

const MEDAL = {
  1: { label: '👑', color: '#ffd700', glow: 'rgba(255,215,0,0.45)', border: '#ffd700', bg: 'rgba(255,215,0,0.10)', size: 'large' },
  2: { label: '🥈', color: '#c0c8d8', glow: 'rgba(192,200,216,0.35)', border: '#c0c8d8', bg: 'rgba(192,200,216,0.08)', size: 'medium' },
  3: { label: '🥉', color: '#cd7f32', glow: 'rgba(205,127,50,0.35)', border: '#cd7f32', bg: 'rgba(205,127,50,0.08)', size: 'medium' },
} as const;

// ── Component ──────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { raceColor, raceGlow } = useRaceTheme();
  const [activeTab, setActiveTab] = useState<LeaderboardCategory>('power');
  const [periodType, setPeriodType] = useState<'weekly' | 'seasonal'>('weekly');

  // Next Monday 00:00 UTC as weekly reset
  const weeklyReset = (() => {
    const d = new Date();
    const daysUntilMonday = (8 - d.getUTCDay()) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + daysUntilMonday);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  })();

  // 60 days from now as seasonal reset
  const seasonalReset = Date.now() + 60 * 86_400_000;

  const weeklyTimer  = useCountdown(weeklyReset);
  const seasonalTimer = useCountdown(seasonalReset);
  const timer = periodType === 'weekly' ? weeklyTimer : seasonalTimer;

  const entries = DATA_BY_CAT[activeTab];
  const podium = entries.filter(e => e.rank <= 3);
  const list   = entries.filter(e => e.rank > 3 && !e.isMe);
  const me     = entries.find(e => e.isMe);

  const tabs: LeaderboardCategory[] = ['power', 'pvp', 'alliance'];

  return (
    <div className="leaderboard-page">
      {/* ── Header ── */}
      <header className="lb-header">
        <Link href="/" className="lb-back-btn" aria-label="Geri dön">
          <span>‹</span>
        </Link>
        <div className="lb-title-group">
          <h1 className="lb-title">SIRALAMALAR</h1>
          <p className="lb-subtitle">Galaksi Rekabeti</p>
        </div>
        <div className="lb-header-spacer" />
      </header>

      {/* ── Period Toggle + Countdown ── */}
      <section className="lb-period-section">
        <MangaPanel className="lb-period-panel" halftone>
          <div className="lb-period-toggle">
            {(['weekly', 'seasonal'] as const).map(pt => (
              <button
                key={pt}
                className={`lb-period-btn${periodType === pt ? ' active' : ''}`}
                onClick={() => setPeriodType(pt)}
                style={periodType === pt ? { '--race': raceColor, '--race-glow': raceGlow } as React.CSSProperties : undefined}
              >
                {pt === 'weekly' ? '📅 Haftalık' : '🌌 Sezonluk'}
              </button>
            ))}
          </div>
          <div className="lb-timer">
            <span className="lb-timer-label">
              {periodType === 'weekly' ? 'HAFTALIK RESET' : 'SEZON SONU'} →
            </span>
            <div className="lb-timer-blocks">
              {[
                { v: timer.days,    u: 'GÜN' },
                { v: timer.hours,   u: 'SAAT' },
                { v: timer.minutes, u: 'DAK' },
                { v: timer.seconds, u: 'SAN' },
              ].map(({ v, u }) => (
                <div key={u} className="lb-timer-block">
                  <span className="lb-timer-num">{String(v).padStart(2, '0')}</span>
                  <span className="lb-timer-unit">{u}</span>
                </div>
              ))}
            </div>
          </div>
        </MangaPanel>
      </section>

      {/* ── Category Tabs ── */}
      <div className="lb-tabs" role="tablist">
        {tabs.map(tab => {
          const { label, icon } = CATEGORY_LABELS[tab];
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={active}
              className={`lb-tab${active ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={active ? { '--race': raceColor, '--race-glow': raceGlow } as React.CSSProperties : undefined}
            >
              <span aria-hidden>{icon}</span>
              <span>{label}</span>
              {active && <span className="lb-tab-indicator" style={{ background: raceColor }} />}
            </button>
          );
        })}
      </div>

      {/* ── Podium (Top 3) ── */}
      <section className="lb-podium-section" aria-label="İlk 3 oyuncu">
        <div className="lb-podium">
          {/* Silver — rank 2 */}
          {podium[1] && <PodiumCard entry={podium[1]} medal={MEDAL[2]} order="left" />}
          {/* Gold — rank 1 */}
          {podium[0] && <PodiumCard entry={podium[0]} medal={MEDAL[1]} order="center" />}
          {/* Bronze — rank 3 */}
          {podium[2] && <PodiumCard entry={podium[2]} medal={MEDAL[3]} order="right" />}
        </div>
        {/* Podium base speed-lines dramatism */}
        <div className="lb-podium-rays" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="lb-podium-ray" style={{ '--ray-i': i } as React.CSSProperties} />
          ))}
        </div>
      </section>

      {/* ── List (#4+) ── */}
      <section className="lb-list-section">
        <div className="lb-list-header">
          <span className="lb-list-col-rank">#</span>
          <span className="lb-list-col-player">OYUNCU</span>
          <span className="lb-list-col-score">{CATEGORY_LABELS[activeTab].scoreUnit.toUpperCase()}</span>
        </div>

        <div className="lb-list" role="list">
          {list.map(entry => (
            <PlayerRow key={entry.id} entry={entry} isTop10={entry.rank <= 10} />
          ))}
        </div>
      </section>

      {/* ── My Rank Sticky Bar ── */}
      {me && (
        <div
          className="lb-sticky-me"
          style={{
            '--race': raceColor,
            '--race-glow': raceGlow,
          } as React.CSSProperties}
        >
          <div className="lb-sticky-me-inner">
            <div className="lb-sticky-me-left">
              <span className="lb-sticky-rank">#{me.rank}</span>
              <div className="lb-sticky-avatar" style={{ borderColor: raceColor }}>
                <img
                  src={me.portrait}
                  alt={me.name}
                  onError={e => { (e.target as HTMLImageElement).src = '/assets/characters/insan/voss.png'; }}
                />
              </div>
              <div className="lb-sticky-info">
                <span className="lb-sticky-name">{me.name}</span>
                <span className="lb-sticky-race" style={{ color: raceColor }}>
                  {me.raceIcon} {me.race}
                </span>
              </div>
            </div>
            <div className="lb-sticky-right">
              <span className="lb-sticky-score" style={{ color: raceColor }}>{me.scoreLabel}</span>
              <span className="lb-sticky-label">{CATEGORY_LABELS[activeTab].scoreUnit}</span>
            </div>
          </div>
          <div className="lb-sticky-glow" style={{ background: `radial-gradient(ellipse 100% 200% at 50% 100%, ${raceGlow}, transparent)` }} aria-hidden />
        </div>
      )}
    </div>
  );
}

// ── Podium Card ────────────────────────────────────────────────────────────

interface PodiumCardProps {
  entry: LeaderboardEntry;
  medal: typeof MEDAL[1 | 2 | 3];
  order: 'left' | 'center' | 'right';
}

function PodiumCard({ entry, medal, order }: PodiumCardProps) {
  const isCenter = order === 'center';
  return (
    <div
      className={`lb-podium-card lb-podium-${order}`}
      style={{
        '--medal-color': medal.color,
        '--medal-glow':  medal.glow,
        '--medal-bg':    medal.bg,
        '--medal-border': medal.border,
        '--race-color': entry.raceColor,
      } as React.CSSProperties}
    >
      {/* Crown/medal badge */}
      <div className="lb-podium-medal">{medal.label}</div>

      {/* Avatar */}
      <div className={`lb-podium-avatar${isCenter ? ' lb-podium-avatar--large' : ''}`}>
        <div className="lb-podium-avatar-ring">
          <img
            src={entry.portrait}
            alt={entry.name}
            onError={e => { (e.target as HTMLImageElement).src = '/assets/characters/insan/voss.png'; }}
          />
        </div>
        <div className="lb-podium-avatar-glow" aria-hidden />
      </div>

      {/* Info */}
      <div className="lb-podium-info">
        <span className="lb-podium-name">{entry.name}</span>
        <span className="lb-podium-race" style={{ color: entry.raceColor }}>
          {entry.raceIcon} {entry.race}
        </span>
        <span className="lb-podium-score">{entry.scoreLabel}</span>
        {entry.allianceName && (
          <span className="lb-podium-alliance">{entry.allianceName}</span>
        )}
      </div>

      {/* Rank number pedestal */}
      <div className="lb-podium-pedestal">
        <span className="lb-podium-rank-num">{entry.rank}</span>
      </div>
    </div>
  );
}

// ── Player Row ─────────────────────────────────────────────────────────────

interface PlayerRowProps {
  entry: LeaderboardEntry;
  isTop10: boolean;
}

function PlayerRow({ entry, isTop10 }: PlayerRowProps) {
  const deltaSign = entry.deltaRank && entry.deltaRank > 0 ? '+' : '';
  const deltaColor = !entry.deltaRank ? '#666' : entry.deltaRank > 0 ? '#44ff88' : '#ff4455';

  return (
    <div
      className={`lb-row${isTop10 ? ' lb-row--top10' : ''}${entry.isMe ? ' lb-row--me' : ''}`}
      role="listitem"
      style={isTop10 ? { '--race-color': entry.raceColor } as React.CSSProperties : undefined}
    >
      {/* Rank */}
      <div className="lb-row-rank">
        <span className={`lb-row-rank-num${isTop10 ? ' lb-row-rank-num--top10' : ''}`}
          style={isTop10 ? { color: entry.raceColor } : undefined}>
          {entry.rank}
        </span>
        {entry.deltaRank !== undefined && entry.deltaRank !== 0 && (
          <span className="lb-row-delta" style={{ color: deltaColor }}>
            {deltaSign}{entry.deltaRank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div className="lb-row-avatar" style={{ borderColor: entry.raceColor }}>
        <img
          src={entry.portrait}
          alt={entry.name}
          onError={e => { (e.target as HTMLImageElement).src = '/assets/characters/insan/voss.png'; }}
        />
      </div>

      {/* Player info */}
      <div className="lb-row-info">
        <span className="lb-row-name">{entry.name}</span>
        <div className="lb-row-meta">
          <span className="lb-row-race-badge" style={{ color: entry.raceColor, borderColor: `${entry.raceColor}44` }}>
            {entry.raceIcon} {entry.race}
          </span>
          {entry.allianceName && (
            <span className="lb-row-alliance">{entry.allianceName}</span>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="lb-row-score">
        <span className="lb-row-score-val" style={isTop10 ? { color: entry.raceColor } : undefined}>
          {entry.scoreLabel}
        </span>
      </div>
    </div>
  );
}
