import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = { title: 'Kayıt Ol' };

export default function RegisterPage() {
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

      {/* Left panel — form */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 lg:max-w-[480px] lg:border-r lg:border-white/06">
        <div className="absolute inset-0 halftone-bg pointer-events-none opacity-30" aria-hidden />

        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-10">
            <Link href="/" className="inline-block mb-6" aria-label="Ana sayfaya dön">
              <span
                className="font-display text-xs font-bold tracking-[0.25em] uppercase"
                style={{ color: 'var(--color-race)' }}
              >
                ◆ NEBULA DOMINION ◆
              </span>
            </Link>

            <div className="mb-4">
              <span className="badge badge-race">Yeni Komutan</span>
            </div>

            <h1 className="font-display text-3xl font-black tracking-tight text-text-primary leading-tight">
              Evrenin<br />
              <span className="text-gradient-race">Fatihi</span> Ol
            </h1>
            <p className="mt-3 text-text-muted text-sm">
              5 ırktan birini seç, imparatorluğunu kur.
            </p>
          </div>

          <div
            className="manga-panel p-7"
            style={{
              background: 'rgba(13,17,23,0.8)',
              borderColor: 'rgba(74,158,255,0.15)',
            }}
          >
            <RegisterForm />

            <div
              className="mt-6 pt-5 text-center"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-text-muted text-sm">
                Zaten hesabın var mı?{' '}
                <Link
                  href="/login"
                  className="font-semibold transition-colors duration-200"
                  style={{ color: 'var(--color-race)' }}
                >
                  Giriş yap →
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center mt-6 text-text-muted text-xs">
            Kayıt olarak{' '}
            <a href="#" className="hover:text-text-secondary transition-colors underline underline-offset-2">Kullanım Şartları</a>
            {' '}ve{' '}
            <a href="#" className="hover:text-text-secondary transition-colors underline underline-offset-2">Gizlilik Politikası</a>
            &apos;nı kabul edersin.
          </p>
        </div>
      </div>

      {/* Right panel — character portrait (desktop) */}
      <div className="hidden lg:flex flex-1 relative items-end justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 50% 90%, rgba(204,0,255,0.10) 0%, transparent 70%)',
          }}
          aria-hidden
        />
        <div className="relative z-10 w-full max-w-sm h-[70vh] flex items-end justify-center">
          <Image
            src="/assets/characters/seytan/malphas.png"
            alt="Komutan Malphas"
            fill
            className="object-contain object-bottom"
            priority
            style={{ filter: 'drop-shadow(0 0 40px rgba(204,0,255,0.25))' }}
          />
        </div>
        <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  );
}
