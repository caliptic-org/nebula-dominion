'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  COMMANDERS,
  Commander,
  CommanderRace,
  RACE_ORDER,
  RACE_THEMES,
} from './data';

type Filter = 'all' | CommanderRace;

export default function CommandersPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string>(COMMANDERS[0].id);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});
  const [showLockedOnly, setShowLockedOnly] = useState(false);

  const visible = useMemo(() => {
    return COMMANDERS.filter((c) => {
      if (filter !== 'all' && c.race !== filter) return false;
      if (showLockedOnly && c.isUnlocked) return false;
      return true;
    });
  }, [filter, showLockedOnly]);

  const selected =
    COMMANDERS.find((c) => c.id === selectedId) ?? visible[0] ?? COMMANDERS[0];
  const selectedTheme = RACE_THEMES[selected.race];

  const totalUnlocked = COMMANDERS.filter((c) => c.isUnlocked).length;

  return (
    <div className="commanders-screen h-dvh flex flex-col text-text-primary overflow-hidden">
      <div className="commanders-bg" aria-hidden />
      <div className="commanders-halftone" aria-hidden />

      {/* Dynamic race-ambient glow — shifts when selected commander changes */}
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 65% 45% at 75% 55%, ${selectedTheme.glowColor} 0%, transparent 60%)`,
          transition: 'background 0.7s cubic-bezier(0.32,0.72,0,1)',
          opacity: 0.6,
        }}
      />

      {/* ── Top bar ────────────────────────────────────── */}
      <header className="relative z-20 flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border bg-bg-overlay backdrop-blur-md">
        <Link
          href="/"
          className="text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
        >
          <span aria-hidden>←</span>
          <span>Ana Üs</span>
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-baseline gap-2">
          <h1 className="manga-title" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
            Komutanlar
          </h1>
          <span className="text-[11px] text-text-muted">
            {totalUnlocked} / {COMMANDERS.length} açık
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowLockedOnly((v) => !v)}
            className={[
              'px-3 py-1.5 rounded-full text-[11px] font-display font-bold uppercase tracking-wider transition-colors border',
              showLockedOnly
                ? 'border-energy/60 bg-energy-dim text-energy'
                : 'border-border text-text-muted hover:text-text-primary hover:border-border-hover',
            ].join(' ')}
          >
            {showLockedOnly ? 'Sadece kilitli' : 'Hepsini göster'}
          </button>

          <RaceFilter filter={filter} onChange={setFilter} />
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Grid */}
        <section className="flex-1 overflow-y-auto p-4 sm:p-6">
          {visible.length === 0 ? (
            <div className="text-center py-20 text-text-muted text-sm">
              Bu filtreye uyan komutan yok.
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((cmd) => (
                <CommanderCard
                  key={cmd.id}
                  commander={cmd}
                  selected={cmd.id === selected.id}
                  onSelect={() => setSelectedId(cmd.id)}
                  hasError={!!imgError[cmd.id]}
                  onImgError={() =>
                    setImgError((prev) => ({ ...prev, [cmd.id]: true }))
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Detail panel */}
        <aside
          className="lg:w-[360px] xl:w-[400px] shrink-0 border-t lg:border-t-0 lg:border-l border-border backdrop-blur-md overflow-y-auto"
          style={
            {
              background: `linear-gradient(180deg, color-mix(in srgb, ${selectedTheme.color} 5%, rgba(13,16,32,0.78)) 0%, rgba(8,10,16,0.82) 40%)`,
              boxShadow: `inset 1px 0 0 ${selectedTheme.borderColor}`,
              transition: 'background 0.55s cubic-bezier(0.32,0.72,0,1)',
            } as React.CSSProperties
          }
        >
          <DetailPanel
            commander={selected}
            hasError={!!imgError[selected.id]}
            onImgError={() =>
              setImgError((prev) => ({ ...prev, [selected.id]: true }))
            }
          />
        </aside>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * Race filter
 * ───────────────────────────────────────────────────────── */
function RaceFilter({
  filter,
  onChange,
}: {
  filter: Filter;
  onChange: (f: Filter) => void;
}) {
  const items: { id: Filter; label: string; icon: string; color?: string }[] = [
    { id: 'all', label: 'Tümü', icon: '✦' },
    ...RACE_ORDER.map((r) => ({
      id: r as Filter,
      label: RACE_THEMES[r].name,
      icon: RACE_THEMES[r].icon,
      color: RACE_THEMES[r].color,
    })),
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {items.map((item) => {
        const active = item.id === filter;
        const accent = item.color ?? 'var(--color-brand)';
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-display font-bold uppercase tracking-wider transition-all border"
            style={{
              borderColor: active ? accent : 'var(--color-border)',
              background: active
                ? `color-mix(in srgb, ${accent} 14%, transparent)`
                : 'transparent',
              color: active ? accent : 'var(--color-text-muted)',
              boxShadow: active ? `0 0 12px ${accent}55` : 'none',
            }}
          >
            <span aria-hidden>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * Commander card
 * ───────────────────────────────────────────────────────── */
function CommanderCard({
  commander,
  selected,
  onSelect,
  hasError,
  onImgError,
}: {
  commander: Commander;
  selected: boolean;
  onSelect: () => void;
  hasError: boolean;
  onImgError: () => void;
}) {
  const theme = RACE_THEMES[commander.race];
  const locked = !commander.isUnlocked;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        'commander-card group relative text-left rounded-xl overflow-hidden border transition-all duration-200 focus:outline-none focus-visible:ring-2',
        'speed-lines-hover',
        selected ? 'is-selected ink-border-race' : 'hover:-translate-y-0.5',
      ].join(' ')}
      style={
        {
          background: 'var(--color-bg-surface)',
          borderColor: selected ? theme.color : 'var(--color-border)',
          boxShadow: selected
            ? `0 0 0 1px ${theme.color}, 0 0 28px ${theme.glowColor}`
            : '0 4px 16px rgba(0,0,0,0.35)',
          ['--race-color' as any]: theme.color,
          ['--race-glow' as any]: theme.glowColor,
          ['--race-tint' as any]: theme.bgTint,
        } as React.CSSProperties
      }
    >
      {/* Portrait */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {hasError ? (
          <div
            className="w-full h-full flex items-center justify-center text-5xl"
            style={{ background: theme.bgTint, color: theme.color }}
          >
            {theme.icon}
          </div>
        ) : (
          <Image
            src={commander.portrait}
            alt={commander.name}
            fill
            sizes="(min-width: 1280px) 220px, (min-width: 768px) 30vw, 50vw"
            className={[
              'object-cover object-top transition-transform duration-500',
              locked ? 'grayscale brightness-50' : 'group-hover:scale-105',
            ].join(' ')}
            onError={onImgError}
          />
        )}

        {/* Race color wash on hover */}
        <div
          className="commander-card__wash absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `linear-gradient(180deg, transparent 30%, ${theme.color}22 70%, ${theme.color}55 100%)`,
            opacity: selected ? 1 : 0,
          }}
        />

        {/* Bottom gradient for label legibility */}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, rgba(7,9,15,0.85) 75%, rgba(7,9,15,0.95) 100%)',
          }}
        />

        {/* Race + Level badges (top) */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
          <span
            className="badge text-[10px] font-display font-bold uppercase tracking-wider"
            style={{
              background: `color-mix(in srgb, ${theme.color} 18%, transparent)`,
              color: theme.color,
              border: `1px solid ${theme.color}55`,
              backdropFilter: 'blur(6px)',
            }}
          >
            <span className="mr-1" aria-hidden>{theme.icon}</span>
            {theme.name}
          </span>
          <span
            className="badge text-[10px] font-display font-bold"
            style={{
              background: 'rgba(255,200,50,0.15)',
              color: 'var(--color-energy)',
              border: '1px solid rgba(255,200,50,0.4)',
              backdropFilter: 'blur(6px)',
            }}
            title="Seviye"
          >
            Lv {commander.level}
          </span>
        </div>

        {/* Lock overlay */}
        {locked && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{
              background:
                'linear-gradient(180deg, rgba(7,9,15,0.55) 0%, rgba(7,9,15,0.78) 100%)',
              backdropFilter: 'blur(2px)',
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2"
              style={{
                background: 'rgba(7,9,15,0.7)',
                borderColor: 'rgba(255,200,50,0.6)',
                color: 'var(--color-energy)',
                boxShadow: '0 0 24px rgba(255,200,50,0.35)',
              }}
              aria-hidden
            >
              🔒
            </div>
            <span className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-energy">
              Kilitli
            </span>
          </div>
        )}

        {/* Name + traits */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div
            className="font-display font-black text-lg leading-tight"
            style={{
              color: 'var(--color-text-primary)',
              textShadow: `0 1px 2px rgba(0,0,0,0.8), 0 0 18px ${theme.glowColor}`,
            }}
          >
            {commander.name}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {commander.traits.map((t) => (
              <span
                key={t}
                className="text-[9px] font-display font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────
 * Detail panel
 * ───────────────────────────────────────────────────────── */
function DetailPanel({
  commander,
  hasError,
  onImgError,
}: {
  commander: Commander;
  hasError: boolean;
  onImgError: () => void;
}) {
  const theme = RACE_THEMES[commander.race];
  const locked = !commander.isUnlocked;

  return (
    <div className="flex flex-col">
      {/* Hero portrait */}
      <div className="relative h-72 sm:h-80 overflow-hidden">
        {hasError ? (
          <div
            className="w-full h-full flex items-center justify-center text-7xl"
            style={{ background: theme.bgTint, color: theme.color }}
          >
            {theme.icon}
          </div>
        ) : (
          <Image
            src={commander.portrait}
            alt={commander.name}
            fill
            sizes="(min-width: 1280px) 400px, (min-width: 1024px) 360px, 100vw"
            className={[
              'object-cover object-top',
              locked ? 'grayscale brightness-60' : '',
            ].join(' ')}
            onError={onImgError}
            priority
          />
        )}

        {/* Bottom gradient */}
        <div
          className="absolute inset-x-0 bottom-0 h-3/4 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, rgba(13,16,32,0.6) 50%, var(--color-bg-surface) 100%)',
          }}
        />

        {/* Side glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: `inset 0 -1px 0 ${theme.color}55, inset 0 0 80px ${theme.color}22`,
          }}
        />

        {/* Title block */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="badge text-[10px] font-display font-bold uppercase tracking-wider"
              style={{
                background: theme.bgTint,
                color: theme.color,
                border: `1px solid ${theme.color}55`,
              }}
            >
              <span className="mr-1" aria-hidden>{theme.icon}</span>
              {theme.name}
            </span>
            <span
              className="badge text-[10px] font-display font-bold"
              style={{
                background: 'rgba(255,200,50,0.15)',
                color: 'var(--color-energy)',
                border: '1px solid rgba(255,200,50,0.4)',
              }}
            >
              Seviye {commander.level}
            </span>
            {locked && (
              <span
                className="badge text-[10px] font-display font-bold uppercase tracking-wider"
                style={{
                  background: 'rgba(255,68,68,0.12)',
                  color: 'var(--color-danger)',
                  border: '1px solid rgba(255,68,68,0.4)',
                }}
              >
                Kilitli
              </span>
            )}
          </div>
          <h2
            className="font-display text-3xl font-black leading-tight"
            style={{
              color: 'var(--color-text-primary)',
              textShadow: `0 0 24px ${theme.glowColor}`,
            }}
          >
            {commander.name}
          </h2>
          <div
            className="mt-1 text-xs font-display font-bold uppercase tracking-[0.2em]"
            style={{ color: theme.color }}
          >
            {theme.subtitle}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5">
        {/* Story */}
        <section className="manga-panel rounded-lg p-4">
          <div className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-text-muted mb-2">
            Hikaye
          </div>
          <p className="text-text-secondary text-sm leading-relaxed">
            {commander.story}
          </p>
        </section>

        {/* Traits */}
        <section>
          <div className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-text-muted mb-2">
            Özellikler
          </div>
          <div className="flex flex-wrap gap-2">
            {commander.traits.map((t) => (
              <span
                key={t}
                className="badge text-[11px] font-display font-bold"
                style={{
                  background: theme.bgTint,
                  color: theme.color,
                  border: `1px solid ${theme.color}40`,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* Abilities — condensed skill tree */}
        <section>
          <div className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-text-muted mb-3">
            Yetenek Ağacı
          </div>
          <div className="relative">
            {/* Vertical connector rail */}
            <div
              aria-hidden
              className="absolute left-[13px] top-3 bottom-3 w-px"
              style={{
                background: `linear-gradient(180deg, ${theme.color}80 0%, ${theme.color}10 100%)`,
              }}
            />
            <ul className="space-y-2">
              {commander.abilities.map((ab, i) => {
                const ICONS = ['💥', '⚡', '🌀', '☄️'];
                const isFirst = i === 0;
                return (
                  <li key={ab} className="flex items-center gap-3">
                    {/* Node */}
                    <span
                      className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] shrink-0"
                      style={{
                        background: isFirst ? theme.bgTint : 'rgba(255,255,255,0.04)',
                        color: isFirst ? theme.color : 'var(--color-text-muted)',
                        border: `1px solid ${isFirst ? theme.color + '77' : 'rgba(255,255,255,0.10)'}`,
                        boxShadow: isFirst ? `0 0 10px ${theme.color}44` : 'none',
                      }}
                    >
                      {ICONS[i] ?? ICONS[ICONS.length - 1]}
                    </span>
                    {/* Skill row */}
                    <div
                      className="flex-1 flex items-center gap-2 p-2.5 rounded-lg border"
                      style={{
                        background: isFirst ? `${theme.bgTint}` : 'rgba(20, 24, 44, 0.45)',
                        borderColor: isFirst ? `${theme.color}30` : 'var(--color-border)',
                      }}
                    >
                      <span
                        className="flex-1 text-[12px] font-medium"
                        style={{ color: isFirst ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
                      >
                        {ab}
                      </span>
                      {i > 0 && (
                        <span
                          className="text-[9px] font-display font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            background: 'rgba(255,200,50,0.08)',
                            color: 'var(--color-text-muted)',
                            border: '1px solid rgba(255,200,50,0.15)',
                          }}
                        >
                          Lv {[1,3,5,7][i] ?? 7}+
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* CTAs — Button-in-Button pattern */}
        <div className="flex flex-col gap-2">
          <Link
            href={`/commanders/${commander.id}`}
            className="group flex items-center justify-between w-full py-2.5 pl-5 pr-2.5 rounded-full font-display font-black uppercase tracking-[0.14em] text-[11px] transition-all duration-300"
            style={{
              background: theme.bgTint,
              color: theme.color,
              border: `1px solid ${theme.color}45`,
              boxShadow: `0 0 14px ${theme.color}18`,
            }}
          >
            <span>◈  Detay Sayfası</span>
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px"
              style={{
                background: `${theme.color}22`,
                border: `1px solid ${theme.color}44`,
              }}
            >
              →
            </span>
          </Link>
          <button
            type="button"
            disabled={locked}
            className="group flex items-center justify-between w-full py-2.5 pl-5 pr-2.5 rounded-full font-display font-black uppercase tracking-[0.14em] text-[11px] transition-all duration-300 active:scale-[0.98]"
            style={{
              background: locked
                ? 'rgba(255,200,50,0.12)'
                : `linear-gradient(135deg, ${theme.color} 0%, color-mix(in srgb, ${theme.color} 55%, #000) 100%)`,
              color: locked ? 'var(--color-energy)' : '#07090f',
              border: locked
                ? '1px solid rgba(255,200,50,0.35)'
                : `1px solid ${theme.color}`,
              boxShadow: locked
                ? '0 0 16px rgba(255,200,50,0.20)'
                : `0 0 28px ${theme.glowColor}`,
              cursor: locked ? 'not-allowed' : 'pointer',
              opacity: locked ? 0.85 : 1,
            }}
          >
            <span>{locked ? '🔒  Kilidi Aç' : '⚔  Komutan Seç'}</span>
            {!locked && (
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px"
                style={{ background: 'rgba(0,0,0,0.20)', color: '#07090f' }}
              >
                ✓
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
