import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Giriş Yap' };

export default function LoginPage() {
  return (
    <div
      className="min-h-[100dvh] flex relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Animated nebula background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />

      {/* Left panel — character portrait (desktop) */}
      <div className="hidden lg:flex flex-1 relative items-end justify-center overflow-hidden">
        {/* Race atmosphere bg */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 50% 90%, rgba(74,158,255,0.12) 0%, transparent 70%)',
          }}
          aria-hidden
        />
        {/* Speed lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute h-px"
              style={{
                top: `${10 + i * 7}%`,
                left: 0,
                right: 0,
                background: `linear-gradient(90deg, transparent 0%, rgba(74,158,255,${0.03 + i * 0.005}) 50%, transparent 100%)`,
                transform: `rotate(${-2 + i * 0.3}deg)`,
              }}
            />
          ))}
        </div>

        {/* Commander portrait */}
        <div className="relative z-10 w-full max-w-sm h-[70vh] flex items-end justify-center">
          <Image
            src="/assets/characters/insan/voss.png"
            alt="Komutan Voss"
            fill
            className="object-contain object-bottom"
            priority
            style={{ filter: 'drop-shadow(0 0 40px rgba(74,158,255,0.3))' }}
          />
        </div>

        {/* Manga panel border lines */}
        <div className="absolute inset-y-0 right-0 w-[2px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      </div>

      {/* Right panel — form */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 lg:max-w-[480px] lg:border-l lg:border-white/06">
        {/* Halftone dots texture */}
        <div className="absolute inset-0 halftone-bg pointer-events-none opacity-30" aria-hidden />

        <div className="relative z-10 w-full max-w-sm">
          {/* Logo */}
          <div className="mb-10">
            <Link
              href="/"
              className="inline-flex items-center gap-3 group mb-6 block"
              aria-label="Ana sayfaya dön"
            >
              <span
                className="font-display text-xs font-bold tracking-[0.25em] uppercase"
                style={{ color: 'var(--color-race)' }}
              >
                ◆ NEBULA DOMINION ◆
              </span>
            </Link>

            {/* Eyebrow badge */}
            <div className="mb-4">
              <span className="badge badge-race">Komutan Girişi</span>
            </div>

            <h1 className="font-display text-3xl font-black tracking-tight text-text-primary leading-tight">
              Galaksiye<br />
              <span className="text-gradient-race">Dön,</span> Komutan
            </h1>
            <p className="mt-3 text-text-muted text-sm">
              Evrenin hakimiyeti seni bekliyor.
            </p>
          </div>

          {/* Manga panel card */}
          <div
            className="manga-panel p-7"
            style={{
              background: 'rgba(13,17,23,0.8)',
              borderColor: 'rgba(74,158,255,0.15)',
            }}
          >
            <LoginForm />

            <div
              className="mt-6 pt-5 text-center"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-text-muted text-sm">
                Hesabın yok mu?{' '}
                <Link
                  href="/register"
                  className="font-semibold transition-colors duration-200"
                  style={{ color: 'var(--color-race)' }}
                >
                  Ücretsiz kayıt ol →
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center mt-6 text-text-muted text-xs">
            <Link href="/" className="hover:text-text-secondary transition-colors duration-200">
              ← Ana sayfaya dön
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
