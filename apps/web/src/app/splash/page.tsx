'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Race colors cycling through the progress bar fill
const RACE_COLORS = [
  { hex: '#4a9eff', glow: 'rgba(74,158,255,0.55)'  }, // İnsan
  { hex: '#44ff44', glow: 'rgba(68,255,68,0.55)'   }, // Zerg
  { hex: '#00cfff', glow: 'rgba(0,207,255,0.55)'   }, // Otomat
  { hex: '#ff6600', glow: 'rgba(255,102,0,0.55)'   }, // Canavar
  { hex: '#cc00ff', glow: 'rgba(204,0,255,0.55)'   }, // Şeytan
] as const

const LOADING_MESSAGES = [
  'KOMUTAN PROFİLİ YÜKLENİYOR...',
  'GALAKSI HARİTASI TARANIOR...',
  'IRK VERİTABANI SENKRONİZE EDİLİYOR...',
  'SAVAŞ PROTOKOLLERİ AKTİFLEŞTİRİLİYOR...',
  'NEBULA ÇEKİRDEĞİNE BAĞLANIYOR...',
  'KOMUTA SİSTEMİ HAZIR...',
]

export default function SplashPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [visible, setVisible] = useState(false)
  const [loadingStarted, setLoadingStarted] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const [msgIndex, setMsgIndex] = useState(0)

  // Entrance stagger: logo appears first, then loading kicks in
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 150)
    const t2 = setTimeout(() => setLoadingStarted(true), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Progress simulation — non-linear for organic feel
  useEffect(() => {
    if (!loadingStarted) return

    const interval = setInterval(() => {
      setProgress(prev => {
        const increment =
          prev < 35 ? 2.2 :
          prev < 65 ? 2.8 :
          prev < 85 ? 1.4 : 0.7
        const next = Math.min(prev + increment, 100)

        if (next >= 100) {
          clearInterval(interval)
          setTimeout(() => setFadingOut(true), 500)
          setTimeout(() => router.push('/login'), 1300)
        }
        return next
      })
    }, 50)

    const msgInterval = setInterval(() => {
      setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length)
    }, 750)

    return () => { clearInterval(interval); clearInterval(msgInterval) }
  }, [loadingStarted, router])

  const colorIdx = Math.min(Math.floor(progress / 20), 4)
  const { hex: barColor, glow: barGlow } = RACE_COLORS[colorIdx]
  const progressPct = Math.floor(progress)

  return (
    <div
      className="relative h-dvh w-full overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: '#080a10',
        opacity: fadingOut ? 0 : 1,
        transition: fadingOut ? 'opacity 800ms cubic-bezier(0.32,0.72,0,1)' : 'none',
      }}
    >

      {/* ── Nebula orbs (animated radial gradients) ───────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {/* Purple top-left */}
        <div
          className="absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(204,0,255,0.18) 0%, rgba(80,0,120,0.08) 35%, transparent 65%)',
            filter: 'blur(64px)',
            animationDuration: '14s',
          }}
        />
        {/* Cyan top-right */}
        <div
          className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(0,207,255,0.14) 0%, rgba(0,60,100,0.06) 40%, transparent 65%)',
            filter: 'blur(56px)',
            animationDuration: '18s',
            animationDirection: 'reverse',
          }}
        />
        {/* Blue bottom-center */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(74,158,255,0.20) 0%, rgba(10,30,70,0.10) 45%, transparent 65%)',
            filter: 'blur(72px)',
            animationDuration: '11s',
            animationDelay: '2s',
          }}
        />
        {/* Orange ember bottom-right */}
        <div
          className="absolute bottom-24 right-12 w-[280px] h-[280px] rounded-full animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(255,102,0,0.10) 0%, transparent 60%)',
            filter: 'blur(44px)',
            animationDuration: '16s',
            animationDelay: '4s',
          }}
        />
      </div>

      {/* ── Scan-line overlay (fixed, GPU-safe) ───────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
          zIndex: 5,
        }}
        aria-hidden
      />

      {/* ── Sound toggle ─────────────────────────────────────────────────── */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={() => setSoundEnabled(s => !s)}
          className="group flex items-center gap-2 rounded-full px-4 py-2"
          style={{
            background: 'rgba(13,17,23,0.75)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            transition: 'border-color 400ms cubic-bezier(0.32,0.72,0,1), background 400ms cubic-bezier(0.32,0.72,0,1)',
          }}
          aria-label={soundEnabled ? 'Sesi kapat' : 'Sesi aç'}
        >
          <span
            className="transition-colors duration-300"
            style={{ color: soundEnabled ? '#4a9eff' : '#555d7a' }}
          >
            {soundEnabled ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
          </span>
          <span
            className="text-[9px] uppercase tracking-[0.18em] font-medium transition-colors duration-300"
            style={{
              fontFamily: 'var(--font-body)',
              color: soundEnabled ? '#a0a8c0' : '#555d7a',
            }}
          >
            {soundEnabled ? 'SES AÇIK' : 'SES KAPALI'}
          </span>
        </button>
      </div>

      {/* ── Main hero content ─────────────────────────────────────────────── */}
      <div
        className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg px-6 text-center"
        style={{
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(-18px) scale(0.97)',
          opacity: visible ? 1 : 0,
          filter: visible ? 'blur(0)' : 'blur(6px)',
          transition: 'transform 1000ms cubic-bezier(0.32,0.72,0,1), opacity 900ms cubic-bezier(0.32,0.72,0,1), filter 900ms cubic-bezier(0.32,0.72,0,1)',
        }}
      >

        {/* Eyebrow tag */}
        <div
          className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
          style={{
            background: 'rgba(74,158,255,0.07)',
            border: '1px solid rgba(74,158,255,0.18)',
          }}
        >
          <span
            className="text-[9px] uppercase tracking-[0.32em] font-semibold"
            style={{ color: '#4a9eff', fontFamily: 'var(--font-display)' }}
          >
            ◈ &nbsp;GALAKSİYE HAZIR OL
          </span>
        </div>

        {/* Double-bezel logo card */}
        <div
          className="mb-8 inline-flex items-center justify-center rounded-[2rem] p-[1.5px]"
          style={{
            background: 'linear-gradient(135deg, rgba(74,158,255,0.35) 0%, rgba(204,0,255,0.22) 50%, rgba(0,207,255,0.15) 100%)',
          }}
        >
          <div
            className="flex flex-col items-center gap-4 rounded-[calc(2rem-1.5px)] px-10 py-8"
            style={{
              background: 'rgba(10,12,20,0.92)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
            }}
          >
            {/* Logo mark SVG */}
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(74,158,255,0.15) 0%, transparent 70%)',
              }}
            >
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="relative z-10 animate-float" style={{ animationDuration: '6s' }}>
                {/* Outer orbit ring */}
                <ellipse cx="24" cy="24" rx="21" ry="8" stroke="#cc00ff" strokeWidth="0.75" strokeOpacity="0.4" transform="rotate(-25 24 24)" />
                {/* Inner orbit ring */}
                <ellipse cx="24" cy="24" rx="21" ry="8" stroke="#00cfff" strokeWidth="0.75" strokeOpacity="0.3" transform="rotate(25 24 24)" />
                {/* Galactic core rings */}
                <circle cx="24" cy="24" r="19" stroke="#4a9eff" strokeWidth="0.75" strokeOpacity="0.25" />
                <circle cx="24" cy="24" r="12" stroke="#4a9eff" strokeWidth="1" strokeOpacity="0.45" />
                <circle cx="24" cy="24" r="5" fill="#4a9eff" fillOpacity="0.9" />
                <circle cx="24" cy="24" r="3" fill="#e8e8f0" />
                {/* Cardinal spokes */}
                <line x1="24" y1="3" x2="24" y2="10" stroke="#4a9eff" strokeWidth="1.5" strokeOpacity="0.55" strokeLinecap="round" />
                <line x1="24" y1="38" x2="24" y2="45" stroke="#4a9eff" strokeWidth="1.5" strokeOpacity="0.55" strokeLinecap="round" />
                <line x1="3"  y1="24" x2="10" y2="24" stroke="#4a9eff" strokeWidth="1.5" strokeOpacity="0.55" strokeLinecap="round" />
                <line x1="38" y1="24" x2="45" y2="24" stroke="#4a9eff" strokeWidth="1.5" strokeOpacity="0.55" strokeLinecap="round" />
              </svg>
              {/* Glow ring */}
              <div
                className="absolute inset-0 rounded-full animate-glow-pulse"
                style={{ boxShadow: '0 0 24px rgba(74,158,255,0.45), 0 0 48px rgba(74,158,255,0.15)' }}
              />
            </div>

            {/* Title */}
            <div className="flex flex-col items-center gap-0.5">
              <h1
                className="text-4xl sm:text-5xl font-black tracking-[0.18em] uppercase leading-none"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: '#e8e8f0',
                  textShadow: '0 0 40px rgba(74,158,255,0.5), 0 0 80px rgba(74,158,255,0.15)',
                }}
              >
                NEBULA
              </h1>
              <h1
                className="text-4xl sm:text-5xl font-black tracking-[0.18em] uppercase leading-none"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: 'linear-gradient(135deg, #4a9eff 0%, #cc00ff 55%, #00cfff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '0.18em',
                }}
              >
                DOMINION
              </h1>
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <p
          className="mb-3 text-xs uppercase tracking-[0.22em]"
          style={{ color: '#a0a8c0', fontFamily: 'var(--font-body)' }}
        >
          5 IRK · SONSUZ SAVAŞ · 1 KADER
        </p>

        {/* Race color dots — light up as progress passes each segment */}
        <div className="mb-12 flex items-center justify-center gap-2">
          {RACE_COLORS.map((c, i) => (
            <div
              key={i}
              className="h-1 w-9 rounded-full"
              style={{
                background: c.hex,
                boxShadow: progress > i * 20 ? `0 0 8px ${c.hex}, 0 0 16px ${c.glow}` : 'none',
                opacity: progress > i * 20 ? 1 : 0.15,
                transform: progress > i * 20 ? 'scaleX(1)' : 'scaleX(0.55)',
                transition: 'opacity 500ms cubic-bezier(0.32,0.72,0,1), transform 500ms cubic-bezier(0.32,0.72,0,1), box-shadow 500ms cubic-bezier(0.32,0.72,0,1)',
              }}
            />
          ))}
        </div>

        {/* Progress section */}
        <div className="w-full max-w-sm mx-auto">
          {/* Status row */}
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span
              className="text-[9px] uppercase tracking-[0.14em] truncate"
              style={{
                fontFamily: 'var(--font-body)',
                color: '#555d7a',
                opacity: loadingStarted ? 1 : 0,
                transition: 'opacity 400ms ease',
              }}
            >
              {LOADING_MESSAGES[msgIndex]}
            </span>
            <span
              className="shrink-0 text-[10px] tabular-nums font-semibold"
              style={{
                fontFamily: 'var(--font-mono)',
                color: barColor,
                transition: 'color 500ms cubic-bezier(0.32,0.72,0,1)',
              }}
            >
              {progressPct}%
            </span>
          </div>

          {/* Progress bar — double-bezel */}
          <div
            className="rounded-full p-[1px]"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="relative overflow-hidden rounded-full"
              style={{
                height: '5px',
                background: 'rgba(8,10,16,0.85)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
              }}
            >
              {/* Fill — uses scaleX transform for GPU compositing */}
              <div
                className="absolute inset-y-0 left-0 w-full origin-left rounded-full"
                style={{
                  background: `linear-gradient(90deg, #4a9eff 0%, ${barColor} 100%)`,
                  boxShadow: `0 0 10px ${barGlow}, 0 0 20px ${barGlow}`,
                  transform: `scaleX(${progress / 100})`,
                  transition: 'transform 100ms linear, background 600ms cubic-bezier(0.32,0.72,0,1), box-shadow 600ms cubic-bezier(0.32,0.72,0,1)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Version watermark ─────────────────────────────────────────────── */}
      <div
        className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2"
        style={{
          opacity: visible ? 0.35 : 0,
          transition: 'opacity 1200ms ease 800ms',
        }}
        aria-hidden
      >
        <span
          className="text-[8px] uppercase tracking-[0.32em]"
          style={{ color: '#555d7a', fontFamily: 'var(--font-mono)' }}
        >
          V0.1.0 · GALAKSI PROTOKOLü ALPHA
        </span>
      </div>

    </div>
  )
}
