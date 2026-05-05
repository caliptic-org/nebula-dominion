'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { RACE_DESCRIPTIONS } from '@/types/units';
import { TIER_NAMES } from '@/types/progression';

const navItems = [
  { href: '/dashboard', label: 'Komuta Merkezi', icon: '🏠', active: true },
  { href: '/',                    label: 'Ana Üs',     icon: '🏰' },
  { href: '/dashboard/fleet',     label: 'Filo',       icon: '🚀' },
  { href: '/dashboard/battle',    label: 'Savaş',      icon: '⚔️' },
  { href: '/dashboard/guild',     label: 'Lonca',      icon: '🛡️' },
  { href: '/dashboard/sectors',   label: 'Sektörler',  icon: '🌍' },
  { href: '/dashboard/shop',      label: 'Mağaza',     icon: '🛍️' },
  { href: '/settings',            label: 'Ayarlar',    icon: '⚙️' },
]

const playerStats = [
  { label: 'Seviye',  value: '1',     icon: '⭐', color: 'var(--color-energy)'         },
  { label: 'Çağ',     value: 'I',     icon: '🌀', color: 'var(--color-brand)'           },
  { label: 'Puan',    value: '0',     icon: '💎', color: 'var(--color-accent)'          },
  { label: 'Savaş',   value: '0W/0L', icon: '⚔️', color: 'var(--color-status-success)' },
];

const upcomingFeatures = [
  { title: 'Filo Yönetimi',    description: 'Birimlerini oluştur ve yönet',         icon: '🚀', eta: 'Hafta 3', color: '#4a9eff' },
  { title: 'PvP Savaşları',    description: 'Gerçek zamanlı rakip eşleştirme',      icon: '⚔️', eta: 'Hafta 5', color: '#ff6644' },
  { title: 'Sektör Kontrolü',  description: 'Çok oyunculu bölge savaşları',         icon: '🌌', eta: 'Çağ 4',   color: '#44ff88' },
  { title: 'Premium Mağaza',   description: 'Kozmetik itemler ve premium pass',     icon: '💎', eta: 'Çağ 5',   color: '#cc00ff' },
];

const PROFILE = {
  age: 'I',
  tier: 1,
  totalXp: 0,
  xpInLevel: 0,
  xpToNext: 100,
  pvpMatches: 0,
  pvpWins: 0,
  guild: { members: 0, capacity: 30 },
};

