import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Giriş Yap',
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 stars-bg"
      style={{ background: 'var(--gradient-hero)' }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group" aria-label="Ana sayfaya dön">
            <span className="text-3xl" aria-hidden>🌌</span>
            <span className="font-display text-lg font-bold tracking-widest text-gradient-brand">
              NEBULA DOMINION
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-text-primary">
            Tekrar Hoş Geldin
          </h1>
          <p className="mt-2 text-text-secondary text-sm">
            Galaksiye dönmek için giriş yap
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <LoginForm />

          <div className="mt-6 text-center">
            <p className="text-text-muted text-sm">
              Hesabın yok mu?{' '}
              <Link
                href="/register"
                className="text-brand hover:text-brand-hover font-medium transition-colors"
              >
                Ücretsiz kayıt ol
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-text-muted text-xs">
          <Link href="/" className="hover:text-text-secondary transition-colors">
            ← Ana sayfaya dön
          </Link>
        </p>
      </div>
    </div>
  )
}
