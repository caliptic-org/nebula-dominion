import type { Metadata } from 'next'
import { MailScreen } from '@/components/mail/MailScreen'

export const metadata: Metadata = {
  title: 'Posta — Nebula Dominion',
}

export default function MailPage() {
  return (
    <div
      style={{
        height: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg)',
      }}
    >
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 900,
          width: '100%',
          margin: '0 auto',
          minHeight: 0,
        }}
      >
        <MailScreen />
      </main>
    </div>
  )
}
