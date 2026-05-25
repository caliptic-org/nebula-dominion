'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Caption,
  Code,
  Eyebrow,
  H2,
  ND,
  NDButton,
  type NDRace,
  type NDRaceKey,
  Sigil,
  useNDRace,
} from '@/components/handoff';
import { setTokens } from '@/lib/session';
import { raceApi, syncRaceCommitmentFromBackend } from '@/lib/race-api';
import { Analytics } from '@/lib/analytics';
import { toast } from '@/components/handoff/Toaster';

const RACE_COMMITMENT_KEY = 'nebula:race-commitment:v1';

function hasRaceCommitment(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(RACE_COMMITMENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { race?: string; committedAt?: number };
    return Boolean(parsed?.race && typeof parsed.committedAt === 'number');
  } catch {
    return false;
  }
}

/* After login, ask the backend whether this account already picked a race
 * (could have happened on a different device). If yes, write it to
 * localStorage so the UI picks up the right theme immediately and we can skip
 * the race-select screen. Best-effort: any failure just falls through to the
 * existing localStorage check. */
async function resolvePostLoginRoute(): Promise<string> {
  try {
    const profile = await raceApi.getProfile();
    if (profile.raceKey) {
      syncRaceCommitmentFromBackend(profile.raceKey);
      return '/';
    }
    return '/race-select';
  } catch {
    return hasRaceCommitment() ? '/' : '/race-select';
  }
}

const LOGIN_COPY: Record<NDRaceKey, {
  title: string;
  sub: string;
  id: string;
  pw: string;
  recover: string;
  cta: string;
  guest: string;
  newAccount: string;
  join: string;
}> = {
  insan:   { title: 'KOMUTAYA DÖN',     sub: 'Önceki imparatorluğunun bekleyen mesajları var.', id: 'KOMUTAN KİMLİĞİ', pw: 'ŞİFRE',             recover: 'Şifre kaybı?',    cta: 'GİRİŞ YAP',       guest: 'QUICK START · MİSAFİR',    newAccount: 'Hesabın yok mu?',         join: 'Sürüye katıl' },
  zerg:    { title: 'KOVANA GERİ DÖN',  sub: 'Kovanın seni hatırlıyor. Damarlar canlı.',         id: 'KOVAN UZANTI',    pw: 'FEROMON ANAHTARI',  recover: 'Feromon kaybı?',  cta: 'KOVANA BAĞLAN',  guest: 'HIZLI BAŞLA · YABANCI',    newAccount: 'Kovan üyesi değil misin?', join: 'Kovana doğ'  },
  otomat:  { title: '::resume_session', sub: '::cache exists · resume from last build',          id: '::process_id',    pw: '::auth_token',      recover: '::reset_token',   cta: '::login()',       guest: '::guest_session',           newAccount: '::new_process?',            join: '::spawn'      },
  canavar: { title: 'SÜRÜYE DÖN',       sub: 'Sürü uyumakta. Geri dön, ulu.',                    id: 'AVCI ADI',        pw: 'KAN MÜHRÜ',         recover: 'Mühür kayıp?',    cta: 'SÜRÜYE GİR',      guest: 'AVDA YABANCI · MİSAFİR',   newAccount: 'Sürüsüz mü kaldın?',        join: 'Ulumayı dene' },
  seytan:  { title: 'PAKTI HATIRLA',    sub: 'Mühür hâlâ kanında. Geri dön.',                    id: 'PAKT SAHİBİ',     pw: 'GİZLİ HECE',        recover: 'Hece unutuldu?',  cta: 'PAKTI YENİLE',    guest: 'GÖLGE GİRİŞ · MİSAFİR',    newAccount: 'Henüz pakt yok mu?',         join: 'Pakt yaz'     },
};

