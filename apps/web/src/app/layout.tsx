import type { Metadata, Viewport } from 'next';
import { RaceThemeProvider } from '@/hooks/useRaceTheme';
import '@/styles/globals.css';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const rajdhani = Rajdhani({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

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
