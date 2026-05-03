'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { GlowButton } from '@/components/ui/GlowButton';

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState({ username: '', password: '' });

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

      const data = (await res.json()) as { accessToken?: string };
      if (data.accessToken) {
        try {
          window.localStorage.setItem('accessToken', data.accessToken);
        } catch {
          /* localStorage unavailable (private mode); auth-required pages will surface 401 */
        }
      }

      router.push('/race-select');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Giriş formu">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
          <label htmlFor="username" className="form-label">Komutan Adı</label>
          <input
            id="username"
            type="text"
            name="username"
            className="form-input"
            placeholder="komutan_nova"
            autoComplete="username"
            required
            value={values.username}
            onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
            disabled={isLoading}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label htmlFor="password" className="form-label" style={{ marginBottom: 0 }}>Şifre</label>
            <a
              href="#"
              style={{ fontSize: 11, color: 'var(--color-text-muted)', textDecoration: 'none' }}
            >
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

        <button
          type="submit"
          className="btn-primary w-full"
          style={{ marginTop: 4, width: '100%' }}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <span
                className="inline-block w-4 h-4 rounded-full animate-spin"
                style={{ border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#1a0e00' }}
                aria-hidden
              />
              Giriş yapılıyor…
            </>
          ) : (
            '⚔️ GİRİŞ YAP'
          )}
        </button>
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
