'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BottomNav } from '@/components/ui/BottomNav';

// ── Types ────────────────────────────────────────────────────────────────────

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type ProfileTab = 'stats' | 'achievements' | 'history';

interface Achievement {
  id: string;
  icon: string;
  label: string;
  rarity: Rarity;
  earned: boolean;
}

// ── Design tokens for achievement rarities ────────────────────────────────────

const RARITY_COLOR: Record<Rarity, string> = {
  common:    'rgba(160,168,192,0.85)',
  uncommon:  'rgba(68,255,136,0.85)',
  rare:      'rgba(74,158,255,0.90)',
  epic:      'rgba(204,0,255,0.90)',
  legendary: 'rgba(255,200,50,1)',
};

const RARITY_BG: Record<Rarity, string> = {
  common:    'rgba(160,168,192,0.08)',
  uncommon:  'rgba(68,255,136,0.10)',
  rare:      'rgba(74,158,255,0.12)',
  epic:      'rgba(204,0,255,0.14)',
  legendary: 'rgba(255,200,50,0.18)',
};

// ── Mock profile data ─────────────────────────────────────────────────────────
// Replace with API call: getProfile(userId)

const PROFILE = {
  username:    'nova_star',
  displayName: 'Nova★',
  race:        'İnsan',
  raceDataAttr: 'insan',
  level:       47,
  title:       'Yıldız Komutanı',
  avatarUrl:   null as string | null,
  power:       142_800,
  globalRank:  1247,
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
    { id: 'a2', icon: '🏆', label: 'Şampiyon',        rarity: 'rare'      as Rarity, earned: true  },
    { id: 'a3', icon: '💎', label: 'Elmas Sezon',     rarity: 'epic'      as Rarity, earned: true  },
    { id: 'a4', icon: '🌌', label: 'Nebula Kaşifi',   rarity: 'epic'      as Rarity, earned: true  },
    { id: 'a5', icon: '👑', label: 'Efsane',          rarity: 'legendary' as Rarity, earned: false },
    { id: 'a6', icon: '🔥', label: 'Ateş Ustası',     rarity: 'rare'      as Rarity, earned: true  },
    { id: 'a7', icon: '⚡', label: 'Hız Tanrısı',    rarity: 'uncommon'  as Rarity, earned: true  },
    { id: 'a8', icon: '🛡️', label: 'Kalkan Efendisi', rarity: 'uncommon'  as Rarity, earned: false },
  ] as Achievement[],
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

  const profile  = PROFILE;
  const winRate  = Math.round((profile.wins  / profile.battles) * 100);
  const xpPct    = Math.round((profile.xp    / profile.xpNext)  * 100);
  const earnedCount = profile.achievements.filter((a) => a.earned).length;

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden" style={{ height: 260 }}>

        {/* Race radial gradient sky */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 160% 90% at 50% -10%,
                ${raceGlow} 0%,
                rgba(8,10,16,0.92) 65%
              )
            `,
          }}
        />

        {/* Speed-line diagonal texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.055,
            backgroundImage: `repeating-linear-gradient(
              -58deg,
              transparent 0px,
              transparent 6px,
              ${raceColor} 6px,
              ${raceColor} 7px
            )`,
          }}
        />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 flex items-center gap-1.5 transition-opacity duration-200"
          style={{
            opacity: 0.65,
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.65')}
          aria-label="Geri"
        >
          <span style={{ fontSize: 18 }}>←</span>
          <span className="hidden sm:inline">Geri</span>
        </button>

        {/* Settings shortcut (own profile) */}
        <button
          onClick={() => router.push('/settings')}
          className="absolute top-4 right-4 flex items-center justify-center rounded-full transition-all duration-200"
          style={{
            width: 36,
            height: 36,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'var(--color-text-secondary)',
            fontSize: 16,
          }}
          aria-label="Ayarlar"
        >
          ⚙
        </button>

        {/* Avatar — HUD concentric ring rig */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: -52, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          {/* Outer spinning dashed ring */}
          <div
            style={{
              position: 'relative',
              width: 132,
              height: 132,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `2px dashed ${raceColor}`,
                opacity: 0.38,
                animation: 'spin 24s linear infinite',
              }}
            />
            {/* Inner static accent ring */}
            <div
              style={{
                position: 'absolute',
                inset: 10,
                borderRadius: '50%',
                border: `1px solid ${raceColor}50`,
                boxShadow: `0 0 14px ${raceGlow}, inset 0 0 10px ${raceGlow}`,
              }}
            />
            {/* Avatar circle */}
            <div
              style={{
                position: 'relative',
                width: 98,
                height: 98,
                borderRadius: '50%',
                overflow: 'hidden',
                background: `radial-gradient(circle at 38% 36%, ${raceDim}, rgba(8,10,16,0.92))`,
                border: `2px solid ${raceColor}`,
                boxShadow: `0 0 22px ${raceGlow}, 0 0 44px ${raceGlow}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 38,
                color: raceColor,
                textShadow: `0 0 16px ${raceGlow}`,
              }}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                profile.displayName[0]
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── PLAYER IDENTITY ── */}
      <section
        className="flex flex-col items-center text-center px-4"
        style={{ paddingTop: 68, paddingBottom: 20 }}
      >
        {/* Title eyebrow badge */}
        <span
          style={{
            display: 'inline-block',
            padding: '3px 12px',
            borderRadius: 999,
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            background: `${raceColor}18`,
            border: `1px solid ${raceColor}40`,
            color: raceColor,
            marginBottom: 8,
          }}
        >
          {profile.title}
        </span>

        {/* Display name */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(1.6rem, 6vw, 2.4rem)',
            letterSpacing: '-0.01em',
            color: 'var(--color-text)',
            textShadow: `0 0 22px ${raceGlow}`,
            margin: '0 0 6px',
          }}
        >
          {profile.displayName}
        </h1>

        {/* Username · Level · Race badge row */}
        <div
          className="flex items-center gap-2 flex-wrap justify-center"
          style={{ marginBottom: 6 }}
        >
          <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
            @{profile.username}
          </span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>·</span>
          {/* Level */}
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              background: 'rgba(255,200,50,0.14)',
              border: '1px solid rgba(255,200,50,0.40)',
              color: '#ffc832',
            }}
          >
            Sv.{profile.level}
          </span>
          {/* Race badge */}
          <span
            style={{
              padding: '2px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              background: `${raceColor}1c`,
              border: `1px solid ${raceColor}55`,
              color: raceColor,
            }}
          >
            {profile.race}
          </span>
        </div>

        {/* Alliance */}
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-body)',
            marginBottom: 16,
          }}
        >
          🤝 {profile.alliance} · {profile.allianceRole}
        </p>

        {/* XP bar */}
        <div style={{ width: '100%', maxWidth: 300 }}>
          <div
            className="flex justify-between"
            style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginBottom: 6 }}
          >
            <span>Deneyim Puanı</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {fmt(profile.xp)} / {fmt(profile.xpNext)} XP
            </span>
          </div>
          <ProgressBar value={xpPct} variant="xp" size="sm" glow animated />
        </div>
      </section>

      {/* ── QUICK STATS ROW ── */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-4">
        {[
          { label: 'Güç',        value: fmt(profile.power),      icon: '⚡', color: '#ffc832'  },
          { label: 'Küresel #',  value: `#${fmt(profile.globalRank)}`, icon: '🏆', color: raceColor },
          { label: 'Kazanma %',  value: `%${winRate}`,           icon: '⚔️', color: '#44ff88'  },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1 text-center rounded-xl py-3 px-1"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.055)',
            }}
          >
            <span style={{ fontSize: 18 }}>{stat.icon}</span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(0.85rem, 3.5vw, 1.1rem)',
                color: stat.color,
                textShadow: `0 0 10px ${stat.color}55`,
              }}
            >
              {stat.value}
            </span>
            <span
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── TAB BAR ── */}
      <div className="flex px-4 gap-1.5 mb-4">
        {([
          ['stats',        'İstatistik'],
          ['achievements', `Başarımlar (${earnedCount})`],
          ['history',      'Geçmiş'],
        ] as [ProfileTab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.25s cubic-bezier(0.32,0.72,0,1)',
              background:   tab === id ? `${raceColor}1e` : 'rgba(255,255,255,0.025)',
              border:       tab === id ? `1px solid ${raceColor}50` : '1px solid rgba(255,255,255,0.055)',
              color:        tab === id ? raceColor : 'var(--color-text-muted)',
              boxShadow:    tab === id ? `0 0 10px ${raceGlow}` : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="px-4 space-y-3">

        {/* STATS TAB */}
        {tab === 'stats' && (
          <>
            {/* Battle record */}
            <GlassPanel padding="md">
              <p
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)',
                  marginBottom: 14,
                }}
              >
                Savaş Kaydı
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Toplam',   value: profile.battles, color: 'var(--color-text)'    },
                  { label: 'Kazandı', value: profile.wins,    color: '#44ff88'              },
                  { label: 'Kaybetti',value: profile.losses,  color: '#ff3355'              },
                ].map((s) => (
                  <div key={s.label}>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 900,
                        fontSize: 'clamp(1.2rem, 5vw, 1.75rem)',
                        color: s.color,
                      }}
                    >
                      {fmt(s.value)}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                        color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-body)',
                        marginTop: 2,
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Win-rate bar */}
              <div style={{ marginTop: 16 }}>
                <div
                  className="flex justify-between"
                  style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginBottom: 6 }}
                >
                  <span>Kazanma Oranı</span>
                  <span style={{ color: '#44ff88', fontWeight: 700 }}>%{winRate}</span>
                </div>
                <ProgressBar value={winRate} variant="health" size="xs" glow animated />
              </div>
            </GlassPanel>

            {/* Season pass */}
            <GlassPanel padding="md">
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <p
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.18em',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Sezon Geçişi
                </p>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: 15,
                    color: raceColor,
                    textShadow: `0 0 8px ${raceGlow}`,
                  }}
                >
                  {profile.seasonPass}/100
                </span>
              </div>
              <ProgressBar value={profile.seasonPass} variant="brand" size="sm" glow animated />
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)',
                  marginTop: 10,
                }}
              >
                Bir sonraki ödüle {100 - profile.seasonPass} seviye kaldı
              </p>
            </GlassPanel>
          </>
        )}

        {/* ACHIEVEMENTS TAB */}
        {tab === 'achievements' && (
          <div className="grid grid-cols-4 gap-2">
            {profile.achievements.map((ach) => (
              <div
                key={ach.id}
                className="relative flex flex-col items-center gap-1.5 rounded-xl text-center"
                style={{
                  padding: '10px 4px',
                  background: ach.earned ? RARITY_BG[ach.rarity] : 'rgba(255,255,255,0.015)',
                  border: `1px solid ${ach.earned ? RARITY_COLOR[ach.rarity] : 'rgba(255,255,255,0.055)'}`,
                  opacity: ach.earned ? 1 : 0.38,
                  transition: 'transform 0.2s cubic-bezier(0.32,0.72,0,1)',
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    filter: ach.earned ? 'none' : 'grayscale(1) brightness(0.5)',
                  }}
                >
                  {ach.icon}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    lineHeight: 1.2,
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    color: ach.earned ? RARITY_COLOR[ach.rarity] : 'var(--color-text-muted)',
                  }}
                >
                  {ach.label}
                </span>
                {!ach.earned && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      fontSize: 8,
                      opacity: 0.6,
                    }}
                  >
                    🔒
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <GlassPanel padding="lg">
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span style={{ fontSize: 36 }}>⚔️</span>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Savaş geçmişi yakında geliyor
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Son savaşların, PvP performansın ve strateji özetlerin burada görünecek.
              </p>
            </div>
          </GlassPanel>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
