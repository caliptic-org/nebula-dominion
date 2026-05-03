import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Giriş Yap',
};

const RACE_EMBLEMS = [
  { icon: '⚔️', color: 'var(--color-race-human)',     label: 'İnsan'    },
  { icon: '🦟', color: 'var(--color-race-zerg)',      label: 'Zerg'     },
  { icon: '🤖', color: 'var(--color-race-automaton)', label: 'Automaton'},
  { icon: '👾', color: 'var(--color-race-monster)',   label: 'Canavar'  },
  { icon: '😈', color: 'var(--color-race-demon)',     label: 'Şeytan'   },
];

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* Animated nebula background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(108,142,240,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(192,74,255,0.08) 0%, transparent 50%)',
          zIndex: 0,
        }}
        aria-hidden
      />

      {/* Floating race emblems background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }} aria-hidden>
        {RACE_EMBLEMS.map((r, i) => (
          <span
            key={r.label}
            className="absolute text-5xl select-none animate-float"
            style={{
              left: `${10 + i * 20}%`,
              top: `${15 + (i % 3) * 25}%`,
              opacity: 0.04,
              animationDelay: `${i * 1.2}s`,
              filter: `drop-shadow(0 0 20px ${r.color})`,
            }}
          >
            {r.icon}
          </span>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md animate-slide-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex flex-col items-center gap-3 group" aria-label="Ana sayfaya dön">
            <span className="text-5xl animate-float" aria-hidden>🌌</span>
            <span className="font-display text-xl font-black tracking-widest text-gradient-brand" style={{ letterSpacing: '4px' }}>
              NEBULA DOMINION
            </span>
          </Link>

          {/* Race color bar */}
          <div className="flex justify-center gap-1.5 mt-4">
            {RACE_EMBLEMS.map((r) => (
              <span
                key={r.label}
                className="w-6 h-1 rounded-full"
                style={{ background: r.color, boxShadow: `0 0 6px ${r.color}` }}
                aria-hidden
              />
            ))}
          </div>

          <h1 className="mt-6 font-display text-2xl font-bold text-text-primary">
            Tekrar Hoş Geldin
          </h1>
          <p className="mt-2 text-text-secondary text-sm font-body">
            Galaksiye dönmek için komutan kimliğini doğrula
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8">
          <LoginForm />

          <div className="mt-6 text-center">
            <p className="text-text-muted text-sm">
              Hesabın yok mu?{' '}
              <Link href="/register" className="text-brand hover:text-brand-hover font-semibold transition-colors">
                Ücretsiz kayıt ol
              </Link>
            </p>
          </div>

          <div className="p-7">
            <LoginForm />

            <div className="mt-5 text-center">
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Hesabın yok mu?{' '}
                <Link
                  href="/register"
                  className="font-bold transition-colors"
                  style={{ color: 'var(--color-brand)' }}
                >
                  Ücretsiz Kayıt Ol
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-text-muted text-xs font-body">
          <Link href="/" className="hover:text-text-secondary transition-colors">
            ← Ana sayfaya dön
          </Link>
        </p>
      </div>
    </div>
  );
}
