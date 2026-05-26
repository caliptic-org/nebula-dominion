'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
 * Step 2 of the password-reset flow. Pulls the one-shot token out of the
 * URL query (`/reset-password?token=<hex>`), collects a new password +
 * confirmation, and POSTs to the backend. On success we redirect to
 * /login with a success flag so the player gets a clear "log in with
 * your new password" prompt.
 *
 * The form intentionally won't reveal whether the token is valid until
 * submit — the backend treats invalid / expired / consumed all as the
 * same 400 with a generic message, so we don't probe up-front.
 */
export function ResetPasswordForm() {
  const race = useNDRace('insan');
  const router = useRouter();
  const search = useSearchParams();
  const token = search?.get('token') ?? '';

  const [values, setValues] = useState({ password: '', confirm: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const hasToken = token.length > 0;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (values.password.length < 8) {
      setError('Şifre en az 8 karakter olmalı');
      return;
    }
    if (values.password !== values.confirm) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword: values.password }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const raw = data.message;
        const flat = Array.isArray(raw)
          ? raw.join(' · ')
          : raw ?? 'Bağlantı geçersiz veya süresi dolmuş';
        // 400 here means token invalid / expired / already used. The
        // generic copy preserves the backend's lack of detail.
        if (res.status === 400) {
          throw new Error('Bağlantı geçersiz veya süresi dolmuş — yeniden istek gönder');
        }
        throw new Error(translateBackendError(flat));
      }
      setDone(true);
      // Short pause so the success state can be read, then redirect.
      setTimeout(() => router.push('/login'), 1400);
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
          YENİ ŞİFRE
        </H2>
        <Caption style={{ marginBottom: 24 }}>
          Yeni şifreni belirle ve hesabını geri al.
        </Caption>

        {!hasToken ? (
          <div
            role="alert"
            style={{
              padding: '14px 16px',
              borderRadius: 4,
              fontFamily: ND.mono,
              fontSize: 12,
              lineHeight: 1.6,
              background:
                'color-mix(in oklch, oklch(0.65 0.22 25), transparent 84%)',
              border:
                '1px solid color-mix(in oklch, oklch(0.65 0.22 25), transparent 60%)',
              color: ND.danger,
              clipPath:
                'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              marginBottom: 18,
            }}
          >
            Sıfırlama tokenı eksik. Lütfen sıfırlama bağlantısını e-postandan
            tekrar aç.
          </div>
        ) : done ? (
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
            Şifre güncellendi — giriş ekranına yönlendiriliyorsun.
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
              <Eyebrow style={{ marginBottom: 6 }}>YENİ ŞİFRE</Eyebrow>
              <label className="nd-field" htmlFor="new-password">
                <input
                  id="new-password"
                  name="password"
                  type="password"
                  className="nd-input"
                  placeholder="En az 8 karakter"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={values.password}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, password: e.target.value }))
                  }
                  disabled={isLoading}
                  aria-label="Yeni şifre"
                />
              </label>
            </div>

            <div>
              <Eyebrow style={{ marginBottom: 6 }}>ŞİFRE TEKRAR</Eyebrow>
              <label className="nd-field" htmlFor="confirm-password">
                <input
                  id="confirm-password"
                  name="confirm"
                  type="password"
                  className="nd-input"
                  placeholder="Şifreyi tekrar gir"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={values.confirm}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, confirm: e.target.value }))
                  }
                  disabled={isLoading}
                  aria-label="Şifre tekrar"
                />
              </label>
            </div>

            <NDButton race={race} size="lg" type="submit" full disabled={isLoading}>
              {isLoading ? 'GÜNCELLENİYOR…' : 'ŞİFREYİ YENİLE'}
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
