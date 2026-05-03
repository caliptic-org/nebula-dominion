'use client';

export const metadata: Metadata = {
  title: 'Komuta Merkezi — Nebula Dominion',
}

const resources = [
  { icon: '💰', label: 'Altın',   value: '124,800', color: '#e8a820' },
  { icon: '⚡', label: 'Enerji',  value: '8,420',   color: '#40c8e0' },
  { icon: '🔩', label: 'Maden',   value: '32,550',  color: '#a8c8e0' },
  { icon: '💎', label: 'Taş',     value: '240',     color: '#c880f0' },
]

const navItems = [
  { href: '/dashboard',          label: 'Üs',        icon: '🏰', active: true  },
  { href: '/dashboard/fleet',    label: 'Filo',      icon: '🚀', active: false },
  { href: '/battle',             label: 'Savaş',     icon: '⚔️', active: false },
  { href: '/dashboard/sectors',  label: 'Harita',    icon: '🌍', active: false },
  { href: '/dashboard/shop',     label: 'Mağaza',    icon: '🛒', active: false },
  { href: '/dashboard/settings', label: 'Ayarlar',   icon: '⚙️', active: false },
]

const playerStats = [
  { label: 'Güç',     value: '18,420', icon: '⚔️', color: '#e8a820' },
  { label: 'Seviye',  value: '12',     icon: '⭐', color: '#f0c840' },
  { label: 'İttifak', value: 'NOVA',   icon: '🛡️', color: '#40c8e0' },
  { label: 'Galibiyet', value: '47W',  icon: '🏆', color: '#44dd88' },
]

const buildings = [
  { title: 'Komuta Kalesi',   level: 12, icon: '🏰', progress: 82, nextUpgrade: '2s 14d', color: '#e8a820' },
  { title: 'Araştırma Üssü', level: 9,  icon: '🔬', progress: 55, nextUpgrade: '4s 6d',  color: '#40c8e0' },
  { title: 'Eğitim Alanı',   level: 11, icon: '⚔️', progress: 70, nextUpgrade: '1s 22d', color: '#e84030' },
  { title: 'Kaynak Fabrikası', level: 8, icon: '🔩', progress: 40, nextUpgrade: '6s 0d',  color: '#a8c8e0' },
]

