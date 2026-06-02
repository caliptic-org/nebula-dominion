'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Caption,
  Chip,
  Code,
  Eyebrow,
  H2,
  H3,
  ND,
  NDButton,
  NebulaBg,
  Panel,
  RACES,
  Sigil,
  toast,
  type NDRace,
  type NDRaceCmdr,
  type NDRaceKey,
} from '@/components/handoff';
import { api, FetchError } from '@/lib/api';
import { useActiveCommander } from '@/hooks/useActiveCommander';

const RACE_KEYS: NDRaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];

type Filter = NDRaceKey | 'all';

interface ScrCommandersProps {
  playerRaceKey: NDRaceKey;
  /** Optional override — when supplied (e.g. from /api/v1/commanders), the
   * roster is built from these entries instead of RACES tokens. Shape mirrors
   * the backend stub: `{ id, name, title, race, level, tier, skill, unlocked }`.
   * The fallback path (no live data) keeps the screen working offline. */
  liveCommanders?: Array<{
    id: string;
    name: string;
    title: string;
    race: NDRaceKey;
    level: number;
    /** XP toward next level. Backend reports this as a number after
     *  bigint-to-number conversion. */
    xp?: number;
    /** XP needed to reach next level (0 at L30). */
    xpToNext?: number;
    tier: string;
    skill: string;
    unlocked: boolean;
    /** True when this commander is currently active for the player.
     *  Backend's source of truth for the AKTİF badge — supersedes the
     *  hook-level useActiveCommander() polling that still runs as
     *  fallback for guest-mode demos. */
    isActive?: boolean;
    /** Portrait path from backend (/assets/characters/<race>/<id>.png).
     *  PNG files already live in apps/web/public/assets/characters/.
     *  Card and detail panel render this as an <img>; onError falls
     *  back to the abstract Sigil so a missing render still produces a
     *  card that looks intentional. */
    portrait?: string;
  }>;
}

interface CommanderEntry extends NDRaceCmdr {
  race: NDRace;
  id: string;
  locked: boolean;
  /** Optional XP fields — populated only when live data flowed in via
   *  liveCommanders (game-server). Static lex fallback leaves them
   *  undefined and the XP bar is suppressed. */
  xp?: number;
  xpToNext?: number;
  /** Path to a portrait PNG (e.g. /assets/characters/insan/voss.png).
   *  When present the card/detail render it instead of the Sigil. */
  portrait?: string;
}

/* Map RACES commander names to the existing commanders/data.ts ID so the
 * detail route (/commanders/[id]) keeps working. New tier-5 locked entries
 * (kthala / lo_khode / korova) were added to data.ts to cover all 20. */
const NAME_TO_DATA_ID: Record<string, string> = {
  // İnsan
  'Kmt. Aleksander Voss':         'voss',
  'Dr. Elara Chen':               'chen',
  'General Marcus Reyes':         'reyes',
  "Lily 'Phantom' Kovacs":        'kovacs',
  // Zerg
  'Ana Kraliçe Vex’thara':        'vex_thara',
  'Genom Üstadı Threnix':         'threnix',
  'Beyin Kurt Mor’gath':          'morgath',
  'Brood-Anne Kthala':            'kthala',
  // Otomat
  'Demiurge Prime':               'demiurge_prime',
  'Mimar Aurelius':               'aurelius',
  'Alg. Şövalye Crucible':        'crucible',
  'Lo-Khode Veri-Mühendis':       'lo_khode',
  // Canavar
  'Alpha Khorvash':               'khorvash',
  'Şaman Ulrek':                  'ulrek',
  'Avcı Kraliçe Ravenna':         'ravenna',
  'Korova, Beast-God Yavru':      'korova',
  // Şeytan
  'Karanlık Lord Malphas':        'malphas',
  'Cadı-Kraliçe Lilithra':        'lilithra',
  'Suikastçı Vorhaal':            'vorhaal',
  'Borç Tahsilcisi Azurath':      'azurath',
};