function CornerHUD({ race }: { race: NDRace }) {
  const c = race.primary;
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    top: 24,
    fontFamily: ND.mono,
    fontSize: 9,
    letterSpacing: '0.20em',
    color: c,
    opacity: 0.7,
    textTransform: 'uppercase',
  };
  switch (race.key) {
    case 'insan':
      return (
        <>
          <div style={{ ...baseStyle, left: 18 }}>SECTOR<br />ORIGO-0</div>
          <div style={{ ...baseStyle, right: 18, textAlign: 'right' }}>SIGNAL<br /><span className="nd-blink">/// STABLE</span></div>
        </>
      );
    case 'zerg':
      return (
        <>
          <div style={{ ...baseStyle, left: 18 }}>KOVAN<br />BROOD-1</div>
          <div style={{ ...baseStyle, right: 18, textAlign: 'right' }}>VİTAL<br /><span className="nd-pulse">~~ %92</span></div>
        </>
      );
    case 'otomat':
      return (
        <>
          <div style={{ ...baseStyle, left: 18, letterSpacing: '0.16em' }}>::node<br />NODE-04</div>
          <div style={{ ...baseStyle, right: 18, textAlign: 'right', letterSpacing: '0.16em' }}>::heartbeat<br /><span className="nd-tick">OK · OK</span></div>
        </>
      );
    case 'canavar':
      return (
        <>
          <div style={{ ...baseStyle, left: 18, fontFamily: ND.display }}>AVLAK<br />HOWL-1</div>
          <div style={{ ...baseStyle, right: 18, textAlign: 'right', fontFamily: ND.display }}>AY<br />DOLUNAY</div>
        </>
      );
    case 'seytan':
      return (
        <>
          <div style={{ ...baseStyle, left: 18, letterSpacing: '0.30em', fontFamily: ND.display }}>· MAHKEME ·<br />TEMPLE-2</div>
          <div style={{ ...baseStyle, right: 18, textAlign: 'right', letterSpacing: '0.30em', fontFamily: ND.display }}>· MÜHÜR ·<br /><span className="nd-sigil">⊕ III</span></div>
        </>
      );
  }
}

