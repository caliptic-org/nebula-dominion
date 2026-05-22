'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import {
  Caption,
  Eyebrow,
  H1,
  ND,
  NDButton,
  type NDRace,
  type NDRaceKey,
  Sigil,
  useNDRace,
} from '@/components/handoff';
import { hasSession } from '@/lib/session';

const SPLASH_COPY: Record<NDRaceKey, {
  eyebrow: string;
  subtitle: string;
  cta: string;
}> = {
  insan: {
    eyebrow: 'KOZMİK YANKI · KOLONY KANALI · ÇAĞ 0',
    subtitle: 'Beş ırk uyandı. Beş vizyon çarpıştı.\nGalaksi senin yazacağın hikaye.',
    cta: 'EVRENE GİR',
  },
  zerg: {
    eyebrow: 'KOZMİK YANKI · KOVAN UYANIYOR · ÇAĞ 0',
    subtitle: 'Yumurta çatladı. Sürü senin uzantın.\nAsimile et, evrimi yaz.',
    cta: "KOVAN'A KATIL",
  },
  otomat: {
    eyebrow: '::cosmic_echo · ::boot_seq=01 · ::age 0',
    subtitle: '::5 races detected · 5 logics conflict\n::write the optimal solution',
    cta: '::initialize',
  },
  canavar: {
    eyebrow: 'VAHŞİ KAN UYANDI · AY 0',
    subtitle: 'Beş kan uyandı. Beş ulu yarıştı.\nGüçlü olan yönetir. Sen kimsin?',
    cta: 'AV BAŞLAT',
  },
  seytan: {
    eyebrow: '· KOZMİK YANKI · SÜRGÜN BİTTİ · ÇAĞ 0 ·',
    subtitle: 'Beş sürgün döndü. Beş pakt yazıldı.\nİntikamın bedelini sen belirle.',
    cta: 'PAKT YAZ',
  },
};

const SIGIL_ANIM_CLASS: Record<NDRaceKey, string> = {
  insan: 'nd-glow',
  zerg: 'nd-breath',
  otomat: 'nd-tick',
  canavar: 'nd-glow',
  seytan: 'nd-sigil',
};

function CornerHUD({ race }: { race: NDRace }) {
  const c = race.primary;
  const base: CSSProperties = {
    position: 'absolute',
    top: 60,
    fontFamily: ND.mono,
    fontSize: 9,
    letterSpacing: '0.20em',
    color: c,
    opacity: 0.7,
    textTransform: 'uppercase',
    pointerEvents: 'none',
  };

  switch (race.key) {
    case 'insan':
      return (
        <>
          <div style={{ ...base, left: 16 }} aria-hidden>SECTOR<br />ORIGO-0</div>
          <div style={{ ...base, right: 16, textAlign: 'right' }} aria-hidden>
            SIGNAL<br /><span className="nd-blink">/// STABLE</span>
          </div>
        </>
      );
    case 'zerg':
      return (
        <>
          <div style={{ ...base, left: 16 }} aria-hidden>KOVAN<br />BROOD-1</div>
          <div style={{ ...base, right: 16, textAlign: 'right' }} aria-hidden>
            VİTAL<br /><span className="nd-pulse">~~ %92</span>
          </div>
        </>
      );
    case 'otomat':
      return (
        <>
          <div style={{ ...base, left: 16, letterSpacing: '0.16em' }} aria-hidden>::node<br />NODE-04</div>
          <div style={{ ...base, right: 16, textAlign: 'right', letterSpacing: '0.16em' }} aria-hidden>
            ::heartbeat<br /><span className="nd-tick">OK · OK · OK</span>
          </div>
        </>
      );
    case 'canavar':
      return (
        <>
          <div style={{ ...base, left: 16, fontFamily: ND.display }} aria-hidden>AVLAK<br />HOWL-1</div>
          <div style={{ ...base, right: 16, textAlign: 'right', fontFamily: ND.display }} aria-hidden>AY<br />DOLUNAY</div>
        </>
      );
    case 'seytan':
      return (
        <>
          <div style={{ ...base, left: 16, letterSpacing: '0.30em', fontFamily: ND.display }} aria-hidden>
            · MAHKEME ·<br />TEMPLE-2
          </div>
          <div style={{ ...base, right: 16, textAlign: 'right', letterSpacing: '0.30em', fontFamily: ND.display }} aria-hidden>
            · MÜHÜR ·<br /><span className="nd-sigil">⊕ III</span>
          </div>
        </>
      );
  }
}

