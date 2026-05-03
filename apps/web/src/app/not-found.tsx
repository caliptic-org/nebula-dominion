import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sinyal Kayıp · 404',
  description: 'Aradığın koordinat bilinmeyen sektörde — galaksinin bu bölgesi henüz haritalanmadı.',
};

export default function NotFound() {
  return (
    <div
      className="relative h-dvh w-full overflow-y-auto flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--color-bg)' }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />
      <div className="fixed inset-0 halftone-bg pointer-events-none opacity-15" aria-hidden />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(204,0,255,0.16) 0%, rgba(80,0,120,0.06) 35%, transparent 65%)',
            filter: 'blur(64px)',
            animationDuration: '14s',
          }}
        />
        <div
          className="absolute -bottom-32 -right-24 w-[560px] h-[560px] rounded-full animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(74,158,255,0.18) 0%, rgba(10,30,70,0.08) 40%, transparent 65%)',
            filter: 'blur(72px)',
            animationDuration: '17s',
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

      <main className="relative z-10 w-full max-w-xl text-center">
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
          style={{
            background: 'var(--color-race-dim)',
            border: '1px solid var(--color-race-glow)',
          }}
        >
          <span
            className="text-[9px] uppercase tracking-[0.32em] font-semibold font-display"
            style={{ color: 'var(--color-race)' }}
          >
            ◈ &nbsp;SİNYAL KAYIP
          </span>
        </div>

        <div
          className="mx-auto mb-8 inline-flex items-center justify-center rounded-[2rem] p-[1.5px]"
          style={{
            background:
              'linear-gradient(135deg, rgba(74,158,255,0.35) 0%, rgba(204,0,255,0.22) 50%, rgba(0,207,255,0.15) 100%)',
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
              style={{ background: 'radial-gradient(circle, var(--color-race-dim) 0%, transparent 70%)' }}
              aria-hidden
            >
              <svg
                width="56"
                height="56"
                viewBox="0 0 56 56"
                fill="none"
                className="relative z-10 animate-float"
                style={{ animationDuration: '6s' }}
              >
                <circle cx="28" cy="28" r="24" stroke="var(--color-race)" strokeOpacity="0.25" strokeWidth="0.75" />
                <circle cx="28" cy="28" r="16" stroke="var(--color-race)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="3 4" />
                <circle cx="28" cy="28" r="6" fill="var(--color-race)" fillOpacity="0.85" />
                <line x1="28" y1="4" x2="28" y2="12" stroke="var(--color-race)" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="28" y1="44" x2="28" y2="52" stroke="var(--color-race)" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="4" y1="28" x2="12" y2="28" stroke="var(--color-race)" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="44" y1="28" x2="52" y2="28" stroke="var(--color-race)" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div
                className="absolute inset-0 rounded-full animate-glow-pulse"
                style={{ boxShadow: '0 0 24px var(--color-race-glow), 0 0 48px var(--color-race-glow)' }}
                aria-hidden
              />
            </div>

            <div className="flex flex-col items-center">
              <span
                className="font-display text-[10px] uppercase tracking-[0.32em] font-semibold mb-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ERR · KOORDİNAT
              </span>
              <h1
                className="font-display text-7xl sm:text-8xl font-black leading-none tracking-[0.08em]"
                style={{
                  color: 'var(--color-text-primary)',
                  background:
                    'linear-gradient(135deg, var(--color-race) 0%, #cc00ff 55%, #00cfff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 60px var(--color-race-glow)',
                }}
              >
                404
              </h1>
            </div>
          </div>
        </div>

        <h2
          className="font-display text-2xl sm:text-3xl font-black uppercase tracking-[0.12em] mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Bilinmeyen <span style={{ color: 'var(--color-race)' }}>Sektör</span>
        </h2>

        <p
          className="font-body text-base sm:text-lg mb-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Aradığın koordinat galaksinin haritalanmamış bölgesinde.
        </p>
        <p
          className="font-body text-sm mb-10"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Sinyal zayıf — Ana Üs sana güvenli bir geri dönüş rotası açtı.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="btn-primary w-full sm:w-auto">
            <span aria-hidden>◆</span>
            <span>Ana Üse Dön</span>
          </Link>
          <Link href="/map" className="btn-ghost w-full sm:w-auto inline-flex items-center justify-center gap-2">
            <span aria-hidden>🌌</span>
            <span>Haritayı Aç</span>
          </Link>
        </div>

        <div className="mt-12 flex items-center justify-center gap-2" aria-hidden>
          <span className="h-1 w-9 rounded-full" style={{ background: '#4a9eff', opacity: 0.4 }} />
          <span className="h-1 w-9 rounded-full" style={{ background: '#44ff44', opacity: 0.4 }} />
          <span className="h-1 w-9 rounded-full" style={{ background: '#00cfff', opacity: 0.4 }} />
          <span className="h-1 w-9 rounded-full" style={{ background: '#ff6600', opacity: 0.4 }} />
          <span className="h-1 w-9 rounded-full" style={{ background: '#cc00ff', opacity: 0.4 }} />
        </div>
        <p
          className="mt-3 font-mono text-[9px] uppercase tracking-[0.32em]"
          style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
        >
          NEBULA · NAV PROTOKOLÜ · ROTA YOK
        </p>
      </main>
    </div>
  );
}
