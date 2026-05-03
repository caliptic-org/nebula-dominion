import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = {
  title: 'Kayıt Ol',
};

export default function RegisterPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* Animated background glows */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 70% 30%, rgba(61,212,192,0.10) 0%, transparent 55%), radial-gradient(ellipse at 20% 70%, rgba(108,142,240,0.08) 0%, transparent 50%)',
          zIndex: 0,
        }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md animate-slide-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex flex-col items-center gap-3 group" aria-label="Ana sayfaya dön">
            <span className="text-5xl animate-float" aria-hidden>🌌</span>
            <span className="font-display text-xl font-black tracking-widest text-gradient-brand" style={{ letterSpacing: '4px' }}>
              NEBULA DOMINION
            </span>
          </Link>
          <h1 className="mt-6 font-display text-2xl font-bold text-text-primary">
            Galaksiye Katıl
          </h1>
          <p className="mt-2 text-text-secondary text-sm font-body">
            Ücretsiz hesap oluştur — saniyeler içinde savaşmaya başla
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8">
          <RegisterForm />

          <div className="mt-6 text-center">
            <p className="text-text-muted text-sm">
              Zaten hesabın var mı?{' '}
              <Link href="/login" className="text-brand hover:text-brand-hover font-semibold transition-colors">
                Giriş yap
              </Link>
            </p>
          </div>

          <div className="p-7">
            <RegisterForm />

            <div className="mt-5 text-center">
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Zaten hesabın var mı?{' '}
                <Link
                  href="/login"
                  className="font-bold transition-colors"
                  style={{ color: 'var(--color-brand)' }}
                >
                  Giriş Yap
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-text-muted text-xs font-body">
          Kayıt olarak{' '}
          <a href="#" style={{ color: 'var(--color-text-muted)', textDecoration: 'underline' }}>
            Kullanım Şartları
          </a>
          &apos;nı kabul etmiş olursun.
        </p>
      </div>
    </div>
  );
}
