'use client'

interface MailEmptyStateProps {
  activeFilter: string
}

const FILTER_MESSAGES: Record<string, { icon: string; title: string; sub: string }> = {
  all: { icon: '📭', title: 'Posta Kutunuz Boş', sub: 'Sistem mesajları ve ödüller burada görünecek.' },
  unread: { icon: '✉️', title: 'Okunmamış Posta Yok', sub: 'Tüm postalar okundu. Harika!' },
  system: { icon: '📦', title: 'Sistem Postası Yok', sub: 'Ödüller ve bildirimler burada görünecek.' },
  battle_report: { icon: '⚔️', title: 'Savaş Raporu Yok', sub: 'Savaşa katılınca raporlar burada birikir.' },
  guild: { icon: '🛡️', title: 'Lonca Mesajı Yok', sub: 'Lonca üyelerinden gelen mesajlar burada görünür.' },
  event: { icon: '✨', title: 'Etkinlik Mesajı Yok', sub: 'Etkinlik bildirimleri burada görünecek.' },
}

export function MailEmptyState({ activeFilter }: MailEmptyStateProps) {
  const msg = FILTER_MESSAGES[activeFilter] ?? FILTER_MESSAGES.all

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        gap: 14,
        userSelect: 'none',
      }}
      aria-live="polite"
      aria-label={msg.title}
    >
      {/* Stardust ring illustration */}
      <div style={{ position: 'relative', width: 88, height: 88, marginBottom: 4 }}>
        {/* Outer orbit ring */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '1px dashed rgba(123,140,222,0.25)',
            animation: 'spin 16s linear infinite',
          }}
        />
        {/* Inner pulse */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 12,
            borderRadius: '50%',
            background: 'radial-gradient(circle at center, rgba(123,140,222,0.12) 0%, transparent 70%)',
            animation: 'glow-pulse 3s ease-in-out infinite',
          }}
        />
        {/* Center icon */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 34,
          }}
        >
          {msg.icon}
        </div>
        {/* Particle dots */}
        {[0, 72, 144, 216, 288].map((deg, i) => (
          <div
            key={i}
            aria-hidden
            style={{
              position: 'absolute',
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'rgba(123,140,222,0.5)',
              top: `${50 - 44 * Math.sin((deg * Math.PI) / 180)}%`,
              left: `${50 + 44 * Math.cos((deg * Math.PI) / 180)}%`,
              transform: 'translate(-50%, -50%)',
              animation: `twinkle ${1.8 + i * 0.3}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <h3
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.04em',
          textAlign: 'center',
        }}
      >
        {msg.title}
      </h3>
      <p
        style={{
          fontSize: 12,
          color: 'var(--color-text-muted)',
          textAlign: 'center',
          maxWidth: 200,
          lineHeight: 1.6,
        }}
      >
        {msg.sub}
      </p>
    </div>
  )
}
