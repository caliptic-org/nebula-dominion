/**
 * Nebula Dominion — Ad attribution capture.
 *
 * The 30-second story:
 *   - A user clicks a Google Ads link to our site → URL has `?gclid=Cj0K...`
 *   - We need to capture that `gclid` so when they sign up / purchase, we
 *     can tell Google "this revenue came from THAT ad click"
 *   - Same idea for Meta Ads (`fbclid`), Bing Ads (`msclkid`), TikTok (`ttclid`)
 *   - These IDs MUST be captured on the FIRST visit and persisted, because
 *     by the time the user signs up the URL has changed
 *
 * Storage: localStorage with 90-day TTL (Google Ads default attribution window
 * is 30 days, FB 28 days, so 90 gives us headroom). UTM params live in the
 * same blob so we can also slice cohorts by campaign source.
 *
 * Privacy: all values stored client-side, only sent server-side at conversion
 * time. No PII captured — just opaque click IDs.
 */

const STORAGE_KEY = 'nebula:attribution:v1';
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export interface AttributionData {
  /** Google Ads click ID. */
  gclid?: string;
  /** Facebook/Instagram Ads click ID. */
  fbclid?: string;
  /** Microsoft (Bing) Ads click ID. */
  msclkid?: string;
  /** TikTok Ads click ID. */
  ttclid?: string;
  /** UTM source — usually a campaign-platform tag (google, facebook, instagram). */
  utm_source?: string;
  /** UTM medium — channel type (cpc, cpm, social, email). */
  utm_medium?: string;
  /** UTM campaign — the campaign name. */
  utm_campaign?: string;
  /** UTM content — ad creative variant. */
  utm_content?: string;
  /** UTM term — keyword. */
  utm_term?: string;
  /** First-touch timestamp (ms since epoch). */
  capturedAt: number;
  /** First-touch landing path. */
  landingPath: string;
  /** Referrer at capture time. */
  referrer?: string;
}

/** Just the string-valued click/UTM keys we read from the URL — explicitly
 *  excludes `capturedAt: number` and `landingPath: string` (set programmatically),
 *  so the captureAttribution assignment loop stays type-safe. */
type AttributionUrlKey =
  | 'gclid'
  | 'fbclid'
  | 'msclkid'
  | 'ttclid'
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'utm_content'
  | 'utm_term';

const ATTRIBUTION_KEYS: AttributionUrlKey[] = [
  'gclid',
  'fbclid',
  'msclkid',
  'ttclid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
];

function isExpired(data: AttributionData): boolean {
  return Date.now() - data.capturedAt > TTL_MS;
}

/**
 * Read stored attribution. Returns null if missing or expired.
 * Safe to call in SSR — returns null when window is undefined.
 */
export function getAttribution(): AttributionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AttributionData;
    if (isExpired(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Capture attribution from the current URL.
 *
 * Honors first-touch semantics: if attribution already exists and is not
 * expired, we DO NOT overwrite (the click that brought the user is more
 * valuable than the latest click during the session).
 *
 * Returns the data we ended up storing (existing OR newly captured),
 * or null when there's nothing relevant in the URL and nothing in storage.
 */
export function captureAttribution(): AttributionData | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const fresh: Partial<AttributionData> = {};
  let foundAny = false;
  for (const key of ATTRIBUTION_KEYS) {
    const v = params.get(key);
    if (v) {
      fresh[key] = v;
      foundAny = true;
    }
  }

  const existing = getAttribution();

  // First-touch wins: never overwrite a non-expired attribution.
  if (existing) return existing;

  if (!foundAny) return null;

  const data: AttributionData = {
    ...fresh,
    capturedAt: Date.now(),
    landingPath: window.location.pathname + window.location.search,
    referrer: document.referrer || undefined,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* localStorage full or unavailable — silently fail */
  }

  return data;
}

/**
 * Read the GA4 client_id from the _ga cookie. This is the ID GA4 uses to
 * stitch sessions together. We need it server-side for Measurement Protocol
 * calls so the cross-domain stitching keeps working.
 *
 * Cookie format: `_ga=GA1.1.<client-id>.<session>`
 * We return the `<client-id>` portion, which looks like `1234567890.1700000000`.
 */
export function getGaClientId(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)_ga=GA\d\.\d\.([^;]+)/);
  if (!match) return null;
  return match[1] || null;
}

/**
 * Read the GA4 session_id from the gtag-managed `_ga_<MeasurementId>` cookie.
 * Returns null when GA hasn't fully initialised or measurement id isn't set.
 */
export function getGaSessionId(measurementId?: string): string | null {
  if (typeof document === 'undefined') return null;
  const id = measurementId ?? process.env.NEXT_PUBLIC_GA_ID;
  if (!id) return null;
  // _ga_G-XXXXXXXX cookie name uses the measurement id without the G- prefix sometimes;
  // GA4 actually stores it WITH the prefix removed from the underscore form: `_ga_<id>`
  const cookieName = `_ga_${id.replace(/^G-/, '')}`;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${cookieName}=GS\\d\\.\\d\\.([^;]+)`));
  if (!match) return null;
  // Value is like `1234567890.1.0.1700000000.0.0.0` — first chunk is session id
  const first = match[1]?.split('.')[0];
  return first ?? null;
}
