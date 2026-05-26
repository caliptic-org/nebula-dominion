'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import {
  Caption,
  Eyebrow,
  H2,
  ND,
  NDButton,
  Sigil,
  useNDRace,
} from '@/components/handoff';
import { translateBackendError } from '@/lib/translate-backend-error';

/**
 * Step 1 of the password-reset flow: collect an email, ask the API to
 * issue a reset token, and show a "check your inbox" confirmation.
 *
 * The API always returns 200 — we never tell the user whether the email
 * was actually on file. The flash message is intentionally the same in
 * both cases (avoids account enumeration via this form). In dev the
 * actual reset token is logged on the API stdout; in prod it would be
 * mailed.
 */
export function ForgotPasswordForm() {
  const race = useNDRace('insan');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Geçerli bir e-posta gir');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        },
      );
      if (!res.ok) {
        // The backend should always return 200; treat anything else as a
        // transient failure so the user can retry. Don't leak any hint
        // about whether the email exists.
        const data = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const raw = data.message;
        const flat = Array.isArray(raw) ? raw.join(' · ') : raw ?? 'İstek başarısız';
        throw new Error(translateBackendError(flat));
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İstek başarısız');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <Sigil race={race} size={32} glow />
          <Eyebrow color={race.primary}>NEBULA DOMINION</Eyebrow>
        </div>

        <H2
          style={{
            color: ND.text,
            marginBottom: 6,
            fontFamily: race.key === 'otomat' ? ND.mono : ND.display,
          }}
        >
          ŞİFREYİ SIFIRLA
        </H2>
        <Caption style={{ marginBottom: 24 }}>
          E-posta adresini gir — eğer kayıtlıysa sıfırlama bağlantısı gönderilir.
        </Caption>

        {submitted ? (
          <div
            role="status"
            style={{
              padding: '14px 16px',
              borderRadius: 4,
              fontFamily: ND.mono,
              fontSize: 12,
              lineHeight: 1.6,
              background: `color-mix(in oklch, ${race.primary}, transparent 86%)`,
              border: `1px solid color-mix(in oklch, ${race.primary}, transparent 62%)`,
              color: race.primary,
              clipPath:
                'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              marginBottom: 18,
            }}
          >
            Talimatlar e-postana gönderildi. Geliştirme modunda token API
            konsoluna yazıldı — komutanlık ekranlarında log&apos;u kontrol et.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-label="Şifre sıfırlama formu"
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            {error && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  borderRadius: 4,
                  fontFamily: ND.mono,
                  fontSize: 12,
                  background:
                    'color-mix(in oklch, oklch(0.65 0.22 25), transparent 84%)',
                  border:
                    '1px solid color-mix(in oklch, oklch(0.65 0.22 25), transparent 60%)',
                  color: ND.danger,
                  clipPath:
                    'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                }}
              >
                {error}
              </div>
            )}

            <div>
              <Eyebrow style={{ marginBottom: 6 }}>E-POSTA</Eyebrow>
              <label className="nd-field" htmlFor="forgot-email">
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  className="nd-input"
                  placeholder="ornek@nebula.gx"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  aria-label="E-posta"
                />
              </label>
            </div>

            <NDButton race={race} size="lg" type="submit" full disabled={isLoading}>
              {isLoading ? 'GÖNDERİLİYOR…' : 'SIFIRLAMA BAĞLANTISI GÖNDER'}
            </NDButton>
          </form>
        )}

        <div style={{ flex: 1 }} />

        <Caption style={{ textAlign: 'center', marginTop: 28 }}>
          <Link
            href="/login"
            style={{
              color: race.primary,
              fontFamily: ND.display,
              textDecoration: 'none',
              letterSpacing: '0.08em',
            }}
          >
            ← Giriş ekranına dön
          </Link>
        </Caption>
      </div>
    </div>
  );
}