function commanderId(race: NDRace, cmdr: NDRaceCmdr): string {
  const mapped = NAME_TO_DATA_ID[cmdr.n];
  if (mapped) return mapped;
  const slug = cmdr.n
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${race.key}-${slug}`;
}

function buildRoster(): CommanderEntry[] {
  return RACE_KEYS.flatMap((k) => {
    const race = RACES[k];
    return race.commanders.map<CommanderEntry>((c) => ({
      ...c,
      race,
      id: commanderId(race, c),
      locked: c.skill === 'KİLİT' || c.lv === 0,
    }));
  });
}

function rosterFromLive(
  live: NonNullable<ScrCommandersProps['liveCommanders']>,
): CommanderEntry[] {
  return live.map<CommanderEntry>((c) => {
    const race = RACES[c.race];
    const mappedId = NAME_TO_DATA_ID[c.name];
    return {
      n: c.name,
      t: c.title,
      lv: c.level,
      tier: c.tier as NDRaceCmdr['tier'],
      skill: c.skill,
      race,
      id: mappedId ?? c.id,
      // Live data drives the lock from `unlocked` field; level=0 = not
      // unlocked yet (player_commanders row missing). Bonus / level
      // bar suppressed for locked entries.
      locked: !c.unlocked,
      xp: c.xp,
      xpToNext: c.xpToNext,
      portrait: c.portrait,
    };
  });
}

export function ScrCommanders({ playerRaceKey, liveCommanders }: ScrCommandersProps) {
  const playerRace = RACES[playerRaceKey];
  const [filter, setFilter] = useState<Filter>('all');
  const [showLockedOnly, setShowLockedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Live "currently activated" id from /commanders/me/active. Used to render
  // an AKTİF badge on the matching card and to keep the detail-panel CTA
  // consistent. Hook handles 404 / 401 / guest gracefully → null.
  const { data: activeCommander, refresh: refreshActive } = useActiveCommander();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-race', playerRaceKey);
    }
  }, [playerRaceKey]);

  // Prefer the live roster when the page hands it in (sourced from
  // /api/v1/commanders); otherwise fall back to RACES tokens so the screen
  // still works for guests and during the initial fetch.
  const roster = useMemo(
    () => (liveCommanders && liveCommanders.length > 0 ? rosterFromLive(liveCommanders) : buildRoster()),
    [liveCommanders],
  );
  const visible = useMemo(
    () =>
      roster.filter((c) => {
        if (filter !== 'all' && c.race.key !== filter) return false;
        if (showLockedOnly && !c.locked) return false;
        return true;
      }),
    [roster, filter, showLockedOnly],
  );

  const selected = useMemo(
    () => roster.find((c) => c.id === selectedId) ?? visible[0] ?? roster[0],
    [roster, selectedId, visible],
  );
  const selectedTheme = selected.race;
  const totalUnlocked = roster.filter((c) => !c.locked).length;

  return (
    <div
      data-race={playerRaceKey}
      data-testid="scr-commanders"
      style={{
        position: 'relative',
        height: '100dvh',
        background: ND.bg,
        color: ND.text,
        fontFamily: ND.body,
        overflow: 'hidden',
      }}
    >
      <NebulaBg race={playerRace} intensity={0.85} dim={0.8} />

      {/* Selected race ambient glow */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 65% 45% at 75% 55%, ${selectedTheme.glow}33 0%, transparent 60%)`,
          transition: 'background 700ms cubic-bezier(0.32,0.72,0,1)',
          opacity: 0.7,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            padding: '12px 16px',
            background: 'rgba(6,8,15,0.92)',
            borderBottom: `1px solid ${ND.border}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href="/"
              style={{
                fontFamily: ND.display,
                fontSize: 11,
                letterSpacing: '0.08em',
                color: ND.textDim,
                textDecoration: 'none',
              }}
            >
              ← ANA ÜS
            </Link>
            <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.12)' }} />
            <Chip color={playerRace.primary}>KOMUTANLAR</Chip>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Code style={{ color: playerRace.primary }}>
              {totalUnlocked} / {roster.length} AÇIK
            </Code>
            <Sigil race={playerRace} size={20} />
          </div>
        </header>

        <main
          style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Filter row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              padding: '14px 16px 8px',
              borderBottom: `1px solid ${ND.border}`,
              background: 'rgba(8,10,16,0.55)',
            }}
          >
            <button
              type="button"
              onClick={() => setShowLockedOnly((v) => !v)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '5px 10px',
                fontFamily: ND.display,
                fontSize: 11,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                border: `1px solid ${showLockedOnly ? ND.warn : ND.border}`,
                color: showLockedOnly ? ND.warn : ND.textDim,
                background: showLockedOnly ? `${ND.warn}12` : 'transparent',
                transition: 'all 200ms cubic-bezier(0.32,0.72,0,1)',
              }}
              aria-pressed={showLockedOnly}
            >
              {showLockedOnly ? '🔒 Sadece Kilitli' : 'Hepsi'}
            </button>
            <FilterChip
              active={filter === 'all'}
              color={playerRace.primary}
              onClick={() => setFilter('all')}
              label="Tümü"
            />
            {RACE_KEYS.map((key) => {
              const r = RACES[key];
              const active = filter === key;
              return (
                <FilterChip
                  key={key}
                  active={active}
                  color={r.primary}
                  onClick={() => setFilter(active ? 'all' : key)}
                  label={`${r.short}${key === playerRaceKey ? ' ★' : ''}`}
                />
              );
            })}
          </div>

          {/* Card grid + detail panel.
              Layout strategy (rewritten — earlier flex+nested-grid
              attempts couldn't bound the section's height on either
              desktop OR mobile because the gridAutoRows:1fr made the
              inner grid fill its parent exactly, so overflow:visible
              children couldn't push the wrapper's scroll height past
              its own bounded height):

              - Single flex container, NO nested grid wrapper.
              - Desktop default: row flex (cards | aside side-by-side).
                Wrapper overflow:hidden, both children scroll independently.
              - Mobile media query: flex-direction:column. Wrapper
                overflow-y:auto. Children `flex:none` so they don't
                stretch — they take their content's natural height.
                Wrapper's content (sum of children) exceeds its bounded
                height → scroll engages. */}
          <div
            className="commanders-grid-wrapper"
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              overflow: 'hidden',
            }}
          >
              <section
                className="commanders-cards"
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 0,
                  padding: '18px 16px 32px',
                  overflowY: 'auto',
                }}
              >
                {visible.length === 0 ? (
                  <Panel style={{ padding: 24, textAlign: 'center' }}>
                    <Caption>Bu filtreye uyan komutan yok.</Caption>
                  </Panel>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {visible.map((c) => (
                      <CommanderCard
                        key={c.id}
                        entry={c}
                        selected={c.id === selected.id}
                        active={activeCommander?.commanderId === c.id}
                        onSelect={() => setSelectedId(c.id)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <aside
                style={{
                  width: 'min(380px, 38vw)',
                  minWidth: 280,
                  borderLeft: `1px solid ${ND.border}`,
                  background: `linear-gradient(180deg, ${selectedTheme.primary}11 0%, rgba(8,10,16,0.85) 50%)`,
                  overflowY: 'auto',
                  transition: 'background 700ms cubic-bezier(0.32,0.72,0,1)',
                  minHeight: 0,
                }}
                className="commanders-detail"
                aria-label="Komutan detay paneli"
              >
                <CommanderDetail
                  entry={selected}
                  isActive={activeCommander?.commanderId === selected.id}
                  onActivated={refreshActive}
                />
              </aside>
          </div>
        </main>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          /* Switch from row-flex (cards | aside) to column-flex (cards over
             aside) and hand scroll authority to the wrapper. flex:none on
             children prevents them from filling the wrapper's bounded
             height — they instead take their natural content height, so
             the sum exceeds the wrapper and overflow-y:auto engages. */
          :global([data-testid='scr-commanders']) .commanders-grid-wrapper {
            flex-direction: column !important;
            overflow: hidden !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          :global([data-testid='scr-commanders']) .commanders-cards {
            flex: none !important;
            overflow: visible !important;
          }
          :global([data-testid='scr-commanders']) .commanders-detail {
            flex: none !important;
            width: 100% !important;
            min-width: 0 !important;
            border-left: none !important;
            border-top: 1px solid ${ND.border};
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}

function FilterChip({
  active,
  color,
  onClick,
  label,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        padding: '5px 12px',
        fontFamily: ND.display,
        fontSize: 11,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        border: `1px solid ${active ? color : ND.border}`,
        color: active ? color : ND.textDim,
        background: active ? `${color}12` : 'transparent',
        transition: 'all 200ms cubic-bezier(0.32,0.72,0,1)',
      }}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function CommanderCard({
  entry,
  selected,
  active,
  onSelect,
}: {
  entry: CommanderEntry;
  selected: boolean;
  active?: boolean;
  onSelect: () => void;
}) {
  const { race, locked } = entry;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        all: 'unset',
        display: 'block',
        cursor: 'pointer',
        width: '100%',
      }}
    >
      <div
        style={{
          padding: selected ? 2 : 1,
          borderRadius: 10,
          background: selected
            ? `linear-gradient(135deg, ${race.primary} 0%, ${race.primaryDim}66 100%)`
            : `linear-gradient(135deg, ${race.primary}22 0%, transparent 60%)`,
          boxShadow: selected ? `0 0 28px -6px ${race.glow}` : 'none',
          transition: 'all 250ms cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div
          style={{
            borderRadius: 8.5,
            background: ND.surface,
            overflow: 'hidden',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {/* Portrait area — renders the PNG portrait when one is in the
              live roster (entry.portrait), falls back to the abstract
              Sigil otherwise OR if the <img> fires onError (locked tier
              4 commanders typically have no asset yet). Locked entries
              keep the grayscale filter regardless of which renders. */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '3/4',
              background: locked
                ? ND.bgDeep
                : `radial-gradient(ellipse 70% 65% at 50% 35%, ${race.glow}33 0%, transparent 70%), ${ND.bgDeep}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: locked ? 'grayscale(1) brightness(0.45)' : 'none',
              overflow: 'hidden',
            }}
          >
            <CommanderPortrait
              portrait={entry.portrait}
              alt={entry.n}
              race={race}
              size={88}
              glow={!locked}
            />
            {/* Race + tier badges */}
            <div
              style={{
                position: 'absolute',
                top: 6,
                left: 6,
                right: 6,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 6,
              }}
            >
              <span
                style={{
                  padding: '2px 6px',
                  fontFamily: ND.mono,
                  fontSize: 8,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  background: `${race.primary}22`,
                  color: race.primary,
                  border: `1px solid ${race.primary}55`,
                  backdropFilter: 'blur(4px)',
                }}
              >
                {race.short}
              </span>
              <span
                style={{
                  padding: '2px 6px',
                  fontFamily: ND.mono,
                  fontSize: 8,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  background: locked ? 'rgba(255,255,255,0.06)' : `${ND.warn}22`,
                  color: locked ? ND.textMute : ND.warn,
                  border: `1px solid ${locked ? ND.border : `${ND.warn}55`}`,
                  backdropFilter: 'blur(4px)',
                }}
              >
                {locked ? 'KİLİT' : `LV ${entry.lv}`}
              </span>
            </div>

            {active && !locked && (
              <span
                aria-label="Aktif komutan"
                style={{
                  position: 'absolute',
                  top: 28,
                  left: 6,
                  padding: '2px 6px',
                  fontFamily: ND.mono,
                  fontSize: 8,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  background: `${ND.ok}22`,
                  color: ND.ok,
                  border: `1px solid ${ND.ok}66`,
                  borderRadius: 2,
                  backdropFilter: 'blur(4px)',
                  boxShadow: `0 0 10px ${ND.ok}44`,
                  zIndex: 2,
                }}
              >
                ★ AKTİF
              </span>
            )}

            {locked && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: 'linear-gradient(180deg, rgba(3,5,11,0.45) 0%, rgba(3,5,11,0.85) 100%)',
                }}
              >
                <LockIcon color={ND.warn} size={28} />
                <span
                  style={{
                    fontFamily: ND.display,
                    fontSize: 9,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: ND.warn,
                  }}
                >
                  KİLİTLİ
                </span>
              </div>
            )}

            {/* Bottom fade for label legibility */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 50%, rgba(7,9,15,0.92) 100%)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8 }}>
              <div
                style={{
                  fontFamily: ND.display,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: locked ? ND.textDim : ND.text,
                  textShadow: locked ? 'none' : `0 1px 2px rgba(0,0,0,0.8), 0 0 14px ${race.glow}`,
                  lineHeight: 1.15,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {entry.n}
              </div>
              <div
                style={{
                  fontFamily: ND.mono,
                  fontSize: 9,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: race.primary,
                  opacity: locked ? 0.55 : 1,
                  marginTop: 3,
                }}
              >
                {entry.tier}
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function CommanderDetail({
  entry,
  isActive,
  onActivated,
}: {
  entry: CommanderEntry;
  isActive?: boolean;
  onActivated?: () => void;
}) {
  const { race, locked } = entry;
  const [activating, setActivating] = useState(false);
  return (
    <div style={{ padding: '20px 18px 32px' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4/5',
          borderRadius: 12,
          overflow: 'hidden',
          background: locked
            ? ND.bgDeep
            : `radial-gradient(ellipse 80% 70% at 50% 40%, ${race.glow}44 0%, transparent 70%), ${ND.bgDeep}`,
          border: `1px solid ${race.primary}33`,
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: locked ? 'grayscale(1) brightness(0.45)' : 'none',
          boxShadow: locked ? 'none' : `0 0 36px -10px ${race.glow}77`,
        }}
      >
        <CommanderPortrait
          portrait={entry.portrait}
          alt={entry.n}
          race={race}
          size={148}
          glow={!locked}
          full
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 50%, rgba(3,5,11,0.88) 100%)',
          }}
        />
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              marginBottom: 10,
            }}
          >
            <Chip color={race.primary}>
              {race.name.toUpperCase()}
            </Chip>
            <Chip color={ND.warn}>
              LV {entry.lv}
            </Chip>
            {locked && <Chip color={ND.danger}>KİLİTLİ</Chip>}
          </div>
          {/* XP progress — surfaces the commander's grind toward the next
              level. Only shown when live data carries xpToNext (static lex
              fallback has no XP semantics). Hidden at max level (xpToNext=0)
              so it doesn't look like an empty bar staring back. */}
          {!locked && entry.xpToNext !== undefined && entry.xpToNext > 0 && entry.xp !== undefined && (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  fontFamily: ND.mono,
                  fontSize: 10,
                  color: ND.textDim,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                <span>SONRAKİ LV</span>
                <span style={{ color: race.primary }}>
                  {entry.xp.toLocaleString()} / {entry.xpToNext.toLocaleString()} XP
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${ND.border}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${Math.max(0, Math.min(100, Math.round((entry.xp / entry.xpToNext) * 100)))}%`,
                    background: `linear-gradient(90deg, ${race.primary}88, ${race.primary})`,
                    boxShadow: `0 0 8px ${race.glow}`,
                    transition: 'width 600ms cubic-bezier(0.32, 0.72, 0, 1)',
                  }}
                />
              </div>
            </div>
          )}
          <H2
            style={{
              color: ND.text,
              textShadow: `0 0 22px ${race.glow}`,
              fontSize: 22,
              lineHeight: 1.1,
            }}
          >
            {entry.n}
          </H2>
          <div
            style={{
              fontFamily: ND.display,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color: race.primary,
              marginTop: 4,
            }}
          >
            {entry.t}
          </div>
        </div>
      </div>

      {/* Role / tier */}
      <Panel race={race} style={{ padding: 14, marginBottom: 12 }}>
        <Eyebrow color={race.primary}>TIER · ROL</Eyebrow>
        <H3 style={{ color: ND.text, marginTop: 4 }}>{entry.tier}</H3>
        <Caption style={{ marginTop: 6 }}>{entry.t}</Caption>
      </Panel>

      {/* Skill */}
      <Panel style={{ padding: 14, marginBottom: 12 }}>
        <Eyebrow color={race.primary}>YETENEK</Eyebrow>
        {locked ? (
          <>
            <H3 style={{ color: ND.warn, marginTop: 4 }}>KİLİTLİ</H3>
            <Caption style={{ marginTop: 6 }}>
              {entry.race.name} kampanyasında ilerleyerek bu komutanı aç. Tier {entry.tier} unvanı ile birlikte
              özel yetenek devreye girer.
            </Caption>
          </>
        ) : (
          <>
            <H3 style={{ color: ND.text, marginTop: 4 }}>{entry.skill}</H3>
            <Caption style={{ marginTop: 6 }}>
              Aktif komutan olarak atandığında {entry.race.allianceName} birliklerine kalıcı bonus uygular.
            </Caption>
          </>
        )}
      </Panel>

      {/* Race lore — pulled from race tokens */}
      <Panel style={{ padding: 14, marginBottom: 18 }}>
        <Eyebrow color={race.primary}>{race.name.toUpperCase()} HİKAYESİ</Eyebrow>
        <Caption style={{ marginTop: 6, fontStyle: 'italic', lineHeight: 1.55 }}>
          {race.storyAct1}
        </Caption>
      </Panel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link
          href={`/commanders/${entry.id}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            background: `${race.primary}18`,
            color: race.primary,
            border: `1px solid ${race.primary}55`,
            fontFamily: ND.display,
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            transition: 'all 200ms cubic-bezier(0.32,0.72,0,1)',
          }}
        >
          ◈ Detay Sayfası
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: `${race.primary}22`,
              border: `1px solid ${race.primary}44`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            →
          </span>
        </Link>
        <NDButton
          race={race}
          variant={locked ? 'outline' : isActive ? 'outline' : 'primary'}
          full
          disabled={locked || activating || isActive}
          onClick={async () => {
            if (locked || activating || isActive) return;
            setActivating(true);
            // Cache the selection optimistically so guest mode still feels
            // responsive — the auth-required POST below upgrades it to the
            // server-authoritative source when the player has a token.
            const writeCache = () => {
              try {
                window.localStorage.setItem(
                  'nebula:active-commander:v1',
                  JSON.stringify({ id: entry.id, name: entry.n, race: race.key, ts: Date.now() }),
                );
              } catch {
                /* private mode — best effort */
              }
            };
            try {
              await api.post(`/commanders/${entry.id}/activate`);
              writeCache();
              toast.success(`${entry.n} aktif komutan olarak ayarlandı`);
              onActivated?.();
            } catch (err) {
              writeCache();
              // 401 / 4xx → fall back to optimistic UI in guest mode so the
              // badge still feels consistent on the next reload; surface
              // the translated message so the player knows it didn't sync.
              const msg = err instanceof FetchError ? err.message : 'Aktif komutan ayarlanamadı';
              toast.error(msg);
            } finally {
              setActivating(false);
            }
          }}
        >
          {locked ? '🔒 Kilidi Aç' : isActive ? '★ Aktif Komutan' : activating ? 'Ayarlanıyor…' : '⚔ Komutan Seç'}
        </NDButton>
      </div>
    </div>
  );
}

