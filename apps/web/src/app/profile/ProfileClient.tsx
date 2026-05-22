'use client';

import './profile.css';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BottomNav } from '@/components/ui/BottomNav';

// ── Types ────────────────────────────────────────────────────────────────────

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type ProfileTab = 'stats' | 'achievements' | 'history';
type BattleMode = 'pvp' | 'pve' | 'siege';
type BattleResult = 'win' | 'loss';

interface Achievement {
  id: string;
  icon: string;
  label: string;
  rarity: Rarity;
  earned: boolean;
}

interface BattleEntry {
  id: string;
  mode: BattleMode;
  result: BattleResult;
  opponentName: string;
  opponentRace: keyof typeof RACE_META;
  delta: number;
  scoreLabel: string;
  whenLabel: string;
}

// ── Race lookup (matches leaderboard) ─────────────────────────────────────────

const RACE_META = {
  'İnsan':   { icon: '⚔️', color: '#4a9eff' },
  'Zerg':    { icon: '🦟', color: '#44ff44' },
  'Otomat':  { icon: '⚙️', color: '#00cfff' },
  'Canavar': { icon: '🐉', color: '#ff6600' },
  'Şeytan':  { icon: '👁️', color: '#cc00ff' },
} as const;

// ── Achievement rarity palette ────────────────────────────────────────────────

const RARITY_COLOR: Record<Rarity, string> = {
  common:    'rgba(160,168,192,0.85)',
  uncommon:  'rgba(68,255,136,0.90)',
  rare:      'rgba(74,158,255,0.90)',
  epic:      'rgba(204,0,255,0.92)',
  legendary: 'rgba(255,200,50,1)',
};

const RARITY_BG: Record<Rarity, string> = {
  common:    'rgba(160,168,192,0.06)',
  uncommon:  'rgba(68,255,136,0.08)',
  rare:      'rgba(74,158,255,0.10)',
  epic:      'rgba(204,0,255,0.12)',
  legendary: 'rgba(255,200,50,0.14)',
};

// ── Mode label ────────────────────────────────────────────────────────────────

const MODE_LABEL: Record<BattleMode, string> = {
  pvp:   'PvP',
  pve:   'PvE',
  siege: 'Kuşatma',
};

// ── Mock profile data (replace with API: getProfile(userId)) ──────────────────

