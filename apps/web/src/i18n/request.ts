/**
 * next-intl server-side request config (no-routing mode).
 *
 * We deliberately do NOT use next-intl's routing middleware — that would
 * require restructuring the entire `app/` tree to `app/[locale]/...`. The
 * user wants the URL to stay flat (`/base`, `/login`) and the locale to be
 * picked silently from the device's Accept-Language header.
 *
 * Detection chain on every request:
 *   1. `NEXT_LOCALE` cookie (set once the player has been served any page)
 *   2. Accept-Language header — pick the first weighted entry that maps to
 *      a supported locale (tr → tr, zh-* → zh, anything else → en)
 *   3. Default to `en`
 *
 * Messages are loaded from `../../messages/<locale>.json`. The bundle ships
 * to the client via NextIntlClientProvider in the root layout.
 */

import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './config';

const LOCALE_COOKIE = 'NEXT_LOCALE';

function pickFromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;
  // Parse "tr-TR,tr;q=0.9,en;q=0.8" → [{ tag: 'tr-TR', q: 1 }, ...]
  const entries = header
    .split(',')
    .map((raw) => {
      const [tag, ...rest] = raw.trim().split(';');
      const qPart = rest.find((p) => p.startsWith('q='));
      const q = qPart ? parseFloat(qPart.slice(2)) : 1;
      return { tag: tag.toLowerCase(), q: Number.isFinite(q) ? q : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of entries) {
    if (tag.startsWith('tr')) return 'tr';
    if (tag.startsWith('zh')) return 'zh';
    if (tag.startsWith('en')) return 'en';
  }
  return defaultLocale;
}

export default getRequestConfig(async () => {
  // Cookie wins when set (perf + sticky preference). If empty, fall back to
  // Accept-Language detection. The cookie isn't written from the UI — it's
  // a future hook in case we ever want a manual override.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  let locale: Locale = defaultLocale;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    locale = cookieLocale as Locale;
  } else {
    const headerList = await headers();
    locale = pickFromAcceptLanguage(headerList.get('accept-language'));
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: 'Europe/Istanbul',
  };
});
