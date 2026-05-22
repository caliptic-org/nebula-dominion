import type { Metadata, Viewport } from 'next';
import { Orbitron, Rajdhani, Chakra_Petch, Inter, JetBrains_Mono } from 'next/font/google';
import { RaceThemeProvider } from '@/hooks/useRaceTheme';
import { GuildTutorialProvider } from '@/hooks/useGuildTutorial';
import { NDTweaksProvider } from '@/hooks/useNDTweaks';
import '@/styles/globals.css';
import '@/styles/nd-handoff.css';
import '@/styles/nd-globals.css';

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

const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  variable: '--font-nd-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-nd-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-nd-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Nebula Dominion',
    default: 'Nebula Dominion',
  },
  description: 'Karanlık Sci-Fi Manga Strateji Oyunu — 5 Irk, 3D Tilemap, Epik Savaşlar',
};

export const viewport: Viewport = {
  themeColor: 'var(--color-bg-base)',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" data-race="insan" className={`${orbitron.variable} ${rajdhani.variable} ${chakraPetch.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <div className="hud-scan-beam" aria-hidden="true" />
        <NDTweaksProvider>
          <RaceThemeProvider>
            <GuildTutorialProvider>
              {children}
            </GuildTutorialProvider>
          </RaceThemeProvider>
        </NDTweaksProvider>
      </body>
    </html>
  );
}
