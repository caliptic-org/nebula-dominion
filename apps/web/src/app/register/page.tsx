import type { Metadata } from 'next'
import Link from 'next/link'
import { RegisterForm } from './RegisterForm'

export const metadata: Metadata = {
  title: 'Kayıt Ol',
}

export default function RegisterPage() {
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
            Galaksiye Katıl
          </h1>
          <p className="mt-2 text-text-secondary text-sm">
            Ücretsiz hesap oluştur, saniyeler içinde başla
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <RegisterForm />

          <div className="mt-6 text-center">
            <p className="text-text-muted text-sm">
              Zaten hesabın var mı?{' '}
              <Link
                href="/login"
                className="text-brand hover:text-brand-hover font-medium transition-colors"
              >
                Giriş yap
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-text-muted text-xs">
          Kayıt olarak{' '}
          <a href="#" className="hover:text-text-secondary transition-colors underline underline-offset-2">
            Kullanım Şartları
          </a>{' '}
          ve{' '}
          <a href="#" className="hover:text-text-secondary transition-colors underline underline-offset-2">
            Gizlilik Politikası
          </a>
          &apos;nı kabul etmiş olursun.
        </p>
      </div>
    </div>
  )
}
