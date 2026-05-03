'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { Race, RACE_DESCRIPTIONS, CommanderInfo } from '@/types/units';
import { TIER_NAMES } from '@/types/progression';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { GlowButton } from '@/components/ui/GlowButton';

interface MatchRecord {
  id: string;
  result: 'win' | 'loss';
  mode: 'PvP' | 'PvE' | 'Ranked';
  race: Race;
  opponentRace: Race;
  commanderId: string;
  durationMin: number;
  xpGained: number;
  ago: string;
}

const navItems = [
  { href: '/dashboard', label: 'Komuta Merkezi', icon: '🏠', active: true },
  { href: '/dashboard/fleet', label: 'Filo', icon: '🚀' },
  { href: '/dashboard/battle', label: 'Savaş', icon: '⚔️' },
  { href: '/dashboard/guild', label: 'Lonca', icon: '🛡️' },
  { href: '/dashboard/sectors', label: 'Sektörler', icon: '🌍' },
  { href: '/dashboard/shop', label: 'Mağaza', icon: '🛍️' },
  { href: '/dashboard/settings', label: 'Ayarlar', icon: '⚙️' },
]

const RECENT_MATCHES: MatchRecord[] = [
  { id: 'm1', result: 'win',  mode: 'PvP',    race: Race.INSAN,   opponentRace: Race.ZERG,    commanderId: 'voss',           durationMin: 14, xpGained: 240, ago: '12dk önce' },
  { id: 'm2', result: 'loss', mode: 'Ranked', race: Race.INSAN,   opponentRace: Race.SEYTAN,  commanderId: 'voss',           durationMin: 21, xpGained: 80,  ago: '1sa önce' },
  { id: 'm3', result: 'win',  mode: 'PvP',    race: Race.OTOMAT,  opponentRace: Race.CANAVAR, commanderId: 'demiurge_prime', durationMin: 9,  xpGained: 220, ago: '3sa önce' },
  { id: 'm4', result: 'win',  mode: 'PvE',    race: Race.ZERG,    opponentRace: Race.OTOMAT,  commanderId: 'vex_thara',      durationMin: 18, xpGained: 160, ago: 'Dün' },
  { id: 'm5', result: 'loss', mode: 'Ranked', race: Race.SEYTAN,  opponentRace: Race.INSAN,   commanderId: 'malphas',        durationMin: 27, xpGained: 60,  ago: 'Dün' },
];

const QUICK_LINKS = [
  { href: '/commanders',      icon: '⚔️', label: 'Komutanlar', desc: 'Ekibini oluştur' },
  { href: '/battle?mode=pve', icon: '🎯', label: 'Savaş',      desc: 'PvE / PvP başlat' },
  { href: '/progression',     icon: '📈', label: 'İlerleme',   desc: 'Çağ yolculuğun' },
];

const NAV_LINKS = [
  { href: '/',                icon: '🏰', label: 'Ana Üs',      desc: 'İmparatorluğunu yönet' },
  { href: '/dashboard',       icon: '👤', label: 'Profil',      desc: 'İstatistik & lonca' },
  { href: '/race-selection',  icon: '🧬', label: 'Irk Seç',     desc: 'Stratejini belirle' },
  { href: '/commanders',      icon: '⚔️', label: 'Komutanlar', desc: 'Ekibini oluştur' },
  { href: '/battle?mode=pve', icon: '🎯', label: 'Savaş',      desc: 'PvE modu ile başla' },
  { href: '/progression',     icon: '📈', label: 'İlerleme',   desc: 'Çağ yolculuğun' },
];

const PROFILE = {
  playerName: 'Komutan',
  level: 12,
  age: 1,
  tier: 2,
  totalXp: 14800,
  xpInLevel: 800,
  xpToNext: 1200,
  pvpMatches: 47,
  pvpWins: 31,
  guild: { name: 'Nebula Gücü', tag: 'NG', rank: 14, members: 23, capacity: 50 },
};

