/**
 * Nebula Dominion — Centralized analytics helper.
 *
 * Tek bir track() çağrısı ile birden çok hedefe (GA4, Facebook Pixel, console
 * debug) event gönderir. Yeni hedef eklemek için aşağıdaki adapter array'ına
 * yeni bir fonksiyon ekle.
 *
 * Wire-up:
 *   - GA4 script root layout'ta yüklenir (apps/web/src/components/analytics/GAScript.tsx)
 *   - FB Pixel script aynı yerde (apps/web/src/components/analytics/FBPixel.tsx)
 *   - Sentry @sentry/nextjs paketi sentry.client.config.ts üzerinden init olur
 *
 * SSR güvenliği: tüm adapter'lar `typeof window === 'undefined'` kontrolü
 * yapar, böylece Server Components'te import edilse bile patlamaz.
 *
 * Event naming convention:
 *   - snake_case (GA4 önerisi)
 *   - prefix yok (race_select, NOT nd_race_select)
 *   - param key'leri de snake_case
 */

/* ── Public types ──────────────────────────────────────────────────────── */

export type AnalyticsEventName =
  // Onboarding funnel
  | 'sign_up'
  | 'login'
  | 'race_select'
  | 'race_confirm'
  | 'tutorial_step'
  | 'tutorial_complete'
  // Core gameplay
  | 'first_building'
  | 'building_complete'
  | 'unit_produced'
  | 'level_up'
  | 'age_advance'
  // Combat funnel
  | 'battle_start'
  | 'battle_complete'
  | 'target_view'
  // Story
  | 'story_chapter_view'
  | 'story_choice'
  // Monetization
  | 'iap_view'
  | 'purchase'
  | 'purchase_failed'
  // Engagement
  | 'screen_view'
  | 'cta_click'
  // Catch-all so we don't have to extend this type for every new event
  | (string & {});

export interface AnalyticsParams {
  // Standard recommended GA4 params
  value?: number;
  currency?: string;
  // Game-specific
  race?: string;
  level?: number;
  age?: number;
  building_slug?: string;
  unit_slug?: string;
  target_id?: string;
  outcome?: 'victory' | 'defeat' | 'retreat';
  step?: number | string;
  // Free-form
  [key: string]: unknown;
}

/* ── Global gtag / fbq typings (browser globals injected by script tags) ── */

declare global {
  interface Window {
    gtag?: (command: 'config' | 'event' | 'set' | 'js', target: string | Date, params?: Record<string, unknown>) => void;
    dataLayer?: unknown[];
    fbq?: (command: 'init' | 'track' | 'trackCustom', name: string, params?: Record<string, unknown>) => void;
  }
}

/* ── Adapter helpers ───────────────────────────────────────────────────── */

function gaTrack(event: AnalyticsEventName, params?: AnalyticsParams): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', event, params ?? {});
}

/**
 * FB Pixel standard events vs custom events:
 * - "Purchase", "CompleteRegistration", "Lead", "ViewContent" → standard (track)
 * - Game-specific (race_select, level_up) → custom (trackCustom)
 */
const FB_STANDARD_EVENTS: Record<string, string> = {
  sign_up: 'CompleteRegistration',
  purchase: 'Purchase',
  iap_view: 'ViewContent',
};

function fbTrack(event: AnalyticsEventName, params?: AnalyticsParams): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  const standard = FB_STANDARD_EVENTS[event];
  if (standard) {
    window.fbq('track', standard, params as Record<string, unknown> | undefined);
  } else {
    window.fbq('trackCustom', event, params as Record<string, unknown> | undefined);
  }
}

function debugTrack(event: AnalyticsEventName, params?: AnalyticsParams): void {
  if (typeof window === 'undefined') return;
  if (!isDebug()) return;
  // eslint-disable-next-line no-console
  console.debug('[analytics]', event, params ?? {});
}

function isDebug(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.localStorage.getItem('nebula:analytics:debug') === '1' ||
      process.env.NODE_ENV !== 'production'
    );
  } catch {
    return process.env.NODE_ENV !== 'production';
  }
}

/* ── Public API ────────────────────────────────────────────────────────── */

/**
 * Emit a single analytics event to all configured destinations.
 *
 * Attribution: if the user landed via a Google/Meta/Bing ad click, the click
 * IDs are auto-stamped onto every event so the ad network can attribute the
 * conversion back to the originating impression. Captured once on first
 * page-load by <PageViewTracker /> via captureAttribution().
 *
 * @example
 *   track('race_select', { race: 'insan' });
 *   track('purchase', { value: 9.99, currency: 'USD', item_id: 'gem_pack_small' });
 */
export function track(event: AnalyticsEventName, params?: AnalyticsParams): void {
  const enriched = enrichWithAttribution(params);
  debugTrack(event, enriched);
  gaTrack(event, enriched);
  fbTrack(event, enriched);
}

/** Merge the persisted attribution blob into event params. Lazy-imported so
 *  this module stays useful in environments without localStorage. */
