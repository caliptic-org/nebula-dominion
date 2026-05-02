import type { Metadata } from 'next'
import Link from 'next/link'
import { FeatureCard } from '@/components/ui/FeatureCard'
import { RaceCard } from '@/components/ui/RaceCard'

export const metadata: Metadata = {
  title: 'Nebula Dominion – Galaksiyi Fethet',
}

const features = [
  {
    icon: '⚡',
    title: 'Gerçek Zamanlı PvP',
    description: 'Socket.io destekli anlık savaşlar. ELO/MMR eşleştirme sistemiyle dengeli rakipler.',
  },
  {
    icon: '🧬',
    title: '5 Benzersiz Irk',
    description: 'İnsan, Zerg, Otomatlar, Canavarlar ve Şeytanlar. Her ırkın kendine özgü yetenekleri.',
  },
  {
    icon: '🌌',
    title: '54 Seviye İlerleme',
    description: '6 çağ × 9 seviye. Her çağda yeni birimler, teknolojiler ve savaş stratejileri.',
  },
  {
    icon: '🔀',
    title: 'Birim Birleştirme',
    description: 'Eşsiz birleştirme ve mutasyon mekaniği. Birimlerini evrimlere uğrat.',
  },
  {
    icon: '🏴',
    title: 'Sektör Savaşları',
    description: 'Çok oyunculu bölge kontrolü. İttifak kur, sektörlere hükmet.',
  },
  {
    icon: '📱',
    title: 'Çok Platform',
    description: 'Web, iOS ve Android desteği. Nerede olursan ol oyna.',
  },
]

const races = [
  { name: 'İnsan', color: '#3b82f6', symbol: '👤', tagline: 'Teknoloji & Diplomasi' },
  { name: 'Zerg', color: '#10b981', symbol: '🦠', tagline: 'Kitle & Evrim' },
  { name: 'Otomatlar', color: '#a855f7', symbol: '🤖', tagline: 'Hassasiyet & Otomasyonu' },
  { name: 'Canavarlar', color: '#f59e0b', symbol: '🐉', tagline: 'Güç & Yıkım' },
  { name: 'Şeytanlar', color: '#ef4444', symbol: '😈', tagline: 'Kaos & Kontrol' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-hero)' }}>
      {/* Nebula overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />

      {/* ─── Navigation ─────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12 lg:px-20">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>🌌</span>
          <span
            className="font-display text-lg font-bold tracking-widest text-gradient-brand hidden sm:block"
          >
            NEBULA DOMINION
          </span>
          <span className="font-display text-lg font-bold tracking-widest text-gradient-brand sm:hidden">
            ND
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm px-4 py-2">
            Giriş Yap
          </Link>
          <Link href="/register" className="btn-primary text-sm px-4 py-2">
            Ücretsiz Başla
          </Link>
        </div>
      </nav>

      {/* ─── Hero ──────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-24 md:pt-24 md:pb-32 stars-bg">
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="badge badge-brand">Kapalı Beta</span>
            <span className="badge badge-accent">50+ Oyuncu Hedefi</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-none mb-6 tracking-tight">
            <span className="block text-text-primary">GALAKSİYİ</span>
            <span className="block text-gradient-nebula">FETHEDİN</span>
          </h1>

          <p className="text-text-secondary text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Uzayın derinliklerinde 5 ırk arasındaki savaşa katıl. 54 seviyeyi aş,
            birimlerini birleştir ve galaksinin hakimi ol.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-base px-8 py-4 animate-glow-pulse">
              Hemen Oyna — Ücretsiz
            </Link>
            <Link href="/login" className="btn-ghost text-base px-8 py-4">
              Hesabım Var
            </Link>
          </div>

          <p className="mt-6 text-text-muted text-sm">
            Kredi kartı gerekmez · 30 saniyede başla
          </p>
        </div>

        {/* Decorative planet */}
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 w-48 h-48 md:w-72 md:h-72 rounded-full pointer-events-none opacity-20 hidden lg:block"
          style={{
            background: 'radial-gradient(circle at 35% 35%, #a855f7 0%, #3b82f6 40%, #070b16 100%)',
            boxShadow: '0 0 80px rgba(168, 85, 247, 0.3)',
          }}
          aria-hidden
        />
      </section>

      {/* ─── Races ─────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-16 md:px-12 lg:px-20" aria-labelledby="races-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 id="races-heading" className="font-display text-2xl sm:text-3xl font-bold mb-3">
              Irk Seç
            </h2>
            <p className="text-text-secondary">Her ırkın kendine özgü oynanış tarzı</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {races.map((race) => (
              <RaceCard key={race.name} race={race} />
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider mx-6 md:mx-12 lg:mx-20" />

      {/* ─── Features ───────────────────────────────────── */}
      <section className="relative z-10 px-6 py-16 md:px-12 lg:px-20" aria-labelledby="features-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 id="features-heading" className="font-display text-2xl sm:text-3xl font-bold mb-3">
              Özellikler
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Tam özellikli uzay strateji deneyimi
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider mx-6 md:mx-12 lg:mx-20" />

      {/* ─── Stats ──────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-16 md:px-12 lg:px-20" aria-labelledby="stats-heading">
        <div className="max-w-4xl mx-auto">
          <h2 id="stats-heading" className="sr-only">Platform İstatistikleri</h2>
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Eşzamanlı Oyuncu', value: '100K+' },
              { label: 'Uptime Hedefi', value: '%99.9' },
              { label: 'Irk', value: '5' },
              { label: 'Seviye', value: '54' },
            ].map((stat) => (
              <div key={stat.label} className="stat-card text-center">
                <dd className="font-display text-3xl font-black text-gradient-brand mb-1">
                  {stat.value}
                </dd>
                <dt className="text-text-secondary text-sm">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-20 md:px-12 lg:px-20">
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="glass-card p-10 md:p-14"
            style={{ background: 'linear-gradient(145deg, rgba(59,130,246,0.08) 0%, rgba(168,85,247,0.04) 100%)' }}
          >
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
              Galaksiye Katıl
            </h2>
            <p className="text-text-secondary mb-8">
              Ücretsiz hesap oluştur, kapalı betaya kaydol ve ilk savaşına çık.
            </p>
            <Link href="/register" className="btn-primary text-base px-10 py-4">
              Ücretsiz Kayıt Ol
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────── */}
      <footer className="relative z-10 px-6 py-8 md:px-12 lg:px-20 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span aria-hidden>🌌</span>
            <span className="font-display text-sm font-bold tracking-widest text-text-muted">
              NEBULA DOMINION
            </span>
          </div>
          <p className="text-text-muted text-sm">
            © {new Date().getFullYear()} Nebula Dominion. MIT Lisansı.
          </p>
          <div className="flex gap-4">
            <Link href="/login" className="text-text-muted hover:text-text-secondary text-sm transition-colors">
              Giriş
            </Link>
            <Link href="/register" className="text-text-muted hover:text-text-secondary text-sm transition-colors">
              Kayıt
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
