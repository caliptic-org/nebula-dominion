'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { GlowButton } from '@/components/ui/GlowButton';
import { setTokens } from '@/lib/session';

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

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState({ identifier: '', password: '' });

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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Giriş başarısız. Tekrar dene.');
      }

      const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });

      router.push(hasRaceCommitment() ? '/' : '/race-select');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Giriş formu" className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            background: 'rgba(232,64,48,0.12)',
            border: '1px solid rgba(232,64,48,0.35)',
            color: 'var(--color-danger)',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div>
        <label htmlFor="identifier" className="form-label">Komutan Adı veya E-posta</label>
        <input
          id="identifier"
          type="text"
          name="identifier"
          className="form-input"
          placeholder="komutan_nova veya komutan@nebula.com"
          autoComplete="username"
          required
          value={values.identifier}
          onChange={(e) => setValues((v) => ({ ...v, identifier: e.target.value }))}
          disabled={isLoading}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="form-label mb-0">Şifre</label>
          <a href="#" className="text-xs text-text-muted hover:text-brand transition-colors duration-200">
            Şifremi unuttum
          </a>
        </div>
        <input
          id="password"
          type="password"
          name="password"
          className="form-input"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          minLength={6}
          value={values.password}
          onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          disabled={isLoading}
        />
      </div>

      <GlowButton
        type="submit"
        className="w-full mt-2"
        loading={isLoading}
        icon={!isLoading ? <span>→</span> : undefined}
      >
        Galaksiye Gir
      </GlowButton>
    </form>
  );
}