function enrichWithAttribution(params?: AnalyticsParams): AnalyticsParams {
  if (typeof window === 'undefined') return params ?? {};
  try {
    // Inlined to avoid a hard module dep at SSR time. attribution.ts is
    // SSR-safe but the cyclical import warning is annoying.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAttribution } = require('./attribution') as typeof import('./attribution');
    const attr = getAttribution();
    if (!attr) return params ?? {};
    // Only forward the click-id columns — UTMs already get sent by gtag
    // automatically via the `_ga` cookie & gtag's own URL parser.
    const out: AnalyticsParams = { ...(params ?? {}) };
    if (attr.gclid) out.gclid = attr.gclid;
    if (attr.fbclid) out.fbclid = attr.fbclid;
    if (attr.msclkid) out.msclkid = attr.msclkid;
    if (attr.ttclid) out.ttclid = attr.ttclid;
    return out;
  } catch {
    return params ?? {};
  }
}

/**
 * Track a page view explicitly. Next.js App Router doesn't fire SPA navigation
 * events to gtag by default — call this from a top-level client component that
 * listens to `usePathname()`.
 */
export function trackPageView(path: string, title?: string): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title ?? document.title,
    });
  }
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'PageView');
  }
  debugTrack('page_view', { page_path: path });
}

/**
 * Associate the current session with a user id (post-login). GA4 calls this
 * "user_id", FB Pixel uses Advanced Matching via init params (handled at boot).
 * Sentry sets `setUser` separately in its config file.
 */
export function identify(userId: string, traits?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag === 'function') {
    const gaId = process.env.NEXT_PUBLIC_GA_ID;
    if (gaId) {
      window.gtag('config', gaId, { user_id: userId, ...traits });
    }
  }
  debugTrack('identify', { userId, ...traits });
}

/* ── Server-side conversion forward ────────────────────────────────────────
 *
 * Some events are too valuable to lose to ad-blockers / iOS ATT / Safari ITP:
 *   - sign_up   → drives Google Ads "Sign-up" conversion
 *   - purchase  → drives ROAS metric
 *   - level_up  → drives engagement audience
 *
 * For those, we ALSO POST to /api/v1/conversions/track which fires the
 * GA4 Measurement Protocol from the server. Browser failures + server hit
 * = at-least-once delivery instead of best-effort. */

const API_BASE_FOR_CONVERSION =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '') + '/api/v1';

interface ServerConversionPayload {
  eventName: string;
  value?: number;
  currency?: string;
  race?: string;
  level?: number;
  userId?: string;
}

async function fireServerConversion(payload: ServerConversionPayload): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    // Lazy attribution import — pulls gclid/fbclid from localStorage and the
    // GA4 client_id from the _ga cookie so the server can stitch correctly.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAttribution, getGaClientId } = require('./attribution') as typeof import('./attribution');
    const attr = getAttribution();
    const clientId = getGaClientId();

    const body: Record<string, unknown> = { ...payload };
    if (clientId) body.clientId = clientId;
    if (attr?.gclid) body.gclid = attr.gclid;
    if (attr?.fbclid) body.fbclid = attr.fbclid;
    if (attr?.msclkid) body.msclkid = attr.msclkid;
    if (attr?.ttclid) body.ttclid = attr.ttclid;

    // Use keepalive + sendBeacon when possible so the request survives a
    // navigation away (e.g. signup → redirect to /race-select). Fetch with
    // keepalive is the standard equivalent that also lets us POST JSON.
    await fetch(`${API_BASE_FOR_CONVERSION}/conversions/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    /* swallow — backend already logs and ack'd. */
  }
}

/* ── Convenience wrappers for the most common funnels ──────────────────── */

export const Analytics = {
  signUp: (race?: string) => {
    track('sign_up', { race });
    // Server-side dual-fire — signup is the top of every funnel.
    void fireServerConversion({ eventName: 'sign_up', race });
  },
  login: (method: 'password' | 'guest' = 'password') => track('login', { method }),
  raceSelect: (race: string) => track('race_select', { race }),
  raceConfirm: (race: string) => {
    track('race_confirm', { race });
    void fireServerConversion({ eventName: 'race_confirm', race });
  },
  tutorialStep: (step: number) => track('tutorial_step', { step }),
  tutorialComplete: () => {
    track('tutorial_complete');
    void fireServerConversion({ eventName: 'tutorial_complete' });
  },
  buildingComplete: (slug: string, race: string) =>
    track('building_complete', { building_slug: slug, race }),
  levelUp: (level: number, race: string) => {
    track('level_up', { level, race });
    void fireServerConversion({ eventName: 'level_up', level, race });
  },
  ageAdvance: (age: number, race: string) => track('age_advance', { age, race }),
  battleStart: (targetId: string, race: string) =>
    track('battle_start', { target_id: targetId, race }),
  battleComplete: (outcome: 'victory' | 'defeat' | 'retreat', targetId: string) =>
    track('battle_complete', { outcome, target_id: targetId }),
  storyChapterView: (chapter: number, race: string) =>
    track('story_chapter_view', { step: chapter, race }),
  purchase: (itemId: string, value: number, currency = 'USD') => {
    track('purchase', { item_id: itemId, value, currency });
    // Most valuable conversion — always dual-fire for ROAS attribution.
    void fireServerConversion({ eventName: 'purchase', value, currency });
  },
};