function NebulaBackdrop({ race }: { race: NDRace }) {
  return (
    <>
      {/* Race-tinted nebula glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 85% 60% at 50% -10%, ${race.glow} 0%, transparent 55%),
            radial-gradient(ellipse 55% 50% at 18% 100%, ${race.primaryDim} 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 90% 90%, oklch(0.55 0.18 280 / 0.45) 0%, transparent 60%)
          `,
          opacity: 0.62,
          pointerEvents: 'none',
        }}
      />
      {/* Star field */}
      <svg
        aria-hidden
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 400 800"
        style={{ position: 'absolute', inset: 0, opacity: 0.55, pointerEvents: 'none' }}
      >
        <defs>
          <pattern id="splash-stars" width="80" height="80" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="13" r="0.6" fill="#fff" opacity="0.7" />
            <circle cx="42" cy="28" r="0.4" fill="#fff" opacity="0.5" />
            <circle cx="64" cy="52" r="0.7" fill="#fff" opacity="0.8" />
            <circle cx="22" cy="60" r="0.5" fill="#fff" opacity="0.6" />
            <circle cx="55" cy="9" r="0.3" fill="#fff" opacity="0.4" />
            <circle cx="11" cy="40" r="0.35" fill="#fff" opacity="0.45" />
            <circle cx="74" cy="72" r="0.45" fill="#fff" opacity="0.55" />
          </pattern>
        </defs>
        <rect width="400" height="800" fill="url(#splash-stars)" />
      </svg>
      {/* Darkening floor */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(3,5,11,0.45) 0%, rgba(3,5,11,0) 30%, rgba(3,5,11,0) 60%, rgba(3,5,11,0.95) 100%)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}

function renderSubtitle(text: string): ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <span key={i}>
      {line}
      {i < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

export function SplashClient() {
  const race = useNDRace('insan');
  const router = useRouter();
  const copy = SPLASH_COPY[race.key];
  const sigilAnim = SIGIL_ANIM_CLASS[race.key];

  const handleEnter = () => {
    router.push(hasSession() ? '/' : '/login');
  };

  return (
    <div
      data-race={race.key}
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: ND.bgDeep,
        color: ND.text,
        fontFamily: ND.body,
        overflow: 'hidden',
      }}
    >
      <NebulaBackdrop race={race} />
      <CornerHUD race={race} />

      <main
        className="nd-slide-up"
        style={{
          position: 'relative',
          maxWidth: 420,
          margin: '0 auto',
          minHeight: '100dvh',
          padding: '88px 32px 60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          gap: 24,
        }}
      >
        <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Eyebrow color={race.primary} style={{ marginBottom: 22 }}>{copy.eyebrow}</Eyebrow>

          <div className={sigilAnim} style={{ color: race.glow, marginBottom: 22 }} aria-hidden>
            <Sigil race={race} size={86} glow />
          </div>

          <H1
            style={{
              fontSize: 38,
              color: ND.text,
              letterSpacing: '0.10em',
              marginBottom: 6,
              fontFamily: race.key === 'otomat' ? ND.mono : ND.display,
            }}
          >
            NEBULA
          </H1>
          <H1
            style={{
              fontSize: 38,
              color: race.primary,
              letterSpacing: '0.36em',
              textShadow: `0 0 18px color-mix(in oklch, ${race.glow}, transparent 50%)`,
              fontFamily: race.key === 'otomat' ? ND.mono : ND.display,
            }}
          >
            DOMINION
          </H1>

          <Caption style={{ marginTop: 18, color: ND.textDim, maxWidth: 280 }}>
            {renderSubtitle(copy.subtitle)}
          </Caption>
        </header>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <NDButton race={race} size="lg" full onClick={handleEnter}>
            {copy.cta}
          </NDButton>

          <Link
            href="/login"
            style={{
              fontFamily: ND.mono,
              fontSize: 10,
              color: ND.textMute,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            v0.1 · MVP BUILD 0426 · {race.short}-CHANNEL
          </Link>
        </div>
      </main>
    </div>
  );
}
