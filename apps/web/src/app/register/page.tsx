import type { Metadata } from 'next'
import Link from 'next/link'
import { RegisterForm } from './RegisterForm'

export const metadata: Metadata = {
  title: 'Kayıt Ol — Nebula Dominion',
}

export default function RegisterPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* Atmospheric grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(64,200,224,0.05) 0%, transparent 55%)',
          zIndex: 0,
        }}
        aria-hidden
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(64,200,224,0.025) 39px, rgba(64,200,224,0.025) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(64,200,224,0.025) 39px, rgba(64,200,224,0.025) 40px)`,
          zIndex: 0,
        }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Game logo */}
        <div className="text-center mb-8">
          <Link href="/" aria-label="Ana sayfaya dön">
            <div className="inline-flex flex-col items-center gap-2">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                style={{
                  background: 'linear-gradient(145deg, #1e1a10 0%, #0d0b06 100%)',
                  border: '2px solid rgba(232,168,32,0.5)',
                  boxShadow: '0 0 32px rgba(232,168,32,0.25), inset 0 1px 0 rgba(255,220,80,0.2)',
                }}
              >
                🚀
              </div>
              <div>
                <div
                  className="font-display font-black tracking-widest text-xl uppercase"
                  style={{
                    background: 'linear-gradient(180deg, #f0c840 0%, #c88010 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  NEBULA DOMINION
                </div>
                <div className="text-xs tracking-widest mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  SPACE BATTLE STRATEGY
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Register card */}
        <div
          style={{
            background: 'linear-gradient(160deg, #12141f 0%, #0c0e17 100%)',
            border: '1px solid rgba(64,200,224,0.2)',
            borderRadius: 12,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(64,200,224,0.05)',
            overflow: 'hidden',
          }}
        >
          {/* Card header band */}
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(64,200,224,0.12) 0%, transparent 100%)',
              borderBottom: '1px solid rgba(64,200,224,0.18)',
              padding: '14px 28px',
            }}
          >
            <h1 className="font-display font-black text-base uppercase tracking-widest" style={{ color: 'var(--color-energy)' }}>
              🛸 YENİ KOMUTAN
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Galaksiye katıl — ücretsiz
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

        <p className="text-center mt-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Kayıt olarak{' '}
          <a href="#" style={{ color: 'var(--color-text-muted)', textDecoration: 'underline' }}>
            Kullanım Şartları
          </a>{' '}
          ve{' '}
          <a href="#" style={{ color: 'var(--color-text-muted)', textDecoration: 'underline' }}>
            Gizlilik Politikası
          </a>
          &apos;nı kabul etmiş olursun.
        </p>
      </div>
    </div>
  )
}
