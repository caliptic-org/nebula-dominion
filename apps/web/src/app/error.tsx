'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Nebula] Beklenmeyen sistem hatası:', error);
  }, [error]);

  const digest = error.digest;

  return (
    <div
      className="relative h-dvh w-full overflow-y-auto flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--color-bg)' }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,51,85,0.14) 0%, #080a10 70%)',
          zIndex: 0,
        }}
        aria-hidden
      />
      <div className="fixed inset-0 halftone-bg pointer-events-none opacity-15" aria-hidden />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full animate-float"
          style={{
            background:
              'radial-gradient(circle, rgba(255,51,85,0.18) 0%, rgba(120,0,30,0.08) 40%, transparent 65%)',
            filter: 'blur(72px)',
            animationDuration: '13s',
          }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-[520px] h-[520px] rounded-full animate-float"
          style={{
            background:
              'radial-gradient(circle, rgba(255,170,34,0.14) 0%, rgba(80,40,0,0.06) 40%, transparent 65%)',
            filter: 'blur(64px)',
            animationDuration: '16s',
            animationDirection: 'reverse',
          }}
        />
      </div>

      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.10) 2px, rgba(0,0,0,0.10) 4px)',
          zIndex: 5,
        }}
        aria-hidden
      />

      <main className="relative z-10 w-full max-w-xl text-center" role="alert" aria-live="assertive">
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
          style={{
            background: 'rgba(255,51,85,0.10)',
            border: '1px solid rgba(255,51,85,0.35)',
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--color-danger)', boxShadow: '0 0 8px var(--color-danger)' }}
            aria-hidden
          />
          <span
            className="font-display text-[9px] uppercase tracking-[0.32em] font-semibold"
            style={{ color: 'var(--color-danger)' }}
          >
            KRİTİK ARIZA · SİSTEM
          </span>
        </div>

        <div
          className="mx-auto mb-8 inline-flex items-center justify-center rounded-[2rem] p-[1.5px]"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,51,85,0.45) 0%, rgba(255,170,34,0.25) 50%, rgba(255,51,85,0.20) 100%)',
          }}
        >
          <div
            className="flex flex-col items-center gap-3 rounded-[calc(2rem-1.5px)] px-10 py-6 sm:px-14 sm:py-8"
            style={{
              background: 'rgba(10,12,20,0.92)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
            }}
          >
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,51,85,0.18) 0%, transparent 70%)',
              }}
              aria-hidden
            >
              <svg
                width="56"
                height="56"
                viewBox="0 0 56 56"
                fill="none"
                className="relative z-10"
              >
                <path
                  d="M28 6 L52 50 L4 50 Z"
                  stroke="var(--color-danger)"
                  strokeOpacity="0.85"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  fill="rgba(255,51,85,0.08)"
                />
                <line x1="28" y1="22" x2="28" y2="36" stroke="var(--color-danger)" strokeWidth="3" strokeLinecap="round" />
                <circle cx="28" cy="43" r="2.2" fill="var(--color-danger)" />
              </svg>
              <div
                className="absolute inset-0 rounded-full animate-glow-pulse"
                style={{
                  boxShadow: '0 0 24px rgba(255,51,85,0.55), 0 0 48px rgba(255,51,85,0.20)',
                }}
                aria-hidden
              />
            </div>

            <div className="flex flex-col items-center">
              <span
                className="font-display text-[10px] uppercase tracking-[0.32em] font-semibold mb-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ERR · ÇEKİRDEK
              </span>
              <h1
                className="font-display text-5xl sm:text-6xl font-black leading-none tracking-[0.10em] uppercase"
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-danger) 0%, #ffaa22 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 60px rgba(255,51,85,0.45)',
                }}
              >
                Sistem<br />Çöktü
              </h1>
            </div>
          </div>
        </div>

        <h2
          className="font-display text-xl sm:text-2xl font-black uppercase tracking-[0.12em] mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Beklenmeyen <span style={{ color: 'var(--color-danger)' }}>Anomali</span>
        </h2>

        <p
          className="font-body text-base sm:text-lg mb-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Komuta merkezi geçici bir parazitle karşılaştı.
        </p>
        <p
          className="font-body text-sm mb-8"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Sistemi yeniden başlatabilir veya Ana Üsse geri dönebilirsin.
        </p>

        {digest && (
          <div
            className="mx-auto mb-8 max-w-md rounded-lg px-4 py-3 text-left"
            style={{
              background: 'rgba(255,51,85,0.06)',
              border: '1px solid rgba(255,51,85,0.20)',
            }}
          >
            <div
              className="font-display text-[9px] uppercase tracking-[0.18em] mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Hata İmzası
            </div>
            <code
              className="font-mono text-xs break-all"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {digest}
            </code>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="btn-primary w-full sm:w-auto"
            style={{
              background: 'var(--color-danger)',
              color: '#080a10',
            }}
          >
            <span aria-hidden>↻</span>
            <span>Yeniden Dene</span>
          </button>
          <Link href="/" className="btn-ghost w-full sm:w-auto inline-flex items-center justify-center gap-2">
            <span aria-hidden>◆</span>
            <span>Ana Üse Dön</span>
          </Link>
        </div>

        <p
          className="mt-12 font-mono text-[9px] uppercase tracking-[0.32em]"
          style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
        >
          NEBULA · DİAGNOSTİK · OTOMATİK KURTARMA AKTİF
        </p>
      </main>
    </div>
  );
}
