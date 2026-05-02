import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Dashboard',
}

const navItems = [
  { href: '/dashboard', label: 'Komuta Merkezi', icon: '🏠', active: true },
  { href: '/dashboard/fleet', label: 'Filo', icon: '🚀' },
  { href: '/dashboard/battle', label: 'Savaş', icon: '⚔️' },
  { href: '/dashboard/sectors', label: 'Sektörler', icon: '🌍' },
  { href: '/dashboard/shop', label: 'Mağaza', icon: '🛍️' },
  { href: '/dashboard/settings', label: 'Ayarlar', icon: '⚙️' },
]

const playerStats = [
  { label: 'Seviye', value: '1', icon: '⭐', color: 'var(--color-energy)' },
  { label: 'Çağ', value: 'I', icon: '🌀', color: 'var(--color-brand)' },
  { label: 'Puan', value: '0', icon: '💎', color: 'var(--color-accent)' },
  { label: 'Savaş', value: '0W/0L', icon: '⚔️', color: 'var(--color-success)' },
]

const upcomingFeatures = [
  { title: 'Filo Yönetimi', description: 'Birimlerini oluştur ve yönet', icon: '🚀', eta: 'Hafta 3' },
  { title: 'PvP Savaşları', description: 'Gerçek zamanlı rakip eşleştirme', icon: '⚔️', eta: 'Hafta 5' },
  { title: 'Sektör Kontrolü', description: 'Çok oyunculu bölge savaşları', icon: '🌌', eta: 'Çağ 4' },
  { title: 'Premium Mağaza', description: 'Kozmetik itemler ve premium pass', icon: '🛍️', eta: 'Çağ 5' },
]

export default function DashboardPage() {
  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* ─── Sidebar ─────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-64 border-r border-border"
        style={{ background: 'var(--color-bg-surface)' }}
        aria-label="Yan menü"
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>🌌</span>
            <span className="font-display text-sm font-bold tracking-widest text-gradient-brand">
              NEBULA DOMINION
            </span>
          </Link>
        </div>

        {/* Player info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: 'var(--gradient-brand)', color: '#fff' }}
              aria-hidden
            >
              K
            </div>
            <div>
              <p className="text-text-primary text-sm font-semibold">Komutan</p>
              <p className="text-text-muted text-xs">Çağ I · Seviye 1</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1" aria-label="Dashboard navigasyon">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                item.active
                  ? 'bg-brand-dim text-brand border border-brand/20'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`}
              aria-current={item.active ? 'page' : undefined}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Connection status */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full bg-status-success animate-pulse-slow"
              aria-label="Bağlantı durumu: bağlı"
            />
            <span className="text-text-muted text-xs">Sunucu bağlı</span>
          </div>
        </div>
      </aside>

      {/* ─── Main ─────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border"
          style={{ background: 'rgba(7, 11, 22, 0.8)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile logo */}
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <span aria-hidden>🌌</span>
            </Link>
            <h1 className="font-display text-lg font-bold text-text-primary">
              Komuta Merkezi
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="btn-ghost text-sm px-3 py-2"
              aria-label="Bildirimler"
            >
              🔔
            </button>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: 'var(--gradient-brand)', color: '#fff' }}
              aria-label="Profil menüsü"
            >
              K
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-6xl">
          {/* Welcome banner */}
          <section
            className="glass-card p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(168,85,247,0.06) 100%)',
            }}
            aria-labelledby="welcome-heading"
          >
            <div className="relative z-10">
              <h2 id="welcome-heading" className="font-display text-xl font-bold mb-2">
                Galaksiye Hoş Geldin, Komutan! 🚀
              </h2>
              <p className="text-text-secondary text-sm mb-4">
                Nebula Dominion kapalı beta aşamasında. Yakında savaş sistemi ve filo yönetimi açılacak.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-brand">Kapalı Beta</span>
                <span className="badge badge-accent">Hafta 1–2</span>
              </div>
            </div>
            {/* Decorative */}
            <div
              className="absolute right-4 top-1/2 -translate-y-1/2 text-6xl opacity-10 pointer-events-none hidden sm:block"
              aria-hidden
            >
              🌌
            </div>
          </section>

          {/* Player stats */}
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="font-display text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">
              Oyuncu İstatistikleri
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {playerStats.map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg" aria-hidden>{stat.icon}</span>
                    <span className="text-text-muted text-xs font-medium">{stat.label}</span>
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

          {/* Coming soon features */}
          <section aria-labelledby="features-heading">
            <h2 id="features-heading" className="font-display text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">
              Yakında Gelecek Özellikler
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingFeatures.map((feat) => (
                <div
                  key={feat.title}
                  className="glass-card p-5 flex items-start gap-4 group hover-glow"
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
                      <h3 className="font-semibold text-text-primary text-sm">{feat.title}</h3>
                      <span className="badge badge-energy shrink-0">{feat.eta}</span>
                    </div>
                    <p className="text-text-muted text-xs">{feat.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Game area placeholder */}
          <section aria-labelledby="game-heading">
            <h2 id="game-heading" className="font-display text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">
              Oyun Alanı
            </h2>
            <div
              className="glass-card flex flex-col items-center justify-center text-center p-16"
              style={{
                minHeight: '320px',
                background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.05) 0%, transparent 70%)',
                border: '1px dashed var(--color-border-hover)',
              }}
            >
              <div className="text-6xl mb-4 animate-float" aria-hidden>🚀</div>
              <h3 className="font-display text-lg font-bold mb-2">
                Phaser.js Oyun Motoru
              </h3>
              <p className="text-text-secondary text-sm max-w-sm">
                Savaş sistemi geliştirme aşamasında. Hafta 4&apos;te BattleScene burada devreye girecek.
              </p>
              <div className="flex gap-2 mt-4">
                <span className="badge badge-brand">Hafta 4</span>
                <span className="badge badge-accent">Phaser.js 3.80</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