const upcomingFeatures = [
  { title: 'Filo Yönetimi',  description: 'Birimlerini oluştur ve yönet',         icon: '🚀', eta: 'Hafta 3', color: '#e8a820' },
  { title: 'PvP Savaşları',  description: 'Gerçek zamanlı rakip eşleştirme',      icon: '⚔️', eta: 'Hafta 5', color: '#e84030' },
  { title: 'Sektör Kontrolü', description: 'Çok oyunculu bölge savaşları',        icon: '🌌', eta: 'Çağ 4',   color: '#40c8e0' },
  { title: 'Premium Mağaza', description: 'Kozmetik itemler ve premium pass',     icon: '💎', eta: 'Çağ 5',   color: '#c880f0' },
]

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
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-56 shrink-0"
        style={{
          background: 'linear-gradient(180deg, #0c0f1a 0%, #08090f 100%)',
          borderRight: '1px solid rgba(232,168,32,0.15)',
        }}
        aria-label="Yan menü"
      >
        {/* Logo */}
        <div
          style={{
            padding: '20px 16px 16px',
            borderBottom: '1px solid rgba(232,168,32,0.12)',
          }}
        >
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>🚀</span>
            <span
              className="font-display font-black text-sm tracking-widest uppercase"
              style={{
                background: 'linear-gradient(180deg, #f0c840 0%, #c88010 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              NEBULA
            </span>
          </Link>
        </div>

        {/* Player card */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(232,168,32,0.10)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
              style={{
                background: 'linear-gradient(145deg, #f0c840 0%, #c88010 100%)',
                color: '#1a0e00',
                boxShadow: '0 0 12px rgba(232,168,32,0.4)',
              }}
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
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>Komutan</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs" style={{ color: 'var(--color-brand)' }}>⭐ Lv.12</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>· NOVA</span>
              </div>
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
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={
                item.active
                  ? {
                      background: 'linear-gradient(90deg, rgba(232,168,32,0.18) 0%, transparent 100%)',
                      borderLeft: '3px solid var(--color-brand)',
                      color: 'var(--color-brand)',
                      paddingLeft: '10px',
                    }
                  : {
                      color: 'var(--color-text-muted)',
                      borderLeft: '3px solid transparent',
                      paddingLeft: '10px',
                    }
              }
              aria-current={item.active ? 'page' : undefined}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Online status */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(232,168,32,0.10)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--color-success)', boxShadow: '0 0 6px var(--color-success)' }}
            />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sunucu bağlı</span>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto flex flex-col">

        {/* ── Resource bar (Top War top-bar) ──────────────────────────── */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: 'linear-gradient(180deg, #0d0f1b 0%, #080a13 100%)',
            borderBottom: '1px solid rgba(232,168,32,0.2)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}
        >
          {/* Resources row */}
          <div
            className="flex items-center gap-2 px-4 py-2 overflow-x-auto"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            {resources.map((res) => (
              <div
                key={res.label}
                className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  minWidth: 100,
                }}
              >
                <span className="text-sm" aria-hidden>{res.icon}</span>
                <div>
                  <div className="text-xs leading-none" style={{ color: 'var(--color-text-muted)' }}>{res.label}</div>
                  <div className="text-sm font-black leading-tight" style={{ color: res.color }}>{res.value}</div>
                </div>
              </div>
            ))}

            {/* Right side: notifications + profile */}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                className="btn-ghost text-lg px-2 py-1.5"
                aria-label="Bildirimler"
                style={{ position: 'relative' }}
              >
                🔔
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full"
                  style={{ background: 'var(--color-danger)', boxShadow: '0 0 4px var(--color-danger)' }}
                  aria-hidden
                />
              </button>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm"
                style={{
                  background: 'linear-gradient(145deg, #f0c840 0%, #c88010 100%)',
                  color: '#1a0e00',
                  cursor: 'pointer',
                  boxShadow: '0 0 12px rgba(232,168,32,0.3)',
                }}
                aria-label="Profil"
              >
                K
              </div>
            </div>
          </div>

          {/* Page title row */}
          <div className="flex items-center justify-between px-5 py-2.5">
            <div className="flex items-center gap-2">
              <Link href="/" className="lg:hidden mr-1">
                <span className="text-xl" aria-hidden>🚀</span>
              </Link>
              <h1
                className="font-display font-black text-base uppercase tracking-widest"
                style={{ color: 'var(--color-brand)' }}
              >
                🏰 KOMUTA MERKEZİ
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="badge badge-accent text-xs"
                style={{ fontSize: 10 }}
              >
                KAPALI BETA
              </span>
            </div>
          </div>
        </header>

        <div className="p-5 space-y-6 max-w-5xl">

          {/* ── Player power banner ──────────────────────────────────── */}
          <section
            style={{
              background: 'linear-gradient(135deg, #1a1408 0%, #0e0d18 60%, #0a0c18 100%)',
              border: '1px solid rgba(232,168,32,0.3)',
              borderRadius: 10,
              padding: '20px 24px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(232,168,32,0.1)',
            }}
            aria-labelledby="welcome-heading"
          >
            {/* Gold top border accent */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: 'linear-gradient(90deg, #e8a820, #f0c840, #e8a820)',
              }}
              aria-hidden
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2
                id="welcome-heading"
                className="font-display font-black text-xl"
                style={{ color: 'var(--color-brand)' }}
              >
                Hoş Geldin, Komutan! 🚀
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Nebula Dominion kapalı beta aşamasında. Savaş ve filo sistemleri yakında açılacak.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link href="/battle" className="btn-battle" style={{ padding: '8px 20px', fontSize: 12 }}>
                  ⚔️ SAVAŞA GEÇ
                </Link>
                <Link href="/" className="btn-primary" style={{ padding: '8px 20px', fontSize: 12 }}>
                  🏆 DEMO
                </Link>
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                right: 20,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 80,
                opacity: 0.07,
                pointerEvents: 'none',
              }}
              aria-hidden
            >
              🏰
            </div>
          </section>

          {/* ── Player stats ────────────────────────────────────────── */}
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="section-header">Komutan İstatistikleri</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {playerStats.map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: 'linear-gradient(160deg, #12141f 0%, #0c0e17 100%)',
                    border: '1px solid rgba(232,168,32,0.18)',
                    borderRadius: 8,
                    padding: '14px 16px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base" aria-hidden>{stat.icon}</span>
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                      {stat.label}
                    </span>
                  </div>
                  <p className="font-display text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Buildings / Base structures ──────────────────────────── */}
          <section aria-labelledby="buildings-heading">
            <h2 id="buildings-heading" className="section-header">Üs Yapıları</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {buildings.map((b) => (
                <div
                  key={b.title}
                  style={{
                    background: 'linear-gradient(160deg, #12141f 0%, #0c0e17 100%)',
                    border: '1px solid rgba(232,168,32,0.18)',
                    borderRadius: 8,
                    padding: '16px 18px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 8,
                          background: `rgba(0,0,0,0.4)`,
                          border: `1px solid ${b.color}40`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          flexShrink: 0,
                        }}
                        aria-hidden
                      >
                        {b.icon}
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{b.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: b.color }}>Seviye {b.level}</p>
                      </div>
                    </div>
                    <button
                      className="shrink-0"
                      style={{
                        padding: '5px 12px',
                        background: 'var(--gradient-gold-btn)',
                        border: '1px solid #c88820',
                        borderRadius: 5,
                        fontSize: 10,
                        fontWeight: 800,
                        color: '#1a0e00',
                        cursor: 'pointer',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                      }}
                    >
                      GELİŞTİR
                    </button>
                  </div>
                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Sonraki: Lv.{b.level + 1}
                      </span>
                      <span className="text-xs font-bold" style={{ color: b.color }}>{b.progress}%</span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        background: 'rgba(255,255,255,0.07)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${b.progress}%`,
                          background: `linear-gradient(90deg, ${b.color} 0%, ${b.color}cc 100%)`,
                          borderRadius: 3,
                          transition: 'width 0.5s ease',
                          boxShadow: `0 0 6px ${b.color}80`,
                        }}
                      />
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Geliştirme: {b.nextUpgrade}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Upcoming features ────────────────────────────────────── */}
          <section aria-labelledby="features-heading">
            <h2 id="features-heading" className="section-header">Yakında Gelecek</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingFeatures.map((feat) => (
                <div
                  key={feat.title}
                  style={{
                    background: 'linear-gradient(160deg, #12141f 0%, #0c0e17 100%)',
                    border: '1px solid rgba(232,168,32,0.12)',
                    borderRadius: 8,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
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
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{feat.title}</h3>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 3,
                          background: `${feat.color}18`,
                          border: `1px solid ${feat.color}35`,
                          color: feat.color,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          flexShrink: 0,
                        }}
                      >
                        {feat.eta}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{feat.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Game area placeholder ──────────────────────────────── */}
          <section aria-labelledby="game-heading">
            <h2 id="game-heading" className="section-header">Savaş Alanı</h2>
            <div
              style={{
                background: 'linear-gradient(160deg, #0e1020 0%, #080a14 100%)',
                border: '1px dashed rgba(232,168,32,0.25)',
                borderRadius: 10,
                minHeight: 280,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: 40,
              }}
            >
              <div style={{ fontSize: 60, marginBottom: 16, opacity: 0.7 }} aria-hidden>🚀</div>
              <h3 className="font-display font-black text-lg" style={{ color: 'var(--color-brand)' }}>
                Phaser.js Savaş Motoru
              </h3>
              <p className="text-sm mt-2 max-w-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Savaş sistemi geliştirme aşamasında. Hafta 4&apos;te BattleScene burada devreye girecek.
              </p>
              <div className="flex gap-2 mt-4">
                <span className="badge badge-brand">Hafta 4</span>
                <span className="badge badge-energy">Phaser.js 3.80</span>
              </div>
              <Link href="/battle" className="btn-battle mt-5" style={{ padding: '10px 28px', fontSize: 13 }}>
                ⚔️ DEMO SAVAŞI BAŞLAT
              </Link>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
