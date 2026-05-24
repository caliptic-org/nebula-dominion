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
      }}
    >
      <MailScreen />
    </div>
  )
}