function findCommander(commanderId: string): CommanderInfo | null {
  for (const desc of Object.values(RACE_DESCRIPTIONS)) {
    const found = desc.commanders.find((c) => c.id === commanderId);
    if (found) return found;
  }
  return null;
}

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
      className="min-h-[100dvh] flex flex-col lg:flex-row relative"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Background ambience */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />
      <div className="fixed inset-0 halftone-bg pointer-events-none opacity-15" aria-hidden />

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-64 shrink-0 relative z-20"
        style={{
          background: 'rgba(8,10,16,0.95)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/">
            <span
              className="font-display text-xs font-black tracking-[0.2em] uppercase block"
              style={{ color: raceColor }}
            >
              ◆ NEBULA DOMINION
            </span>
          </Link>
        </div>

        {/* Mini commander chip */}
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full overflow-hidden border-2"
              style={{ borderColor: raceColor, boxShadow: `0 0 12px ${raceGlow}` }}
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
            <div className="min-w-0">
              <div className="font-display text-sm font-black text-text-primary truncate">{PROFILE.playerName}</div>
              <div className="font-display text-[10px] text-text-muted">Çağ {PROFILE.age} · Sv. {PROFILE.level}</div>
              <div className="font-display text-[10px] mt-0.5 truncate" style={{ color: raceColor }}>
                {raceDesc.icon} {raceDesc.name}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_LINKS.map((item) => {
            const isActive = item.href === '/dashboard';
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-white/05 group"
                style={isActive ? { background: 'rgba(255,255,255,0.04)', boxShadow: `inset 0 0 0 1px ${raceColor}40` } : undefined}
              >
                <span className="text-base leading-none" aria-hidden>{item.icon}</span>
                <div className="min-w-0">
                  <div
                    className="font-display text-xs font-bold transition-colors"
                    style={{ color: isActive ? raceColor : undefined }}
                  >
                    <span className={isActive ? '' : 'text-text-secondary group-hover:text-text-primary'}>{item.label}</span>
                  </div>
                  <div className="text-text-muted text-[10px] truncate">{item.desc}</div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-slow" style={{ background: '#44ff88' }} />
            <span className="font-display text-[10px] text-text-muted uppercase tracking-widest">Sunucu Bağlı</span>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 overflow-auto">
        <header
          className="sticky top-0 z-40 flex items-center justify-between px-4 py-3"
          style={{
            background: 'rgba(8,10,16,0.9)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-text-muted text-xs lg:hidden">← Üs</Link>
            <div>
              <span className="badge badge-race mr-2 hidden sm:inline-flex">Profil</span>
              <span className="font-display text-sm font-black text-text-primary">Komuta Merkezi</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-sm px-2 py-1.5" aria-label="Bildirimler">🔔</button>
            <div
              className="w-8 h-8 rounded-full overflow-hidden border"
              style={{ borderColor: raceColor }}
            >
              {!navImgError ? (
                <Image
                  src={primaryCommander.portrait}
                  alt="Profil"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover object-top"
                  onError={() => setNavImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: raceDesc.bgColor }}>
                  {raceDesc.icon}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
          {/* ── Hero: Big commander portrait + identity ─────────── */}
          <MangaPanel className="relative overflow-hidden animate-manga-appear">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 90% 100% at 100% 50%, ${raceDesc.glowColor} 0%, transparent 65%)`,
              }}
              aria-hidden
            />
            <div
              className="absolute inset-y-0 right-0 w-1/3 pointer-events-none opacity-40"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(115deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 18px)',
              }}
              aria-hidden
            />
            <div className="relative z-10 flex flex-col md:flex-row gap-6 p-5 sm:p-6">
              {/* Portrait */}
              <div className="relative shrink-0 mx-auto md:mx-0">
                <div
                  className="relative w-44 h-52 sm:w-52 sm:h-60 rounded-2xl overflow-hidden"
                  style={{
                    border: `2px solid ${raceColor}`,
                    boxShadow: `0 0 24px ${raceGlow}, inset 0 -40px 60px rgba(0,0,0,0.55)`,
                    background: raceDesc.bgColor,
                  }}
                >
                  {!heroImgError ? (
                    <Image
                      src={primaryCommander.portrait}
                      alt={primaryCommander.name}
                      fill
                      sizes="208px"
                      className="object-cover object-top"
                      onError={() => setHeroImgError(true)}
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl">{raceDesc.icon}</div>
                  )}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <span
                      className="font-display text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest"
                      style={{ background: 'rgba(0,0,0,0.6)', color: raceColor, border: `1px solid ${raceColor}66` }}
                    >
                      Sv. {PROFILE.level}
                    </span>
                    <span
                      className="font-display text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest"
                      style={{ background: 'rgba(0,0,0,0.6)', color: '#ffc832', border: '1px solid rgba(255,200,50,0.4)' }}
                    >
                      {tierLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="badge badge-race">{raceDesc.icon} {raceDesc.name}</span>
                  <span
                    className="font-display text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)' }}
                  >
                    Çağ {PROFILE.age}
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-black text-text-primary leading-tight mb-1">
                  {PROFILE.playerName}
                </h1>
                <p className="text-text-secondary text-sm mb-4 max-w-md">
                  {primaryCommander.story}
                </p>

                {/* XP bar */}
                <div className="mb-4 max-w-md">
                  <div className="flex justify-between font-display text-[10px] uppercase tracking-widest text-text-muted mb-1.5">
                    <span>Sonraki seviye</span>
                    <span>
                      {PROFILE.xpInLevel.toLocaleString('tr-TR')} / {(PROFILE.xpInLevel + PROFILE.xpToNext).toLocaleString('tr-TR')} XP
                    </span>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${xpProgressPercent}%`,
                        background: `linear-gradient(90deg, ${raceColor}, ${raceColor}aa)`,
                        boxShadow: `0 0 12px ${raceGlow}`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap mt-auto">
                  <GlowButton
                    size="sm"
                    icon={<span>⚔️</span>}
                    onClick={() => (window.location.href = '/battle?mode=pvp')}
                    style={{ background: raceColor }}
                  >
                    PvP Başlat
                  </GlowButton>
                  <GlowButton
                    size="sm"
                    variant="ghost"
                    onClick={() => (window.location.href = '/commanders')}
                  >
                    Komutanlar
                  </GlowButton>
                </div>
              </div>
            </div>
          </MangaPanel>

          {/* ── Stats grid ──────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="badge badge-race">Oyuncu İstatistikleri</span>
              <div className="flex-1 h-px" style={{ background: `${raceColor}20` }} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.map((stat) => (
                <MangaPanel key={stat.key} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl" aria-hidden>{stat.icon}</span>
                    <span className="font-display text-[10px] uppercase tracking-widest text-text-muted">
                      {stat.label}
                    </span>
                  </div>
                  <div className="font-display text-2xl font-black truncate" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                  {stat.key === 'rate' && (
                    <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${winRate}%`, background: stat.color, boxShadow: `0 0 8px ${stat.color}66` }}
                      />
                    </div>
                  )}
                  {stat.key === 'pvp' && (
                    <div className="mt-2 font-display text-[10px] text-text-muted">
                      {PROFILE.pvpWins}G · {PROFILE.pvpMatches - PROFILE.pvpWins}M
                    </div>
                  )}
                </MangaPanel>
              ))}
            </div>
          </section>

          {/* ── Two-column: Recent matches + Guild ───────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent matches */}
            <MangaPanel className="lg:col-span-2 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="badge badge-race">Son Maçlar</span>
                </div>
                <Link href="/battle" className="font-display text-[10px] uppercase tracking-widest text-text-muted hover:text-text-primary">
                  Tümü →
                </Link>
              </div>
              <ul className="space-y-2">
                {RECENT_MATCHES.map((m) => {
                  const myRace = RACE_DESCRIPTIONS[m.race];
                  const oppRace = RACE_DESCRIPTIONS[m.opponentRace];
                  const cmd = findCommander(m.commanderId);
                  const isWin = m.result === 'win';
                  const accent = isWin ? '#44ff88' : '#ff3355';
                  return (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/05"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderLeft: `3px solid ${accent}`,
                      }}
                    >
                      {/* Result tag */}
                      <div
                        className="font-display text-[10px] font-black w-12 text-center py-1 rounded uppercase tracking-widest shrink-0"
                        style={{
                          background: `${accent}1a`,
                          color: accent,
                          border: `1px solid ${accent}55`,
                        }}
                      >
                        {isWin ? 'Galip' : 'Mağlup'}
                      </div>

                      {/* Commander avatar */}
                      <div
                        className="w-10 h-10 rounded-full overflow-hidden border shrink-0"
                        style={{ borderColor: myRace.color, background: myRace.bgColor }}
                      >
                        {cmd ? (
                          <Image
                            src={cmd.portrait}
                            alt={cmd.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base">{myRace.icon}</div>
                        )}
                      </div>

                      {/* Match info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-sm font-bold text-text-primary truncate">
                          {cmd?.name ?? 'Komutan'}{' '}
                          <span className="font-normal text-text-muted">vs</span>{' '}
                          <span style={{ color: oppRace.color }}>
                            {oppRace.icon} {oppRace.name}
                          </span>
                        </div>
                        <div className="font-display text-[10px] uppercase tracking-widest text-text-muted">
                          <span style={{ color: myRace.color }}>{myRace.icon} {myRace.name}</span>
                          <span className="mx-1.5">·</span>
                          <span>{m.mode}</span>
                          <span className="mx-1.5">·</span>
                          <span>{m.durationMin}dk</span>
                        </div>
                      </div>

                      {/* XP & time */}
                      <div className="text-right shrink-0">
                        <div className="font-display text-xs font-black" style={{ color: '#cc00ff' }}>
                          +{m.xpGained} XP
                        </div>
                        <div className="font-display text-[10px] text-text-muted">{m.ago}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </MangaPanel>

            {/* Guild card */}
            <MangaPanel className="p-4 sm:p-5 relative overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 60% 80% at 100% 0%, ${raceColor}22 0%, transparent 70%)` }}
                aria-hidden
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="badge badge-race">Lonca</span>
                  <span
                    className="font-display text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest"
                    style={{ background: 'rgba(255,200,50,0.12)', color: '#ffc832', border: '1px solid rgba(255,200,50,0.35)' }}
                  >
                    #{PROFILE.guild.rank}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="font-display text-lg font-black text-text-primary leading-tight">
                    {PROFILE.guild.name}
                  </div>
                  <div className="font-display text-[10px] uppercase tracking-widest text-text-muted">
                    [{PROFILE.guild.tag}] · Galaksi sıralaması
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between font-display text-[10px] uppercase tracking-widest text-text-muted mb-1.5">
                      <span>Üyeler</span>
                      <span>
                        {PROFILE.guild.members} / {PROFILE.guild.capacity}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${guildPercent}%`,
                          background: raceColor,
                          boxShadow: `0 0 8px ${raceGlow}`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div
                      className="rounded-lg p-2 text-center"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="font-display text-[10px] uppercase tracking-widest text-text-muted">Sıra</div>
                      <div className="font-display text-base font-black" style={{ color: '#ffc832' }}>
                        #{PROFILE.guild.rank}
                      </div>
                    </div>
                    <div
                      className="rounded-lg p-2 text-center"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="font-display text-[10px] uppercase tracking-widest text-text-muted">Üye</div>
                      <div className="font-display text-base font-black" style={{ color: raceColor }}>
                        {PROFILE.guild.members}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <GlowButton size="sm" variant="ghost" className="w-full">
                      Lonca Sayfası
                    </GlowButton>
                  </div>
                </div>
              </div>
            </MangaPanel>
          </section>

          {/* ── Race switcher ───────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="badge badge-race">Irk Değiştir</span>
              <div className="flex-1 h-px" style={{ background: `${raceColor}20` }} />
              <Link href="/race-selection" className="font-display text-[10px] uppercase tracking-widest text-text-muted hover:text-text-primary">
                Detaylı seçim →
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.values(Race) as Race[]).map((r) => {
                const d = RACE_DESCRIPTIONS[r];
                const active = r === race;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      setRace(r);
                      setHeroImgError(false);
                      setNavImgError(false);
                    }}
                    aria-pressed={active}
                    className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300"
                    style={{
                      background: active ? d.bgColor : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? d.color : 'rgba(255,255,255,0.08)'}`,
                      color: active ? d.color : 'var(--color-text-muted)',
                      boxShadow: active ? `0 0 14px ${d.glowColor}` : 'none',
                      transform: active ? 'scale(1.04)' : 'scale(1)',
                    }}
                  >
                    <span className="text-base" aria-hidden>{d.icon}</span>
                    <span className="font-display text-xs font-bold uppercase tracking-wide">{d.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Quick links ─────────────────────────────────────── */}
          <section className="pb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="badge badge-race">Hızlı Erişim</span>
              <div className="flex-1 h-px" style={{ background: `${raceColor}20` }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {QUICK_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className="group">
                  <MangaPanel className="p-4 hover-glow transition-all duration-300 group-hover:border-white/15">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-transform duration-300 group-hover:scale-110"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-xs font-bold text-text-secondary group-hover:text-text-primary transition-colors mb-0.5">
                          {item.label}
                        </div>
                        <div className="text-text-muted text-[10px]">{item.desc}</div>
                      </div>
                      <span className="text-text-muted text-sm opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                  </MangaPanel>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
