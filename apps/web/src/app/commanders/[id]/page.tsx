'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COMMANDERS, RACE_THEMES, Commander, RaceTheme } from '../data';
import { SLOT_META, SLOT_ORDER } from '@/types/equipment';

/* ── Skill tree configuration ─────────────────────────────────────────────── */
const SKILL_LEVEL_GATES = [1, 3, 5, 7] as const;

/* ── XP required per level ────────────────────────────────────────────────── */
function xpForLevel(level: number) {
  return level * 100 + (level - 1) * 50;
}

type Tab = 'hikaye' | 'yetenekler' | 'ekipman' | 'guclendir';

export default function CommanderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const commander = COMMANDERS.find((c) => c.id === params.id);
  if (!commander) notFound();

  return <CommanderDetail commander={commander} />;
}

function CommanderDetail({ commander }: { commander: Commander }) {
  const theme = RACE_THEMES[commander.race];
  const locked = !commander.isUnlocked;

  const [imgError, setImgError] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('hikaye');
  const [currentLevel, setCurrentLevel] = useState(commander.level);
  const [currentXp, setCurrentXp] = useState(Math.floor(xpForLevel(commander.level) * 0.45));

  const xpNeeded = xpForLevel(currentLevel + 1);
  const xpPercent = Math.min(100, Math.round((currentXp / xpNeeded) * 100));

  function handleSpendXp() {
    const gain = 30;
    const newXp = currentXp + gain;
    if (newXp >= xpNeeded) {
      setCurrentLevel((l) => l + 1);
      setCurrentXp(newXp - xpNeeded);
    } else {
      setCurrentXp(newXp);
    }
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'hikaye',    label: 'Hikaye',      icon: '📖' },
    { id: 'yetenekler', label: 'Yetenekler', icon: '⚡' },
    { id: 'ekipman',   label: 'Ekipman',     icon: '⚔️' },
    { id: 'guclendir', label: 'Güçlendir',   icon: '🔥' },
  ];

  return (
    <div
      className="h-dvh flex flex-col overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Background glow */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 0%, ${theme.glowColor} 0%, transparent 65%)`,
        }}
      />

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header
        className="relative z-20 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          background: 'var(--color-bg-overlay)',
          borderColor: 'var(--color-border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Link
          href="/commanders"
          className="flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span aria-hidden>←</span>
          <span>Komutanlar</span>
        </Link>
        <div
          className="h-4 w-px"
          style={{ background: 'var(--color-border)' }}
        />
        <span
          className="text-xs font-display font-bold uppercase tracking-wider"
          style={{ color: theme.color }}
        >
          {theme.icon} {theme.name}
        </span>
        <div className="ml-auto">
          <span
            className="badge text-[10px] font-display font-bold"
            style={{
              background: 'rgba(255,200,50,0.15)',
              color: 'var(--color-energy)',
              border: '1px solid rgba(255,200,50,0.4)',
            }}
          >
            Lv {currentLevel}
          </span>
        </div>
      </header>

      {/* ── Hero portrait ───────────────────────────────────── */}
      <div className="relative z-10 shrink-0">
        <div
          className="relative mx-auto max-w-lg"
          style={{
            aspectRatio: '3 / 4',
            maxHeight: '60vh',
            border: `3px solid ${theme.color}`,
            boxShadow: `0 0 0 1px ${theme.color}44, 0 0 60px ${theme.glowColor}, inset 0 0 40px ${theme.color}11`,
            overflow: 'hidden',
          }}
        >
          {/* Manga corner cuts */}
          <MangaCorners color={theme.color} />

          {imgError ? (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-4"
              style={{ background: theme.bgTint }}
            >
              <span className="text-8xl">{theme.icon}</span>
              <span
                className="font-display text-sm font-bold uppercase tracking-widest"
                style={{ color: theme.color }}
              >
                {commander.name}
              </span>
            </div>
          ) : (
            <Image
              src={commander.portrait}
              alt={commander.name}
              fill
              sizes="(min-width: 768px) 512px, 100vw"
              className={[
                'object-cover object-top',
                locked ? 'grayscale brightness-50' : '',
              ].join(' ')}
              onError={() => setImgError(true)}
              priority
            />
          )}

          {/* Gradient overlay (bottom) */}
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: '55%',
              background: `linear-gradient(to top, var(--color-bg) 0%, ${theme.color}18 40%, transparent 100%)`,
            }}
          />

          {/* Scan-line effect */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 4px)',
            }}
          />

          {/* Lock overlay */}
          {locked && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{
                background: 'rgba(7,9,15,0.65)',
                backdropFilter: 'blur(3px)',
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2"
                style={{
                  background: 'rgba(7,9,15,0.8)',
                  borderColor: 'rgba(255,200,50,0.6)',
                  boxShadow: '0 0 32px rgba(255,200,50,0.35)',
                }}
              >
                🔒
              </div>
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-energy">
                Kilitli Komutan
              </span>
            </div>
          )}

          {/* Name block */}
          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className="badge text-[10px] font-display font-bold uppercase tracking-wider"
                style={{
                  background: theme.bgTint,
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
              >
                Seviye {currentLevel}
              </span>
              {commander.traits.map((t) => (
                <span
                  key={t}
                  className="badge text-[10px] font-display font-bold uppercase tracking-wider"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            <h1
              className="font-display text-4xl font-black leading-none"
              style={{
                color: 'var(--color-text-primary)',
                textShadow: `0 0 32px ${theme.glowColor}, 0 2px 4px rgba(0,0,0,0.9)`,
              }}
            >
              {commander.name}
            </h1>
            <div
              className="mt-1 text-[11px] font-display font-bold uppercase tracking-[0.22em]"
              style={{ color: theme.color }}
            >
              {theme.subtitle}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div
        className="relative z-20 sticky top-0 flex border-b"
        style={{
          background: 'var(--color-bg-overlay)',
          borderColor: 'var(--color-border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-display font-bold uppercase tracking-wider transition-colors"
              style={{
                color: active ? theme.color : 'var(--color-text-muted)',
                borderBottom: active
                  ? `2px solid ${theme.color}`
                  : '2px solid transparent',
                background: active ? theme.bgTint : 'transparent',
                boxShadow: active
                  ? `inset 0 -1px 0 ${theme.color}`
                  : 'none',
              }}
            >
              <span aria-hidden className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ─────────────────────────────────────── */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-5 pb-10">

          {/* ── Hikaye tab ─────────────────────────────────── */}
          {activeTab === 'hikaye' && (
            <>
              <section
                className="cinematic-panel rounded-xl p-5"
                style={{
                  border: `2px solid ${theme.color}40`,
                  boxShadow: `0 0 24px ${theme.color}18`,
                }}
              >
                <div
                  className="text-[9px] font-display font-bold uppercase tracking-[0.25em] mb-3"
                  style={{ color: theme.color }}
                >
                  ◈ Komutan Hikayesi
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {commander.story}
                </p>
              </section>

              <section>
                <div
                  className="text-[9px] font-display font-bold uppercase tracking-[0.25em] mb-3"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Özellikler
                </div>
                <div className="flex flex-wrap gap-2">
                  {commander.traits.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1.5 rounded-full text-[11px] font-display font-bold uppercase tracking-wider"
                      style={{
                        background: theme.bgTint,
                        color: theme.color,
                        border: `1px solid ${theme.color}55`,
                        boxShadow: `0 0 10px ${theme.color}22`,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </section>

              {/* Race stats */}
              <section
                className="rounded-xl p-5 border"
                style={{
                  background: 'var(--color-bg-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div
                  className="text-[9px] font-display font-bold uppercase tracking-[0.25em] mb-4"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Savaş İstatistikleri
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Saldırı', value: commander.level * 12 + 40, max: 150, icon: '⚔' },
                    { label: 'Savunma', value: commander.level * 8 + 30, max: 150, icon: '🛡' },
                    { label: 'Hız', value: commander.level * 6 + 25, max: 150, icon: '💨' },
                    { label: 'Can', value: commander.level * 20 + 100, max: 400, icon: '❤' },
                  ].map((stat) => (
                    <div key={stat.label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] font-display font-bold uppercase tracking-wide"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {stat.icon} {stat.label}
                        </span>
                        <span
                          className="text-[11px] font-display font-black"
                          style={{ color: theme.color }}
                        >
                          {stat.value}
                        </span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, (stat.value / stat.max) * 100)}%`,
                            background: `linear-gradient(90deg, ${theme.color} 0%, ${theme.color}aa 100%)`,
                            boxShadow: `0 0 6px ${theme.glowColor}`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ── Yetenekler tab ─────────────────────────────── */}
          {activeTab === 'yetenekler' && (
            <SkillTree
              abilities={commander.abilities}
              currentLevel={currentLevel}
              theme={theme}
            />
          )}

          {/* ── Ekipman tab ────────────────────────────────── */}
          {activeTab === 'ekipman' && (
            <EquipmentPanel theme={theme} locked={locked} />
          )}

          {/* ── Güçlendir tab ──────────────────────────────── */}
          {activeTab === 'guclendir' && (
            <UpgradePanel
              commander={commander}
              currentLevel={currentLevel}
              currentXp={currentXp}
              xpNeeded={xpNeeded}
              xpPercent={xpPercent}
              theme={theme}
              locked={locked}
              onSpendXp={handleSpendXp}
            />
          )}

        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Manga corner decoration
 * ──────────────────────────────────────────────────────────────────────────── */
function MangaCorners({ color }: { color: string }) {
  const SIZE = 18;
  const corners = [
    { top: 0, left: 0, transform: 'none' },
    { top: 0, right: 0, transform: 'scaleX(-1)' },
    { bottom: 0, left: 0, transform: 'scaleY(-1)' },
    { bottom: 0, right: 0, transform: 'scale(-1,-1)' },
  ] as const;

  return (
    <>
      {corners.map((style, i) => (
        <svg
          key={i}
          aria-hidden
          className="absolute pointer-events-none z-10"
          style={{ width: SIZE, height: SIZE, ...style }}
          viewBox="0 0 18 18"
        >
          <polyline
            points="18,1 1,1 1,18"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinejoin="miter"
          />
        </svg>
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Skill tree
 * ──────────────────────────────────────────────────────────────────────────── */
function SkillTree({
  abilities,
  currentLevel,
  theme,
}: {
  abilities: string[];
  currentLevel: number;
  theme: RaceTheme;
}) {
  const SKILL_ICONS = ['💥', '⚡', '🌀', '☄️'];
  const SKILL_DESCRIPTIONS = [
    'Temel saldırı yeteneği. İlk seviyeden itibaren kullanılabilir.',
    'Gelişmiş taktik yetenek. Seviye 3\'te açılır.',
    'Güçlü özel beceri. Seviye 5\'te açılır.',
    'Efsanevi nihai yetenek. Seviye 7\'de açılır.',
  ];

  return (
    <div className="space-y-3">
      <div
        className="text-[9px] font-display font-bold uppercase tracking-[0.25em] mb-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Yetenek Ağacı
      </div>

      <div className="relative">
        {/* Vertical connector line */}
        <div
          aria-hidden
          className="absolute left-7 top-10 bottom-10 w-0.5"
          style={{ background: `linear-gradient(to bottom, ${theme.color}80, ${theme.color}10)` }}
        />

        <div className="space-y-4">
          {abilities.map((ability, i) => {
            const gateLevel = SKILL_LEVEL_GATES[i] ?? SKILL_LEVEL_GATES[SKILL_LEVEL_GATES.length - 1];
            const unlocked = currentLevel >= gateLevel;

            return (
              <div key={ability} className="flex gap-4 items-start">
                {/* Node circle */}
                <div
                  className="relative shrink-0 w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-300"
                  style={{
                    background: unlocked ? theme.bgTint : 'rgba(255,255,255,0.02)',
                    borderColor: unlocked ? theme.color : 'rgba(255,255,255,0.12)',
                    boxShadow: unlocked ? `0 0 20px ${theme.glowColor}` : 'none',
                    zIndex: 1,
                  }}
                >
                  <span className="text-xl leading-none">
                    {unlocked ? SKILL_ICONS[i] : '🔒'}
                  </span>
                  <span
                    className="text-[8px] font-display font-black mt-0.5"
                    style={{
                      color: unlocked ? theme.color : 'var(--color-text-muted)',
                    }}
                  >
                    Lv{gateLevel}
                  </span>
                </div>

                {/* Skill card */}
                <div
                  className="flex-1 rounded-xl p-4 border transition-all duration-300"
                  style={{
                    background: unlocked
                      ? `linear-gradient(135deg, ${theme.bgTint} 0%, var(--color-bg-surface) 100%)`
                      : 'var(--color-bg-surface)',
                    borderColor: unlocked ? `${theme.color}55` : 'var(--color-border)',
                    boxShadow: unlocked ? `0 0 16px ${theme.color}18` : 'none',
                    opacity: unlocked ? 1 : 0.5,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="font-display text-sm font-black"
                      style={{ color: unlocked ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                    >
                      {ability}
                    </span>
                    {unlocked ? (
                      <span
                        className="text-[9px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          background: `${theme.color}22`,
                          color: theme.color,
                          border: `1px solid ${theme.color}55`,
                        }}
                      >
                        Açık
                      </span>
                    ) : (
                      <span
                        className="text-[9px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(255,200,50,0.10)',
                          color: 'var(--color-text-muted)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        Lv {gateLevel} gerek
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {SKILL_DESCRIPTIONS[i]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Equipment panel
 * ──────────────────────────────────────────────────────────────────────────── */
function EquipmentPanel({
  theme,
  locked,
}: {
  theme: RaceTheme;
  locked: boolean;
}) {
  return (
    <div className="space-y-4">
      <div
        className="text-[9px] font-display font-bold uppercase tracking-[0.25em] mb-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Ekipman Slotları — 6 slot
      </div>

      <div
        className="rounded-xl p-5 border"
        style={{
          background: 'var(--color-bg-surface)',
          borderColor: `${theme.color}35`,
          boxShadow: `0 0 20px ${theme.color}10`,
        }}
      >
        <div className="grid grid-cols-3 gap-3">
          {SLOT_ORDER.map((slot) => {
            const meta = SLOT_META[slot];
            const isOzel = slot === 'ozel';

            return (
              <button
                key={slot}
                type="button"
                disabled={locked}
                className="relative flex flex-col items-center justify-center gap-1.5 rounded-xl border transition-all duration-200 group"
                style={{
                  height: 84,
                  background: isOzel
                    ? `linear-gradient(135deg, ${theme.bgTint} 0%, rgba(255,255,255,0.02) 100%)`
                    : 'rgba(255,255,255,0.02)',
                  borderColor: isOzel ? `${theme.color}60` : 'rgba(255,255,255,0.08)',
                  borderStyle: locked ? 'dashed' : 'solid',
                  boxShadow: isOzel ? `0 0 12px ${theme.color}18` : 'none',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.5 : 1,
                }}
                aria-label={`${meta.label} slotu — ${locked ? 'kilitli' : 'boş'}`}
              >
                {/* Hover glow */}
                {!locked && (
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{
                      background: `${theme.color}0e`,
                      border: `1px dashed ${theme.color}50`,
                    }}
                  />
                )}

                <span className="text-2xl leading-none">
                  {locked ? '🔒' : meta.icon}
                </span>
                <span
                  className="text-[9px] font-display font-bold uppercase tracking-widest"
                  style={{
                    color: isOzel ? theme.color : 'var(--color-text-muted)',
                  }}
                >
                  {meta.label}
                </span>
                {isOzel && !locked && (
                  <span
                    className="absolute top-1.5 right-1.5 text-[7px] font-display font-black uppercase tracking-wider px-1 py-0.5 rounded"
                    style={{
                      background: `${theme.color}22`,
                      color: theme.color,
                      border: `1px solid ${theme.color}44`,
                    }}
                  >
                    Özel
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p
          className="mt-4 text-center text-[10px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {locked
            ? 'Ekipman slotlarına erişmek için komutanı kilidi açın.'
            : 'Bir slota tıklayarak ekipman ekleyin veya değiştirin.'}
        </p>
      </div>

      {/* Equipment slot legend */}
      <div
        className="rounded-xl p-4 border"
        style={{
          background: 'var(--color-bg-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="text-[9px] font-display font-bold uppercase tracking-[0.25em] mb-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Nadir Seviyeleri
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Sıradan', color: '#888888' },
            { label: 'Yaygın', color: '#44ff88' },
            { label: 'Nadir', color: '#4488ff' },
            { label: 'Destansı', color: '#cc00ff' },
            { label: 'Efsanevi', color: '#ffc832' },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: r.color, boxShadow: `0 0 6px ${r.color}88` }}
              />
              <span
                className="text-[10px] font-display font-bold"
                style={{ color: r.color }}
              >
                {r.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Upgrade panel
 * ──────────────────────────────────────────────────────────────────────────── */
function UpgradePanel({
  commander,
  currentLevel,
  currentXp,
  xpNeeded,
  xpPercent,
  theme,
  locked,
  onSpendXp,
}: {
  commander: Commander;
  currentLevel: number;
  currentXp: number;
  xpNeeded: number;
  xpPercent: number;
  theme: RaceTheme;
  locked: boolean;
  onSpendXp: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Level display */}
      <div
        className="rounded-xl p-5 border flex items-center gap-5"
        style={{
          background: `linear-gradient(135deg, ${theme.bgTint} 0%, var(--color-bg-surface) 100%)`,
          borderColor: `${theme.color}55`,
          boxShadow: `0 0 24px ${theme.color}18`,
        }}
      >
        <div
          className="w-20 h-20 rounded-full flex flex-col items-center justify-center border-2 shrink-0"
          style={{
            background: 'var(--color-bg)',
            borderColor: theme.color,
            boxShadow: `0 0 28px ${theme.glowColor}`,
          }}
        >
          <span
            className="font-display text-2xl font-black leading-none"
            style={{ color: theme.color }}
          >
            {currentLevel}
          </span>
          <span
            className="text-[8px] font-display font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Seviye
          </span>
        </div>
        <div className="flex-1">
          <div
            className="font-display text-base font-black mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {commander.name}
          </div>
          <div
            className="text-[10px] font-display font-bold uppercase tracking-wider mb-3"
            style={{ color: theme.color }}
          >
            {theme.name} Komutanı
          </div>
          {/* XP bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span
                className="text-[9px] font-display font-bold uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Deneyim
              </span>
              <span
                className="text-[10px] font-display font-bold"
                style={{ color: 'var(--color-energy)' }}
              >
                {currentXp} / {xpNeeded} XP
              </span>
            </div>
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${xpPercent}%`,
                  background: `linear-gradient(90deg, var(--color-energy) 0%, ${theme.color} 100%)`,
                  boxShadow: '0 0 8px rgba(255,200,50,0.5)',
                }}
              />
            </div>
            <div
              className="text-right text-[9px] font-display font-bold"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {xpPercent}% tamamlandı
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade action */}
      <div
        className="rounded-xl p-5 border space-y-4"
        style={{
          background: 'var(--color-bg-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="text-[9px] font-display font-bold uppercase tracking-[0.25em]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Güçlendirme
        </div>

        {/* Next level preview */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Mevcut Saldırı', now: currentLevel * 12 + 40, next: (currentLevel + 1) * 12 + 40, icon: '⚔' },
            { label: 'Mevcut Savunma', now: currentLevel * 8 + 30, next: (currentLevel + 1) * 8 + 30, icon: '🛡' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-3 border"
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderColor: 'rgba(255,255,255,0.07)',
              }}
            >
              <div
                className="text-[9px] font-display font-bold uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {stat.icon} {stat.label.replace('Mevcut ', '')}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="font-display text-base font-black"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {stat.now}
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  →
                </span>
                <span
                  className="font-display text-base font-black"
                  style={{ color: theme.color }}
                >
                  {stat.next}
                </span>
                <span
                  className="text-[9px] font-display font-bold"
                  style={{ color: 'var(--color-success)' }}
                >
                  +{stat.next - stat.now}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* XP spend button */}
        <button
          type="button"
          onClick={onSpendXp}
          disabled={locked}
          className="w-full py-3.5 rounded-xl font-display font-black uppercase tracking-[0.18em] text-sm transition-all active:scale-[0.98]"
          style={{
            background: locked
              ? 'rgba(255,200,50,0.12)'
              : `linear-gradient(135deg, var(--color-energy) 0%, ${theme.color} 100%)`,
            color: locked ? 'var(--color-text-muted)' : 'var(--color-text-inverse)',
            border: locked
              ? '1px solid rgba(255,200,50,0.3)'
              : `1px solid ${theme.color}`,
            boxShadow: locked
              ? 'none'
              : `0 0 28px ${theme.glowColor}, 0 4px 12px rgba(0,0,0,0.4)`,
            cursor: locked ? 'not-allowed' : 'pointer',
          }}
        >
          {locked ? '🔒  Kilidi Aç' : '⬆  30 XP Harca — Güçlendir'}
        </button>

        {!locked && (
          <p
            className="text-center text-[10px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Bir sonraki seviye için {xpNeeded - currentXp} XP daha gerekiyor.
          </p>
        )}
      </div>

      {/* Milestone rewards */}
      <div
        className="rounded-xl p-5 border"
        style={{
          background: 'var(--color-bg-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="text-[9px] font-display font-bold uppercase tracking-[0.25em] mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Seviye Ödülleri
        </div>
        <div className="space-y-2">
          {[
            { level: 3, reward: 'Yetenek Kilit Açılır', icon: '⚡' },
            { level: 5, reward: 'Ekipman Slotu Açılır', icon: '⚔️' },
            { level: 7, reward: 'Nihai Yetenek Açılır', icon: '☄️' },
            { level: 10, reward: 'Efsanevi Yetki', icon: '👑' },
          ].map((milestone) => {
            const reached = currentLevel >= milestone.level;
            return (
              <div
                key={milestone.level}
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{
                  background: reached ? `${theme.bgTint}` : 'rgba(255,255,255,0.01)',
                  borderColor: reached ? `${theme.color}40` : 'rgba(255,255,255,0.05)',
                  opacity: reached ? 1 : 0.55,
                }}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 border"
                  style={{
                    background: reached ? theme.bgTint : 'rgba(255,255,255,0.03)',
                    borderColor: reached ? theme.color : 'rgba(255,255,255,0.08)',
                  }}
                >
                  {milestone.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[10px] font-display font-bold"
                    style={{ color: reached ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                  >
                    {milestone.reward}
                  </div>
                </div>
                <span
                  className="badge text-[9px] font-display font-bold shrink-0"
                  style={{
                    background: reached
                      ? `${theme.color}22`
                      : 'rgba(255,200,50,0.08)',
                    color: reached ? theme.color : 'var(--color-text-muted)',
                    border: reached
                      ? `1px solid ${theme.color}44`
                      : '1px solid rgba(255,200,50,0.2)',
                  }}
                >
                  Lv {milestone.level}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
