import type { Metadata } from 'next'
import { MailScreen } from '@/components/mail/MailScreen'

export const metadata: Metadata = {
  title: 'Posta — Nebula Dominion',
}

export default function MailPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
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
          height: '100dvh',
        }}
      >
        <MailScreen />
      </main>
    </div>
  )
}
