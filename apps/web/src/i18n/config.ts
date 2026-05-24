/**
 * i18n locale configuration.
 *
 * Strategy: browser language auto-detection only — no manual switcher.
 *   - Accept-Language: tr*  → Turkish
 *   - Accept-Language: zh*  → Simplified Chinese (covers zh, zh-CN, zh-TW, zh-HK)
 *   - Everything else       → English (default)
 *
 * URL stays the same regardless of locale (no /en, /tr, /zh prefix). next-intl
 * picks the locale via middleware on every request and writes it to a cookie
 * that survives the session. Switching languages requires changing the
 * browser/OS language, which matches the user's intent of "lock the locale
 * to the device".
 *
 * Lore + story narrative stays Turkish across all locales — that's the
 * project's brand identity (sci-fi manga from Turkey). UI labels and
 * system messages are localized.
 */

export const locales = ['en', 'tr', 'zh'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/** Human-readable labels — used in OG tags, Sentry env, analytics, etc. */
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
  zh: '中文',
};

/** ISO 639-1 → full BCP-47 mapping used for <html lang="...">. */
export const htmlLangMap: Record<Locale, string> = {
  en: 'en',
  tr: 'tr-TR',
  zh: 'zh-Hans', // Simplified Chinese script
};
