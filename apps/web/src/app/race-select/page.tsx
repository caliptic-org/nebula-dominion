'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RACES, RACE_BY_ID, RaceId, RaceConfig } from './races';

const STAT_LABELS: Array<{ key: keyof RaceConfig['stats']; label: string }> = [
  { key: 'attack', label: 'Saldırı' },
  { key: 'defense', label: 'Savunma' },
  { key: 'speed', label: 'Hız' },
  { key: 'hp', label: 'Can' },
];

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-semibold">
          {label}
        </span>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}55 0%, ${color} 100%)`,
            boxShadow: `0 0 12px ${color}88`,
          }}
        />
      </div>
    </div>
  );
}

export default function RaceSelectPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<RaceId>('insan');
  const [hoveredId, setHoveredId] = useState<RaceId | null>(null);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  const activeId = hoveredId ?? selectedId;
  const active = RACE_BY_ID[activeId];
  const selected = RACE_BY_ID[selectedId];

  const speedLines = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        top: `${4 + i * 9.5}%`,
        rotate: -1 + i * 0.25,
        delay: i * 0.12,
      })),
    [],
  );

  return (
    <div
      className="h-dvh relative overflow-hidden flex flex-col text-text-primary"
      style={{ background: 'var(--color-bg, #07090f)' }}
    >
      {/* Race-themed atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${active.glow} 0%, transparent 65%), radial-gradient(ellipse 100% 80% at 50% 110%, ${active.glow} 0%, transparent 70%)`,
          zIndex: 0,
        }}
        aria-hidden
      />

      {/* Race-tinted manga halftone texture */}
      <div
        className="manga-halftone-race fixed inset-0 pointer-events-none transition-all duration-700"
        style={{
          opacity: 0.18,
          maskImage:
            'radial-gradient(ellipse 90% 80% at 50% 50%, black 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 90% 80% at 50% 50%, black 30%, transparent 80%)',
          zIndex: 0,
        }}
        aria-hidden
      />

      {/* Manga speed lines */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {speedLines.map((line, i) => (
          <div
            key={i}
            className="absolute h-px w-full transition-all duration-700"
            style={{
              top: line.top,
              transform: `rotate(${line.rotate}deg)`,
              background: `linear-gradient(90deg, transparent 0%, ${active.color}33 50%, transparent 100%)`,
              opacity: 0.55,
            }}
          />
        ))}
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {Array.from({ length: 22 }).map((_, i) => {
          const left = (i * 53) % 100;
          const top = (i * 29) % 100;
          const size = (i % 4) + 1;
          const delay = (i % 7) * 0.6;
          return (
            <span
              key={i}
              className="absolute rounded-full animate-pulse"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                background: active.color,
                boxShadow: `0 0 ${4 + size * 2}px ${active.color}`,
                opacity: 0.35 + (i % 3) * 0.15,
                animationDelay: `${delay}s`,
                animationDuration: `${2.5 + (i % 4) * 0.6}s`,
                transition: 'background 0.7s ease, box-shadow 0.7s ease',
              }}
            />
          );
        })}
      </div>

      {/* Header */}
      <header className="relative z-20 px-6 pt-8 pb-3 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <span
            className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.25em] border"
            style={{
              background: active.bg,
              color: active.color,
              borderColor: `${active.color}66`,
              boxShadow: `0 0 14px ${active.glow}`,
            }}
          >
            ✦ Irk Seçimi
          </span>
        </div>
        <h1 className="text-2xl md:text-4xl font-black tracking-tight">
          <span className="text-text-primary">Hangi Irk</span>{' '}
          <span
            className="transition-colors duration-500"
            style={{ color: active.color, textShadow: `0 0 24px ${active.glow}` }}
          >
            Sen Olacaksın?
          </span>
        </h1>
        <p className="mt-2 text-text-muted text-xs md:text-sm">
          Her ırkın kendi lore&apos;u, savaş biçimi ve komutanları var
        </p>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row gap-4 px-4 lg:px-6 pb-6 min-h-0">
        {/* Left: race tabs */}
        <nav
          className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible lg:w-60 shrink-0 pb-1 lg:pb-0"
          aria-label="Irk seçici"
        >
          {RACES.map((race) => {
            const isSelected = selectedId === race.id;
            const isActive = activeId === race.id;
            return (
              <button
                key={race.id}
                onClick={() => setSelectedId(race.id)}
                onMouseEnter={() => setHoveredId(race.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(race.id)}
                onBlur={() => setHoveredId(null)}
                aria-pressed={isSelected}
                className="speed-lines-hover relative shrink-0 lg:w-full text-left rounded-xl border px-4 py-3 flex items-center gap-3 transition-all duration-300 outline-none focus-visible:ring-2"
                style={{
                  background: isSelected
                    ? race.bg
                    : isActive
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(255,255,255,0.02)',
                  borderColor: isSelected
                    ? race.color
                    : isActive
                    ? `${race.color}55`
                    : 'rgba(255,255,255,0.08)',
                  boxShadow: isSelected
                    ? `0 0 24px ${race.glow}, inset 0 0 0 1px ${race.color}33`
                    : 'none',
                  transform: isSelected ? 'scale(1.015)' : 'scale(1)',
                }}
              >
                <span
                  className="text-xl leading-none w-7 text-center transition-all duration-300"
                  style={{
                    color: isSelected || isActive ? race.color : 'var(--color-text-secondary)',
                    textShadow: isSelected ? `0 0 10px ${race.glow}` : 'none',
                  }}
                >
                  {race.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-extrabold tracking-wide truncate"
                    style={{
                      color: isSelected
                        ? race.color
                        : isActive
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-secondary)',
                    }}
                  >
                    {race.name}
                  </div>
                  <div className="text-[10px] text-text-muted truncate">{race.subtitle}</div>
                </div>
                {isSelected && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: race.color, boxShadow: `0 0 8px ${race.color}` }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Center: portrait */}
        <section className="relative flex-1 min-h-[320px] lg:min-h-0 flex items-end justify-center overflow-hidden rounded-2xl border"
          style={{
            borderColor: `${active.color}22`,
            background:
              'linear-gradient(180deg, rgba(13,16,32,0.4) 0%, rgba(7,9,15,0.85) 100%)',
          }}
        >
          {/* Floor glow */}
          <div
            className="absolute inset-x-0 bottom-0 h-2/3 transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse 60% 100% at 50% 100%, ${active.glow} 0%, transparent 70%)`,
            }}
            aria-hidden
          />

          {/* Manga corner accents */}
          <CornerAccent position="top-left" color={active.color} />
          <CornerAccent position="top-right" color={active.color} />
          <CornerAccent position="bottom-left" color={active.color} />
          <CornerAccent position="bottom-right" color={active.color} />

          {/* Portrait */}
          <div
            key={active.id}
            className="relative h-[55vh] lg:h-[78vh] w-full max-w-md flex items-end justify-center animate-[fadeInUp_0.55s_ease_both]"
          >
            {!imgError[active.id] ? (
              <Image
                src={active.primaryPortrait}
                alt={`${active.name} komutanı`}
                fill
                priority
                className="object-contain object-bottom"
                sizes="(max-width: 1024px) 90vw, 480px"
                onError={() => setImgError((p) => ({ ...p, [active.id]: true }))}
                style={{
                  filter: `drop-shadow(0 0 36px ${active.glow}) drop-shadow(0 12px 24px rgba(0,0,0,0.7))`,
                }}
              />
            ) : (
              <div
                className="w-44 h-44 rounded-full flex items-center justify-center text-7xl"
                style={{
                  background: active.bg,
                  border: `2px solid ${active.color}`,
                  filter: `drop-shadow(0 0 28px ${active.glow})`,
                  color: active.color,
                }}
              >
                {active.icon}
              </div>
            )}
          </div>

          {/* Race name plate at bottom */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
            <div className="manga-label mb-0.5 transition-colors duration-500" style={{ letterSpacing: '0.4em', opacity: 0.8 }}>
              {active.subtitle}
            </div>
            <div
              className="manga-title transition-colors duration-500"
              style={{ fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)', color: active.color, textShadow: `0 0 18px ${active.glow}` }}
            >
              {active.name.toUpperCase()}
            </div>
          </div>
        </section>

        {/* Right: info panel */}
        <aside
          className="relative lg:w-[22rem] shrink-0 flex flex-col rounded-2xl border p-5 lg:p-6 overflow-y-auto"
          style={{
            borderColor: `${active.color}22`,
            background:
              'linear-gradient(180deg, rgba(13,16,32,0.85) 0%, rgba(13,16,32,0.6) 100%)',
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.03), 0 0 32px ${active.glow}`,
          }}
        >
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.25em] border"
                style={{
                  background: active.bg,
                  color: active.color,
                  borderColor: `${active.color}55`,
                }}
              >
                {active.name}
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
                Lore Profili
              </span>
            </div>
            <h2
              className="text-2xl font-black tracking-tight transition-colors duration-500"
              style={{ color: active.color, textShadow: `0 0 18px ${active.glow}` }}
            >
              {active.name}
            </h2>
            <p className="text-text-muted text-xs mt-0.5">{active.subtitle}</p>
          </div>

          {/* Lore in a manga-style panel */}
          <div
            className="relative mb-5 p-4 rounded-lg"
            style={{
              background: 'rgba(0,0,0,0.35)',
              border: `1px solid ${active.color}33`,
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.02)`,
            }}
          >
            <div
              className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2"
              style={{ borderColor: active.color }}
            />
            <div
              className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2"
              style={{ borderColor: active.color }}
            />
            <div
              className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2"
              style={{ borderColor: active.color }}
            />
            <div
              className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2"
              style={{ borderColor: active.color }}
            />
            <p className="text-text-secondary text-xs leading-relaxed">{active.lore}</p>
          </div>

          {/* Stats */}
          <div className="mb-5">
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-text-muted mb-3 font-semibold">
              Savaş İstatistikleri
            </h3>
            <div className="space-y-3">
              {STAT_LABELS.map(({ key, label }) => (
                <StatBar
                  key={key}
                  label={label}
                  value={active.stats[key]}
                  color={active.color}
                />
              ))}
            </div>
          </div>

          {/* Commanders preview */}
          <div className="mb-6">
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-text-muted mb-3 font-semibold">
              Komutanlar ({active.commanders.length})
            </h3>
            <div className="flex gap-2 flex-wrap">
              {active.commanders.map((cmd) => (
                <div
                  key={cmd.id}
                  className="relative w-12 h-12 rounded-lg overflow-hidden border"
                  style={{ borderColor: `${active.color}55`, background: active.bg }}
                  title={cmd.name}
                >
                  {!imgError[cmd.id] ? (
                    <Image
                      src={cmd.portrait}
                      alt={cmd.name}
                      fill
                      sizes="48px"
                      className="object-cover object-top"
                      onError={() => setImgError((p) => ({ ...p, [cmd.id]: true }))}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-base font-bold"
                      style={{ color: active.color }}
                    >
                      {cmd.name[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-auto pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => router.push(`/?race=${selected.id}`)}
              className="w-full py-3 px-4 rounded-xl font-extrabold text-sm tracking-wider uppercase transition-all duration-200 hover:brightness-110 active:scale-[0.99] outline-none focus-visible:ring-2"
              style={{
                background: `linear-gradient(135deg, ${selected.color}cc 0%, ${selected.color} 100%)`,
                color: '#07090f',
                boxShadow: `0 6px 28px ${selected.glow}, inset 0 1px 0 rgba(255,255,255,0.4)`,
              }}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <span>{selected.name} ile Başla</span>
                <span aria-hidden>→</span>
              </span>
            </button>
            <p className="text-[10px] text-text-muted text-center mt-2 tracking-wide">
              Seçimini onaylamak için tıkla
            </p>
          </div>
        </aside>
      </main>

      <style jsx>{`
        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function CornerAccent({
  position,
  color,
}: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  color: string;
}) {
  const styles: Record<typeof position, React.CSSProperties> = {
    'top-left': { top: 8, left: 8, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
    'top-right': { top: 8, right: 8, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
    'bottom-left': { bottom: 8, left: 8, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
    'bottom-right': { bottom: 8, right: 8, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` },
  };
  return (
    <span
      className="absolute w-5 h-5 pointer-events-none transition-all duration-500"
      style={{ ...styles[position], boxShadow: `0 0 8px ${color}88` }}
      aria-hidden
    />
  );
}