const PROFILE = {
  username:    'nova_star',
  displayName: 'Nova★',
  race:        'İnsan' as keyof typeof RACE_META,
  level:       47,
  title:       'Yıldız Komutanı',
  avatarUrl:   null as string | null,
  power:       142_800,
  globalRank:  1247,
  pvpScore:    4_287,
  pvpRank:     338,
  bestStreak:  17,
  guildContrib:18_420,
  wins:        384,
  losses:      97,
  battles:     481,
  alliance:    'Nebula Pact',
  allianceRole:'Kaptan',
  xp:          74_200,
  xpNext:      100_000,
  seasonPass:  68,
  achievements: [
    { id: 'a1', icon: '⚔️', label: 'İlk Zafer',      rarity: 'common'    as Rarity, earned: true  },
    { id: 'a2', icon: '🏆', label: 'Şampiyon',       rarity: 'rare'      as Rarity, earned: true  },
    { id: 'a3', icon: '💎', label: 'Elmas Sezon',    rarity: 'epic'      as Rarity, earned: true  },
    { id: 'a4', icon: '🌌', label: 'Nebula Kaşifi',  rarity: 'epic'      as Rarity, earned: true  },
    { id: 'a5', icon: '👑', label: 'Efsane',         rarity: 'legendary' as Rarity, earned: false },
    { id: 'a6', icon: '🔥', label: 'Ateş Ustası',    rarity: 'rare'      as Rarity, earned: true  },
    { id: 'a7', icon: '⚡', label: 'Hız Tanrısı',    rarity: 'uncommon'  as Rarity, earned: true  },
    { id: 'a8', icon: '🛡️', label: 'Kalkan Efendisi',rarity: 'uncommon'  as Rarity, earned: false },
    { id: 'a9', icon: '🌠', label: 'Sezon Sonu',     rarity: 'epic'      as Rarity, earned: false },
    { id: 'a10', icon: '🎯', label: 'Sniper',        rarity: 'rare'      as Rarity, earned: true  },
    { id: 'a11', icon: '💠', label: 'Lonca Kahramanı',rarity: 'rare'    as Rarity, earned: true  },
    { id: 'a12', icon: '🦾', label: 'Demir Zafer',   rarity: 'common'    as Rarity, earned: false },
  ] as Achievement[],
  history: [
    { id: 'h1', mode: 'pvp',   result: 'win',  opponentName: 'Khorvash',       opponentRace: 'Canavar', delta:  42, scoreLabel: '+42 PvP', whenLabel: '12 dk önce' },
    { id: 'h2', mode: 'siege', result: 'win',  opponentName: 'Iron Grid',      opponentRace: 'Otomat',  delta: 188, scoreLabel: '+188 Güç', whenLabel: '1 sa önce'  },
    { id: 'h3', mode: 'pvp',   result: 'loss', opponentName: 'Malphas',        opponentRace: 'Şeytan',  delta: -28, scoreLabel: '-28 PvP',  whenLabel: '3 sa önce'  },
    { id: 'h4', mode: 'pve',   result: 'win',  opponentName: 'Yıldız Yıkıcı',  opponentRace: 'Canavar', delta: 320, scoreLabel: '+320 XP', whenLabel: '6 sa önce'  },
    { id: 'h5', mode: 'pvp',   result: 'win',  opponentName: 'Vex Thara',      opponentRace: 'Zerg',    delta:  35, scoreLabel: '+35 PvP', whenLabel: 'Dün'        },
    { id: 'h6', mode: 'siege', result: 'loss', opponentName: 'Void Council',   opponentRace: 'Şeytan',  delta: -94, scoreLabel: '-94 Güç', whenLabel: 'Dün'        },
    { id: 'h7', mode: 'pvp',   result: 'win',  opponentName: 'Chen',           opponentRace: 'İnsan',   delta:  47, scoreLabel: '+47 PvP', whenLabel: '2 gün önce' },
    { id: 'h8', mode: 'pve',   result: 'win',  opponentName: 'Asteroit Yuva',  opponentRace: 'Zerg',    delta: 145, scoreLabel: '+145 XP', whenLabel: '2 gün önce' },
  ] as BattleEntry[],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR').format(n);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileClient() {
  const router = useRouter();
  const { raceColor, raceGlow, raceDim } = useRaceTheme();
  const [tab, setTab] = useState<ProfileTab>('stats');

  const profile = PROFILE;
  const winRate = Math.round((profile.wins / profile.battles) * 100);
  const xpPct   = Math.round((profile.xp   / profile.xpNext)  * 100);

  const { earnedCount, totalCount } = useMemo(() => ({
    earnedCount: profile.achievements.filter((a) => a.earned).length,
    totalCount:  profile.achievements.length,
  }), [profile.achievements]);

  // Drive race-glow CSS vars from the active race theme. CSS uses --race / --race-glow / --race-dim.
  const pageStyle = {
    '--race':      raceColor,
    '--race-glow': raceGlow,
    '--race-dim':  raceDim,
  } as React.CSSProperties;

  return (
    <div className="pf-page" style={pageStyle}>
      {/* ── Speed-line background ── */}
      <div className="pf-speed-bg" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="pf-speed-line" style={{ '--line-i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* ── Header ── */}
      <header className="pf-header">
        <button
          type="button"
          className="pf-back-btn"
          onClick={() => router.back()}
          aria-label="Geri"
        >
          <span aria-hidden>‹</span>
        </button>
        <div className="pf-title-group">
          <h1 className="pf-title">PROFİL</h1>
          <p className="pf-subtitle">Komutan Dosyası</p>
        </div>
        <button
          type="button"
          className="pf-settings-btn"
          onClick={() => router.push('/settings')}
          aria-label="Ayarlar"
        >
          <span aria-hidden>⚙</span>
        </button>
      </header>

      {/* ── Hero — identity panel ── */}
      <section className="pf-hero-section">
        <MangaPanel className="pf-hero-panel" halftone>
          {/* Avatar rig — double-bezel concentric ring */}
          <div className="pf-avatar-rig">
            <div className="pf-avatar-ring-outer" aria-hidden />
            <div className="pf-avatar-ring-inner" aria-hidden />
            <div className="pf-avatar" aria-hidden>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" />
              ) : (
                profile.displayName[0]
              )}
            </div>
          </div>

          <span className="pf-title-chip">{profile.title}</span>

          <h2 className="pf-display-name">{profile.displayName}</h2>

          <div className="pf-meta-row">
            <span className="pf-handle">@{profile.username}</span>
            <span className="pf-meta-dot">·</span>
            <span className="pf-chip pf-chip--level">Sv.{profile.level}</span>
            <span className="pf-chip pf-chip--race">
              <span aria-hidden>{RACE_META[profile.race].icon}</span>
              <span>{profile.race}</span>
            </span>
            <span className="pf-chip pf-chip--alliance">
              <span aria-hidden>🤝</span>
              <span>{profile.alliance}</span>
            </span>
          </div>

          <p className="pf-rank-line">
            <strong>{profile.allianceRole}</strong>
            <span> · Küresel Sıra </span>
            <strong>#{fmt(profile.globalRank)}</strong>
          </p>

          {/* XP progress */}
          <div className="pf-xp-block">
            <div className="pf-xp-row">
              <span>Deneyim Puanı</span>
              <span>{fmt(profile.xp)} / {fmt(profile.xpNext)} XP</span>
            </div>
            <ProgressBar value={xpPct} variant="xp" size="sm" glow animated />
          </div>
        </MangaPanel>
      </section>

      {/* ── Quick stats row ── */}
      <div className="pf-quick-stats">
        <QuickStat icon="⚡" label="Güç"        value={fmt(profile.power)}       color="var(--color-energy)" />
        <QuickStat icon="⚔️" label="PvP"        value={fmt(profile.pvpScore)}    color={raceColor} />
        <QuickStat icon="🏆" label="Kazanma %"  value={`%${winRate}`}            color="var(--color-success)" />
      </div>

      {/* ── Tabs ── */}
      <div className="pf-tabs" role="tablist" aria-label="Profil bölümleri">
        {([
          ['stats',        'İstatistik',                       '📊'],
          ['achievements', `Başarımlar`,                       '🏅'],
          ['history',      'Geçmiş',                           '⚔️'],
        ] as [ProfileTab, string, string][]).map(([id, label, icon]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`pf-tab${active ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              <span aria-hidden>{icon}</span>
              <span>{label}</span>
              {active && <span className="pf-tab-indicator" />}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="pf-tab-content">
        {tab === 'stats' && <StatsTab profile={profile} winRate={winRate} raceColor={raceColor} raceGlow={raceGlow} />}
        {tab === 'achievements' && (
          <AchievementsTab
            achievements={profile.achievements}
            earnedCount={earnedCount}
            totalCount={totalCount}
          />
        )}
        {tab === 'history' && <HistoryTab entries={profile.history} />}
      </div>

      <BottomNav />
    </div>
  );
}

// ── Quick stat card ──────────────────────────────────────────────────────────

interface QuickStatProps {
  icon: string;
  label: string;
  value: string;
  color: string;
}

function QuickStat({ icon, label, value, color }: QuickStatProps) {
  return (
    <div
      className="pf-stat-card"
      style={{ '--stat-color': color } as React.CSSProperties}
    >
      <span className="pf-stat-icon" aria-hidden>{icon}</span>
      <span className="pf-stat-value">{value}</span>
      <span className="pf-stat-label">{label}</span>
    </div>
  );
}

// ── Stats tab ────────────────────────────────────────────────────────────────

interface StatsTabProps {
  profile: typeof PROFILE;
  winRate: number;
  raceColor: string;
  raceGlow: string;
}

function StatsTab({ profile, winRate, raceColor, raceGlow }: StatsTabProps) {
  return (
    <>
      {/* Battle record */}
      <MangaPanel className="pf-panel" halftone>
        <div className="pf-panel-title">
          <span>Savaş Kaydı</span>
          <span className="pf-panel-title-accent">{fmt(profile.battles)}</span>
        </div>

        <div className="pf-record-grid">
          <RecordCell label="Toplam"   value={profile.battles} color="var(--color-text-primary)" />
          <RecordCell label="Kazandı"  value={profile.wins}    color="var(--color-success)" />
          <RecordCell label="Kaybetti" value={profile.losses}  color="var(--color-danger)" />
        </div>

        <div className="pf-winrate-block">
          <div className="pf-winrate-row">
            <span>Kazanma Oranı</span>
            <strong>%{winRate}</strong>
          </div>
          <ProgressBar value={winRate} variant="health" size="xs" glow animated />
        </div>
      </MangaPanel>

      {/* Detail stats */}
      <MangaPanel className="pf-panel" halftone>
        <div className="pf-panel-title">
          <span>Komutan Dosyası</span>
        </div>
        <div className="pf-detail-grid">
          <DetailCell label="PvP Sıralaması" value={`#${fmt(profile.pvpRank)}`} sub={`${fmt(profile.pvpScore)} puan`} color={raceColor} />
          <DetailCell label="En İyi Seri"    value={`${profile.bestStreak} zafer`} sub="Üst üste"             color="var(--color-warning)" />
          <DetailCell label="Lonca Katkısı"  value={fmt(profile.guildContrib)}    sub="Sezon toplamı"        color="var(--color-accent)" />
          <DetailCell label="Toplam Güç"     value={fmt(profile.power)}           sub="Komuta gücü"          color="var(--color-energy)" />
        </div>
      </MangaPanel>

      {/* Season pass */}
      <MangaPanel className="pf-panel" halftone>
        <div className="pf-season-row">
          <div className="pf-panel-title" style={{ marginBottom: 0 }}>
            <span>Sezon Geçişi</span>
          </div>
          <span
            className="pf-season-value"
            style={{ color: raceColor, textShadow: `0 0 8px ${raceGlow}` }}
          >
            {profile.seasonPass}/100
          </span>
        </div>
        <ProgressBar value={profile.seasonPass} variant="brand" size="sm" glow animated />
        <p className="pf-season-hint">
          Bir sonraki ödüle <strong>{100 - profile.seasonPass}</strong> seviye kaldı
        </p>
      </MangaPanel>
    </>
  );
}

interface RecordCellProps { label: string; value: number; color: string; }
function RecordCell({ label, value, color }: RecordCellProps) {
  return (
    <div className="pf-record-cell" style={{ '--cell-color': color } as React.CSSProperties}>
      <span className="pf-record-value">{fmt(value)}</span>
      <span className="pf-record-label">{label}</span>
    </div>
  );
}

interface DetailCellProps { label: string; value: string; sub: string; color: string; }
function DetailCell({ label, value, sub, color }: DetailCellProps) {
  return (
    <div className="pf-detail-cell" style={{ '--cell-color': color } as React.CSSProperties}>
      <span className="pf-detail-label">{label}</span>
      <span className="pf-detail-value">{value}</span>
      <span className="pf-detail-sub">{sub}</span>
    </div>
  );
}

// ── Achievements tab ─────────────────────────────────────────────────────────

interface AchievementsTabProps {
  achievements: Achievement[];
  earnedCount: number;
  totalCount: number;
}

function AchievementsTab({ achievements, earnedCount, totalCount }: AchievementsTabProps) {
  const pct = Math.round((earnedCount / totalCount) * 100);
  return (
    <MangaPanel className="pf-panel" halftone>
      <div className="pf-panel-title">
        <span>Başarımlar</span>
        <span className="pf-panel-title-accent">{earnedCount}/{totalCount}</span>
      </div>

      <div className="pf-achievements-progress">
        <span>Tamamlanma</span>
        <strong>%{pct}</strong>
      </div>
      <ProgressBar value={pct} variant="brand" size="xs" glow animated />

      <div className="pf-achievements-grid" style={{ marginTop: 14 }}>
        {achievements.map((ach) => {
          const color = ach.earned ? RARITY_COLOR[ach.rarity] : 'rgba(255,255,255,0.10)';
          const bg    = ach.earned ? RARITY_BG[ach.rarity]    : 'rgba(255,255,255,0.015)';
          return (
            <div
              key={ach.id}
              className={`pf-ach-card ${ach.earned ? 'earned' : 'locked'}`}
              style={{
                '--ach-color': color,
                '--ach-bg':    bg,
              } as React.CSSProperties}
              tabIndex={0}
              role="button"
              aria-label={`${ach.label} ${ach.earned ? '— kazanıldı' : '— kilitli'}`}
            >
              <span className="pf-ach-icon">{ach.icon}</span>
              <span className="pf-ach-label">{ach.label}</span>
              {!ach.earned && <span className="pf-ach-lock" aria-hidden>🔒</span>}
            </div>
          );
        })}
      </div>
    </MangaPanel>
  );
}

// ── History tab ──────────────────────────────────────────────────────────────

interface HistoryTabProps { entries: BattleEntry[]; }

function HistoryTab({ entries }: HistoryTabProps) {
  return (
    <MangaPanel className="pf-panel" halftone>
      <div className="pf-panel-title">
        <span>Son Savaşlar</span>
        <span className="pf-panel-title-accent">{entries.length}</span>
      </div>
      <div className="pf-history-list" role="list">
        {entries.map((entry, idx) => (
          <HistoryRow key={entry.id} entry={entry} rowIndex={idx} />
        ))}
      </div>
    </MangaPanel>
  );
}

interface HistoryRowProps { entry: BattleEntry; rowIndex: number; }
function HistoryRow({ entry, rowIndex }: HistoryRowProps) {
  const resultColor = entry.result === 'win' ? 'var(--color-success)' : 'var(--color-danger)';
  const resultLabel = entry.result === 'win' ? 'Zafer' : 'Yenilgi';
  const race = RACE_META[entry.opponentRace];
  const deltaSign = entry.delta > 0 ? '+' : '';

  return (
    <div
      className="pf-history-row"
      role="listitem"
      style={{
        '--result-color': resultColor,
        '--row-index': rowIndex,
      } as React.CSSProperties}
    >
      <div className="pf-history-result">
        <span className="pf-history-result-chip">{resultLabel}</span>
        <span className="pf-history-mode">{MODE_LABEL[entry.mode]}</span>
      </div>

      <div className="pf-history-mid">
        <div className="pf-history-line1">
          <span className="pf-history-vs">vs</span>
          <span>{entry.opponentName}</span>
          <span
            className="pf-history-race-badge"
            style={{ color: race.color, borderColor: `${race.color}55` }}
          >
            <span aria-hidden>{race.icon}</span>
            <span>{entry.opponentRace}</span>
          </span>
        </div>
        <div className="pf-history-line2">
          <span>{entry.whenLabel}</span>
          <span className="dot">•</span>
          <span>{entry.scoreLabel}</span>
        </div>
      </div>

      <div className="pf-history-right">
        <span className="pf-history-delta">{deltaSign}{fmt(entry.delta)}</span>
        <span className="pf-history-delta-unit">{entry.mode === 'pve' ? 'XP' : entry.mode === 'siege' ? 'Güç' : 'PvP'}</span>
      </div>
    </div>
  );
}
