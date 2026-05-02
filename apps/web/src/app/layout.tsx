import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Nebula Dominion',
    template: '%s | Nebula Dominion',
  },
  description:
    'Çok oyunculu uzay strateji oyunu. 5 ırk, 54 seviye, gerçek zamanlı PvP savaşları.',
  keywords: ['nebula dominion', 'uzay oyunu', 'strateji', 'multiplayer', 'pvp'],
  authors: [{ name: 'Nebula Dominion Team' }],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'Nebula Dominion',
    title: 'Nebula Dominion',
    description: 'Çok oyunculu uzay strateji oyunu',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#070b16',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --font-display: 'Orbitron';
            --font-body: 'Inter';
            --font-mono: 'JetBrains Mono';
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
