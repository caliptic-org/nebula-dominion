'use client'

import { Caption, Eyebrow, H3, ND, type NDRace } from '@/components/handoff'

interface MailEmptyStateProps {
  activeFilter: string
  race: NDRace
}

const FILTER_MESSAGES: Record<string, { icon: string; title: string; sub: string }> = {
  all:           { icon: '📭', title: 'Posta Kutusu Boş',      sub: 'Sistem mesajları ve ödüller burada görünecek.' },
  unread:        { icon: '✉️', title: 'Okunmamış Posta Yok',   sub: 'Tüm postalar okundu. Harika!' },
  system:        { icon: '📦', title: 'Sistem Postası Yok',    sub: 'Ödüller ve bildirimler burada görünecek.' },
  battle_report: { icon: '⚔️', title: 'Savaş Raporu Yok',      sub: 'Savaşa katılınca raporlar burada birikir.' },
  guild:         { icon: '🛡️', title: 'Lonca Mesajı Yok',     sub: 'Lonca üyelerinden gelen mesajlar burada görünür.' },
  event:         { icon: '✨', title: 'Etkinlik Mesajı Yok',   sub: 'Etkinlik bildirimleri burada görünecek.' },
}

export function MailEmptyState({ activeFilter, race }: MailEmptyStateProps) {
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
      {/* Hex sigil-style frame */}
      <div style={{ position: 'relative', width: 96, height: 96, marginBottom: 4 }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            border: `1px solid ${race.primary}55`,
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            background: `radial-gradient(circle at center, ${race.primary}1a 0%, transparent 65%)`,
            animation: 'glow-pulse 3s ease-in-out infinite',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 10,
            border: `1px dashed ${ND.borderHi}`,
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            animation: 'spin 20s linear infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
          }}
        >
          {msg.icon}
        </div>
      </div>

      <Eyebrow color={race.primary}>İLETİŞİM AĞI</Eyebrow>
      <H3 style={{ color: ND.text, textAlign: 'center' }}>{msg.title}</H3>
      <Caption style={{ textAlign: 'center', maxWidth: 220 }}>{msg.sub}</Caption>
    </div>
  )
}