export function LoginForm() {
  const t = useTranslations('auth.login');
  const race = useNDRace('insan');
  const copy = LOGIN_COPY[race.key];
  const router = useRouter();
  const search = useSearchParams();
  // ?reason=expired comes from the 401 auto-redirect in lib/api.ts.  Show a
  // friendly banner so the user understands why they were bounced here
  // instead of suspecting a bug. ?next=<path> is preserved across login.
  const reason = search?.get('reason');
  const next = search?.get('next');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [values, setValues] = useState({ identifier: '', password: '' });
  // "Beni hatırla" — when off, tokens persist only in sessionStorage so a
  // browser restart logs the user out. Default ON because the test
  // accounts get rolled over often during dev.
  const [remember, setRemember] = useState(true);

  // Surface the expired-session reason as a non-error info banner once on
  // mount. Using state (not the error slot) so a subsequent failed login
  // attempt can still surface its own error without losing context.
  const [sessionInfo, setSessionInfo] = useState<string | null>(null);
  useEffect(() => {
    if (reason === 'expired') {
      setSessionInfo('Oturumun süresi doldu — lütfen tekrar giriş yap.');
    }
  }, [reason]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? t('errorGeneric'));
      }
      const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      Analytics.login('password');
      // Honor ?next=<path> from the 401 auto-redirect — restores the
      // player to where they were before the session expired. Guard against
      // open-redirect by only accepting same-origin paths (must start with
      // a single slash and not "//" which would be protocol-relative).
      if (next && /^\/[^/]/.test(next)) {
        router.push(next);
      } else {
        const dest = await resolvePostLoginRoute();
        router.push(dest);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        background: ND.bgDeep,
        color: ND.text,
        fontFamily: ND.body,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Background: subtle race-tinted gradient over deep bg */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${race.glow} 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 50% 110%, ${race.primaryDim} 0%, transparent 60%)`,
          opacity: 0.45,
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(3,5,11,0.65) 0%, rgba(3,5,11,0.30) 40%, rgba(3,5,11,0.92) 100%)',
          pointerEvents: 'none',
        }}
      />

      <CornerHUD race={race} />

      <div
        className="nd-slide-up"
        style={{
          position: 'relative',
          maxWidth: 420,
          margin: '0 auto',
          padding: '72px 24px 32px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <Sigil race={race} size={32} glow />
          <Eyebrow color={race.primary}>NEBULA DOMINION</Eyebrow>
        </div>

        <H2 style={{ color: ND.text, marginBottom: 6, fontFamily: race.key === 'otomat' ? ND.mono : ND.display }}>{copy.title}</H2>
        <Caption style={{ marginBottom: 24 }}>{copy.sub}</Caption>

        <form onSubmit={handleSubmit} noValidate aria-label="Giriş formu" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sessionInfo && !error && (
            <div
              role="status"
              style={{
                padding: '10px 14px',
                borderRadius: 4,
                fontFamily: ND.mono,
                fontSize: 12,
                background: `color-mix(in oklch, ${race.primary}, transparent 86%)`,
                border: `1px solid color-mix(in oklch, ${race.primary}, transparent 62%)`,
                color: race.primary,
                clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              }}
            >
              {sessionInfo}
            </div>
          )}
          {error && (
            <div
              role="alert"
              style={{
                padding: '10px 14px',
                borderRadius: 4,
                fontFamily: ND.mono,
                fontSize: 12,
                background: 'color-mix(in oklch, oklch(0.65 0.22 25), transparent 84%)',
                border: '1px solid color-mix(in oklch, oklch(0.65 0.22 25), transparent 60%)',
                color: ND.danger,
                clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <Eyebrow style={{ marginBottom: 6 }}>{copy.id}</Eyebrow>
            <label className="nd-field" htmlFor="identifier">
              <input
                id="identifier"
                name="identifier"
                type="text"
                className="nd-input"
                placeholder={race.handle}
                autoComplete="username"
                required
                value={values.identifier}
                onChange={(e) => setValues((v) => ({ ...v, identifier: e.target.value }))}
                disabled={isLoading}
                aria-label={copy.id}
              />
            </label>
          </div>

          <div>
            <Eyebrow style={{ marginBottom: 6 }}>{copy.pw}</Eyebrow>
            <label className="nd-field" htmlFor="password">
              <input
                id="password"
                name="password"
                type={showPw ? 'text' : 'password'}
                className="nd-input"
                placeholder="••••••••••"
                autoComplete="current-password"
                required
                minLength={6}
                value={values.password}
                onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
                disabled={isLoading}
                aria-label={copy.pw}
                style={{ letterSpacing: showPw ? '0.04em' : '0.3em' }}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-pressed={showPw}
                aria-label={showPw ? 'Şifreyi gizle' : 'Şifreyi göster'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: ND.mono,
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: race.primary,
                }}
              >
                {showPw ? 'GİZLE' : 'GÖSTER'}
              </button>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, marginBottom: 8 }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                color: ND.textDim,
                fontFamily: ND.mono,
                fontSize: 11,
                letterSpacing: '0.04em',
              }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ accentColor: race.primary }}
                aria-label="Beni hatırla"
              />
              Beni hatırla
            </label>
            <button
              type="button"
              onClick={() =>
                toast.info(t('forgotPasswordHint'))
              }
              style={{
                all: 'unset',
                cursor: 'pointer',
                color: race.primary,
                fontFamily: ND.mono,
                fontSize: 11,
                letterSpacing: '0.04em',
              }}
            >
              {copy.recover}
            </button>
          </div>

          <NDButton race={race} size="lg" type="submit" full disabled={isLoading}>
            {isLoading ? 'BAĞLANIYOR…' : copy.cta}
          </NDButton>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 8px' }} aria-hidden>
            <div style={{ flex: 1, height: 1, background: ND.border }} />
            <Code>YA DA</Code>
            <div style={{ flex: 1, height: 1, background: ND.border }} />
          </div>

          {/* "Misafir" / quick-start used to route to /race-select directly,
            * but downstream screens (race-commit, /base resource APIs) all
            * require a JWT, so guests landed on /base, hit a 401, and got
            * bounced back to /login with no idea why. Now we route to
            * /register — the player creates a real account in ~30s, gets a
            * token, and the rest of the flow (race-select → confirm → base)
            * works end-to-end. The race-flavored label keeps the same
            * "fresh start" feel without lying about what happens next. */}
          <NDButton
            race={race}
            variant="ghost"
            size="md"
            full
            onClick={() => router.push('/register')}
          >
            {copy.guest}
          </NDButton>
        </form>

        <div style={{ flex: 1 }} />

        <Caption style={{ textAlign: 'center', marginTop: 28 }}>
          {copy.newAccount}{' '}
          <Link
            href="/register"
            style={{ color: race.primary, fontFamily: ND.display, textDecoration: 'none', letterSpacing: '0.08em' }}
          >
            {copy.join} →
          </Link>
        </Caption>

        <div
          style={{
            marginTop: 14,
            textAlign: 'center',
            fontFamily: ND.mono,
            fontSize: 9,
            color: ND.textMute,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          v0.1 · MVP · {race.short}-CHANNEL
        </div>
      </div>
    </div>
  );
}