export default function DashboardPage() {
  const { race, setRace, raceColor, raceGlow } = useRaceTheme();
  const [heroImgError, setHeroImgError] = useState(false);
  const [navImgError, setNavImgError] = useState(false);
  const raceDesc = RACE_DESCRIPTIONS[race];
  const primaryCommander = raceDesc.commanders[0];

  const winRate = useMemo(() => {
    if (PROFILE.pvpMatches === 0) return 0;
    return Math.round((PROFILE.pvpWins / PROFILE.pvpMatches) * 100);
  }, []);

  const xpProgressPercent = useMemo(() => {
    const total = PROFILE.xpInLevel + PROFILE.xpToNext;
    return total > 0 ? Math.min(100, Math.round((PROFILE.xpInLevel / total) * 100)) : 0;
  }, []);

  const tierLabel = TIER_NAMES[PROFILE.tier] ?? `Tier ${PROFILE.tier}`;

  const stats = [
    { key: 'pvp',   label: 'PvP Maç',     value: String(PROFILE.pvpMatches),    icon: '⚔️',  color: '#ffc832' },
    { key: 'rate',  label: 'Kazanma %',   value: `${winRate}%`,                  icon: '🏆',  color: '#44ff88' },
    { key: 'xp',    label: 'Toplam XP',   value: PROFILE.totalXp.toLocaleString('tr-TR'), icon: '✨', color: '#cc00ff' },
    { key: 'era',   label: 'Çağ · Tier',  value: `${PROFILE.age} · ${tierLabel}`, icon: '🌀',  color: '#4a9eff' },
  ];

  const guildPercent = Math.round((PROFILE.guild.members / PROFILE.guild.capacity) * 100);

  return (
    <div
      className="h-dvh flex overflow-hidden relative"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Race-tinted overlay — cinematic atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0, opacity: 0.12 }}
        aria-hidden
      />
      {/* ─── Sidebar ───────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-64 shrink-0"
        style={{
          background: 'rgba(10, 14, 24, 0.95)',
          borderRight: '1px solid var(--color-border)',
          backdropFilter: 'blur(20px)',
        }}
        aria-label="Yan menü"
      >
        {/* Logo */}
        <div className="p-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Link href="/" className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>🌌</span>
            <span
              className="font-display text-sm font-black tracking-widest text-gradient-brand"
              style={{ letterSpacing: '2px' }}
            >
              NEBULA
            </span>
          </Link>
        </div>

        {/* Player info */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm text-black"
              style={{ background: 'var(--gradient-brand)' }}
              aria-hidden
            >
              {!navImgError ? (
                <Image
                  src={primaryCommander.portrait}
                  alt={primaryCommander.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover object-top"
                  onError={() => setNavImgError(true)}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-lg"
                  style={{ background: raceDesc.bgColor }}
                >
                  {raceDesc.icon}
                </div>
              )}
            </div>
            <div>
              <p className="text-text-primary text-sm font-semibold font-display">Komutan</p>
              <p className="text-text-muted font-body" style={{ fontSize: '11px' }}>Çağ I · Seviye 1</p>
            </div>
          </div>
          {/* Power score */}
          <div
            className="mt-3 flex items-center justify-between rounded px-3 py-2"
            style={{
              background: 'rgba(232,168,32,0.08)',
              border: '1px solid rgba(232,168,32,0.18)',
            }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Güç Puanı</span>
            <span className="text-sm font-black" style={{ color: 'var(--color-brand)' }}>18,420 ⚔️</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5" aria-label="Dashboard navigasyon">
          {navItems.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all font-body"
              style={{
                background: item.active ? 'var(--color-brand-dim)' : 'transparent',
                color: item.active ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                border: item.active ? '1px solid rgba(108,142,240,0.2)' : '1px solid transparent',
              }}
              aria-current={item.active ? 'page' : undefined}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Status */}
        <div className="p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse-slow"
              style={{ background: 'var(--color-success)', boxShadow: '0 0 6px var(--color-success)' }}
              aria-label="Bağlantı durumu: bağlı"
            />
            <span className="text-text-muted font-body" style={{ fontSize: '11px' }}>Sunucu bağlı</span>
          </div>
        </div>
      </aside>

      {/* ─── Main ──────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{
            background: 'rgba(10, 13, 20, 0.90)',
            borderBottom: '1px solid var(--color-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 lg:hidden" aria-label="Ana sayfa">
              <span aria-hidden>🌌</span>
            </Link>
            <h1 className="manga-title" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
              KOMUTA MERKEZİ
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-ghost text-sm" aria-label="Bildirimler">
              🔔
            </button>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm text-black"
              style={{ background: 'var(--gradient-brand)' }}
              aria-label="Profil"
            >
              K
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-5 max-w-5xl">

          {/* Welcome banner */}
          <section
            className="glass-panel p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(108,142,240,0.08) 0%, rgba(61,212,192,0.04) 100%)',
              border: '1px solid rgba(108,142,240,0.18)',
            }}
            aria-labelledby="welcome-heading"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <h2 id="welcome-heading" className="font-display text-lg font-black text-text-primary">
                  Galaksiye Hoş Geldin, Komutan!
                </h2>
                <span className="badge badge-brand">Kapalı Beta</span>
              </div>
              <p className="text-text-secondary font-body text-sm mb-4">
                Nebula Dominion kapalı beta aşamasında. Savaş sistemi ve filo yönetimi yakında açılıyor.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-accent">Hafta 1–2</span>
                <Link href="/" className="badge badge-energy hover:brightness-110 transition-all">
                  Ana Üssüne Git →
                </Link>
              </div>
            </div>
            <span
              className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-5 pointer-events-none select-none hidden sm:block animate-float"
              aria-hidden
            >
              🚀
            </span>
          </section>

          <div className="panel-divider" aria-hidden />

          {/* ── Player stats ────────────────────────────────────────── */}
          <section aria-labelledby="stats-heading">
            <h2
              id="stats-heading"
              className="font-display text-xs font-bold text-text-muted uppercase tracking-widest mb-3"
              style={{ letterSpacing: '2px' }}
            >
              Oyuncu İstatistikleri
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {playerStats.map((stat) => (
                <div
                  key={stat.label}
                  className="stat-card cinematic-border-race p-4 transition-all hover-glow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="relative inline-flex items-center justify-center w-7 h-7 text-lg"
                      aria-hidden
                      style={
                        {
                          ['--hud-ring-color' as string]: `${stat.color}55`,
                          ['--hud-ring-shadow-outer' as string]: `${stat.color}26`,
                          ['--hud-ring-shadow-inner' as string]: `${stat.color}1A`,
                        } as React.CSSProperties
                      }
                    >
                      <span className="hud-ring" />
                      <span className="hud-ring hud-ring-dashed hud-ring-inset" />
                      {stat.icon}
                    </span>
                    <span className="manga-label">{stat.label}</span>
                  </div>
                  <p className="manga-number" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="panel-divider" aria-hidden />

          {/* Upcoming features */}
          <section aria-labelledby="features-heading">
            <h2
              id="features-heading"
              className="font-display text-xs font-bold text-text-muted uppercase tracking-widest mb-3"
              style={{ letterSpacing: '2px' }}
            >
              Yakında Gelecek Özellikler
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingFeatures.map((feat) => (
                <div
                  key={feat.title}
                  className="glass-card p-4 flex items-start gap-4 group hover-glow"
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: `${feat.color}15`,
                      border: `1px solid ${feat.color}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    {feat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-text-primary text-sm">{feat.title}</h3>
                      <span className="badge badge-energy shrink-0">{feat.eta}</span>
                    </div>
                    <p className="font-body text-text-muted text-sm">{feat.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="panel-divider" aria-hidden />

          {/* ── Game area placeholder ──────────────────────────────── */}
          <section aria-labelledby="game-heading">
            <h2
              id="game-heading"
              className="font-display text-xs font-bold text-text-muted uppercase tracking-widest mb-3"
              style={{ letterSpacing: '2px' }}
            >
              Oyun Alanı
            </h2>
            <div
              className="glass-panel flex flex-col items-center justify-center text-center p-12"
              style={{
                minHeight: '280px',
                background: 'radial-gradient(ellipse at center, rgba(108,142,240,0.05) 0%, transparent 65%)',
                border: '1px dashed var(--color-border-hover)',
              }}
            >
              <div className="text-6xl mb-4 animate-float" aria-hidden>🚀</div>
              <h3 className="font-display text-lg font-black mb-2 text-text-primary">
                Phaser.js Savaş Motoru
              </h3>
              <p className="text-text-secondary font-body text-sm max-w-sm mb-4">
                Savaş sistemi geliştirme aşamasında. Hafta 4&apos;te BattleScene burada devreye girecek.
              </p>
              <div className="flex gap-2">
                <span className="badge badge-brand">Hafta 4</span>
                <span className="badge badge-accent">Phaser.js 3.60</span>
              </div>
              <Link
                href="/battle"
                className="btn-primary mt-6"
              >
                ⚔️ Savaşa Gir (Demo)
              </Link>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
