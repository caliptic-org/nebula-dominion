import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const navItems = [
  { href: '/dashboard', label: 'Komuta Merkezi', icon: '🏠', active: true },
  { href: '/',          label: 'Ana Üs',          icon: '🏰' },
  { href: '/battle',    label: 'Savaş',            icon: '⚔️' },
  { href: '#',          label: 'Sektörler',        icon: '🌍' },
  { href: '#',          label: 'Mağaza',           icon: '💎' },
  { href: '#',          label: 'Ayarlar',          icon: '⚙️' },
];

const playerStats = [
  { label: 'Seviye',  value: '1',     icon: '⭐', color: 'var(--color-energy)'         },
  { label: 'Çağ',     value: 'I',     icon: '🌀', color: 'var(--color-brand)'           },
  { label: 'Puan',    value: '0',     icon: '💎', color: 'var(--color-accent)'          },
  { label: 'Savaş',   value: '0W/0L', icon: '⚔️', color: 'var(--color-status-success)' },
];

const upcomingFeatures = [
  { title: 'Filo Yönetimi',    description: 'Birimlerini oluştur ve yönet',         icon: '🚀', eta: 'Hafta 3'  },
  { title: 'PvP Savaşları',    description: 'Gerçek zamanlı rakip eşleştirme',      icon: '⚔️', eta: 'Hafta 5'  },
  { title: 'Sektör Kontrolü',  description: 'Çok oyunculu bölge savaşları',         icon: '🌌', eta: 'Çağ 4'    },
  { title: 'Premium Mağaza',   description: 'Kozmetik itemler ve premium pass',     icon: '💎', eta: 'Çağ 5'    },
];

export default function DashboardPage() {
  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--color-bg)' }}
    >
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
              K
            </div>
            <div>
              <p className="text-text-primary text-sm font-semibold font-display">Komutan</p>
              <p className="text-text-muted font-body" style={{ fontSize: '11px' }}>Çağ I · Seviye 1</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1" aria-label="Dashboard navigasyon">
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
            <h1 className="font-display text-base font-black text-text-primary tracking-widest" style={{ letterSpacing: '1px' }}>
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

          {/* Player stats */}
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
                  className="glass-card p-4 transition-all hover-glow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg" aria-hidden>{stat.icon}</span>
                    <span className="font-display text-xs text-text-muted uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <p
                    className="font-display text-2xl font-black"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

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
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-110"
                    style={{ background: 'var(--color-bg-elevated)' }}
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

          {/* Game area placeholder */}
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
