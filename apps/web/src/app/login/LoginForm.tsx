'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { GlowButton } from '@/components/ui/GlowButton';

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState({ email: '', password: '' });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Giriş başarısız. Tekrar dene.');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Giriş formu" className="space-y-5">
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg text-sm font-medium animate-slide-up"
          style={{
            background: 'rgba(255,51,85,0.08)',
            border: '1px solid rgba(255,51,85,0.3)',
            color: 'var(--color-danger)',
          }}
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="form-label">E-posta</label>
        <input
          id="email"
          type="email"
          name="email"
          className="form-input"
          placeholder="komutan@galaksi.com"
          autoComplete="email"
          required
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
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