/** Renders a commander portrait PNG with a graceful fallback to the
 *  abstract Sigil. Used in both the card (size=88) and the detail panel
 *  (size=148, full=true → cover-stretches across the framed area).
 *
 *  Falls back when:
 *  - `portrait` prop is undefined (static lex roster, no live data yet)
 *  - the <img> fires onError (404 / network failure / missing asset)
 *
 *  Locked tier-4/5 commanders that don't have asset files yet land in
 *  the fallback path automatically. */
function CommanderPortrait({
  portrait,
  alt,
  race,
  size,
  glow,
  full,
}: {
  portrait?: string;
  alt: string;
  race: NDRace;
  size: number;
  glow?: boolean;
  /** When true, fill the parent frame (object-fit: cover) instead of
   *  rendering at fixed `size`. Used in the detail panel. */
  full?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!portrait || failed) {
    return <Sigil race={race} size={size} glow={glow} />;
  }
  if (full) {
    return (
      <img
        src={portrait}
        alt={alt}
        onError={() => setFailed(true)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center top',
        }}
      />
    );
  }
  return (
    <img
      src={portrait}
      alt={alt}
      onError={() => setFailed(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center top',
        // Subtle glow ring picked up from the race when not locked,
        // so the portrait still reads as "yours" alongside the sigil
        // version. drop-shadow keeps the PNG's silhouette intact.
        filter: glow ? `drop-shadow(0 0 14px ${race.glow}55)` : 'none',
      }}
    />
  );
}

function LockIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="3" y="10" width="16" height="10" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
      <path d="M7 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
