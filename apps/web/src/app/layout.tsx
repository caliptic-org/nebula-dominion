import type { Metadata, Viewport } from 'next';
import { RaceThemeProvider } from '@/hooks/useRaceTheme';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | Nebula Dominion',
    default: 'Nebula Dominion',
  },
  description: 'Karanlık Sci-Fi Manga Strateji Oyunu — 5 Irk, 3D Tilemap, Epik Savaşlar',
};

export const viewport: Viewport = {
  themeColor: '#080a10',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" data-race="insan">
      <body>
        <RaceThemeProvider>
          {children}
        </RaceThemeProvider>
      </body>
    </html>
  );
}
