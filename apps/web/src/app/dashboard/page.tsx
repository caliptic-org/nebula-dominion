'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { GlowButton } from '@/components/ui/GlowButton';

const PLAYER_STATS = [
  { label: 'Seviye', value: '1', icon: '⭐', color: '#ffc832' },
  { label: 'Çağ', value: 'I', icon: '🌀', color: '#4a9eff' },
  { label: 'Kazanma Oranı', value: '—', icon: '⚔️', color: '#44ff88' },
  { label: 'Toplam XP', value: '0', icon: '✨', color: '#cc00ff' },
];

const QUICK_LINKS = [
  { href: '/', icon: '🏰', label: 'Ana Üs', desc: 'İmparatorluğunu yönet' },
  { href: '/race-selection', icon: '🧬', label: 'Irk Seç', desc: 'Stratejini belirle' },
  { href: '/commanders', icon: '⚔️', label: 'Komutanlar', desc: 'Ekibini oluştur' },
  { href: '/battle?mode=pve', icon: '🎯', label: 'Savaş', desc: 'PvE modu ile başla' },
  { href: '/progression', icon: '📈', label: 'İlerleme', desc: 'Çağ yolculuğun' },
];

export default function DashboardPage() {
  const { race, setRace, raceColor, raceGlow } = useRaceTheme();
  const [imgError, setImgError] = useState(false);
  const raceDesc = RACE_DESCRIPTIONS[race];
  const primaryCommander = raceDesc.commanders[0];

  return (
    <div
      className="min-h-[100dvh] flex flex-col lg:flex-row relative"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Background */}
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
        {/* Logo */}
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

        {/* Commander profile */}
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full overflow-hidden border-2"
              style={{ borderColor: raceColor, boxShadow: `0 0 12px ${raceGlow}` }}
            >
              {!imgError ? (
                <Image
                  src={primaryCommander.portrait}
                  alt={primaryCommander.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover object-top"
                  onError={() => setImgError(true)}
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
              <div className="font-display text-sm font-black text-text-primary">Komutan</div>
              <div className="font-display text-[10px] text-text-muted">Çağ I · Seviye 1</div>
              <div className="font-display text-[10px] mt-0.5" style={{ color: raceColor }}>
                {raceDesc.icon} {raceDesc.name}
              </div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-white/04 group"
            >
              <span className="text-base leading-none">{item.icon}</span>
              <div>
                <div className="font-display text-xs font-bold text-text-secondary group-hover:text-text-primary transition-colors">
                  {item.label}
                </div>
                <div className="text-text-muted text-[10px]">{item.desc}</div>
              </div>
            </Link>
          ))}
        </nav>

        {/* Connection status */}
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
              <span className="badge badge-race mr-2 hidden sm:inline-flex">Dashboard</span>
              <span className="font-display text-sm font-black text-text-primary">Komuta Merkezi</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-sm px-2 py-1.5" aria-label="Bildirimler">🔔</button>
            <div
              className="w-8 h-8 rounded-full overflow-hidden border"
              style={{ borderColor: raceColor }}
            >
              {!imgError ? (
                <Image
                  src={primaryCommander.portrait}
                  alt="Profil"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover object-top"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: raceDesc.bgColor }}>
                  {raceDesc.icon}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
          {/* Welcome banner */}
          <MangaPanel className="p-6 relative overflow-hidden animate-manga-appear">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 80% 100% at 100% 50%, ${raceDesc.glowColor} 0%, transparent 65%)`,
              }}
              aria-hidden
            />
            <div className="relative z-10 flex items-start justify-between gap-6">
              <div>
                <div className="mb-3">
                  <span className="badge badge-race">Kapalı Beta</span>
                </div>
                <h2 className="font-display text-xl font-black text-text-primary mb-2">
                  Galaksiye Hoş Geldin,{' '}
                  <span style={{ color: raceColor, textShadow: `0 0 12px ${raceGlow}` }}>Komutan</span>!
                </h2>
                <p className="text-text-secondary text-sm max-w-sm mb-4">
                  Nebula Dominion beta aşamasında. Irk seçimini yap ve imparatorluğunu kurmaya başla.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <GlowButton size="sm" onClick={() => (window.location.href = '/race-selection')} icon={<span>→</span>} style={{ background: raceColor }}>
                    Irk Seç
                  </GlowButton>
                  <GlowButton size="sm" variant="ghost" onClick={() => (window.location.href = '/')}>
                    Ana Üs
                  </GlowButton>
                </div>
              </div>
              <div className="hidden sm:block relative w-24 h-28 shrink-0">
                {!imgError ? (
                  <Image
                    src={primaryCommander.portrait}
                    alt={primaryCommander.name}
                    fill
                    className="object-contain object-bottom"
                    style={{ filter: `drop-shadow(0 0 12px ${raceGlow})` }}
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="text-5xl flex items-center justify-center w-full h-full">{raceDesc.icon}</div>
                )}
              </div>
            </div>
          </MangaPanel>

          {/* Stats */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="badge badge-race">Oyuncu İstatistikleri</span>
              <div className="flex-1 h-px" style={{ background: `${raceColor}20` }} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {PLAYER_STATS.map((stat) => (
                <MangaPanel key={stat.label} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{stat.icon}</span>
                    <span className="font-display text-[10px] uppercase tracking-widest text-text-muted">{stat.label}</span>
                  </div>
                  <div className="font-display text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                </MangaPanel>
              ))}
            </div>
          </section>

          {/* Quick links */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="badge badge-race">Hızlı Erişim</span>
              <div className="flex-1 h-px" style={{ background: `${raceColor}20` }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

          {/* Race switcher */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="badge badge-race">Irk</span>
              <div className="flex-1 h-px" style={{ background: `${raceColor}20` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.values(Race) as Race[]).map((r) => {
                const d = RACE_DESCRIPTIONS[r];
                const active = r === race;
                return (
                  <button
                    key={r}
                    onClick={() => setRace(r)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300"
                    style={{
                      background: active ? d.bgColor : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? d.color : 'rgba(255,255,255,0.08)'}`,
                      color: active ? d.color : '#666',
                      boxShadow: active ? `0 0 14px ${d.glowColor}` : 'none',
                      transform: active ? 'scale(1.04)' : 'scale(1)',
                    }}
                  >
                    <span className="text-base">{d.icon}</span>
                    <span className="font-display text-xs font-bold uppercase tracking-wide">{d.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
