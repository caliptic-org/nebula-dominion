import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { RaceThemeProvider } from '@/hooks/useRaceTheme';
import { GuildTutorialProvider } from '@/hooks/useGuildTutorial';
import { NDTweaksProvider } from '@/hooks/useNDTweaks';
import { GAScript } from '@/components/analytics/GAScript';
import { FBPixel } from '@/components/analytics/FBPixel';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { Toaster } from '@/components/handoff/Toaster';
import { ProgressionToaster } from '@/components/ProgressionToaster';
import { AgeTransitionListener } from '@/components/progression/AgeTransitionListener';
import { htmlLangMap, type Locale } from '@/i18n/config';
import '@/styles/globals.css';
import '@/styles/nd-handoff.css';
import '@/styles/nd-globals.css';

/* Fonts are self-hosted via @fontsource and imported at the top of
 * globals.css — see `Fonts strategy` comment there. We used to populate the
 * `--font-*` CSS variables via next/font/google's per-font className, but
 * that pulled woff2 files from fonts.gstatic.com during `next build` and
 * blocked Docker builds for 5+ minutes when the network to Google was
 * intermittent. CSS variables are now declared directly in globals.css's
 * :root block so removing the className composition below is harmless. */

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Locale + messages are resolved by next-intl from the request (cookie set
  // by middleware based on Accept-Language). Server-rendered components get
  // useTranslations() from the message bundle below; client components get
  // it via NextIntlClientProvider.
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();

  return (
    <html lang={htmlLangMap[locale] ?? 'en'} data-race="insan">
      <body>
        {/* Analytics — both scripts no-op when their env id is missing,
            so local dev / PR previews stay silent. SPA navigation page_view
            is fired by <PageViewTracker /> (App Router doesn't auto-emit). */}
        <GAScript />
        <FBPixel />
        <PageViewTracker />
        <Toaster />
        {/* ProgressionToaster subscribes to the player's socket room for
           xp_gained + level_up events and surfaces a toast on each. Sits
           below <Toaster /> so it can use the same toast bus. Side-effect
           only — renders null. */}
        <ProgressionToaster />
        <div className="hud-scan-beam" aria-hidden="true" />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <NDTweaksProvider>
            <RaceThemeProvider>
              <GuildTutorialProvider>
                {/* AgeTransitionListener overlays the full-screen Çağ
                    cinematic when the player's age advances. Must live
                    INSIDE RaceThemeProvider because it reads useNDRace()
                    to colour the cinematic to the player's race. */}
                <AgeTransitionListener />
                {children}
              </GuildTutorialProvider>
            </RaceThemeProvider>
          </NDTweaksProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
