'use client';

import { useMemo, useState, useCallback, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ND,
  RACES,
  Sigil,
  Eyebrow,
  H1,
  H2,
  H3,
  Caption,
  Panel,
  NDButton,
  Bar,
  useNDRace,
  type NDRace,
  type NDRaceKey,
} from '@/components/handoff';

/* ───────────────────────── Roster & formation model ───────────────────────── */

interface RosterUnit {
  id: string;
  name: string;
  tier: number;
  /** Per-unit power. */
  power: number;
  /** Available copies. */
  count: number;
}

const FORMATION_ROWS = 3;
const FORMATION_COLS = 5;
/** Slot index (0..14) → assigned unit id or null. */
type FormationGrid = (string | null)[];

function buildRoster(race: NDRace): RosterUnit[] {
  return race.units.map((u, i) => ({
    id: `${race.key}-${i}`,
    name: u.n,
    tier: u.t,
    power: 60 + u.t * 40,
    count: Math.max(2, 8 - u.t),
  }));
}

function emptyGrid(): FormationGrid {
  return Array.from({ length: FORMATION_ROWS * FORMATION_COLS }, () => null);
}

interface Props {
  /** Optional target id from /map → /target → /battle-prep. */
  targetId?: string | null;
  forcedRace?: NDRaceKey;
  projectedOutcome?: 'victory' | 'defeat';
}

export function BattlePrepScreen({ targetId, forcedRace, projectedOutcome }: Props) {
  const detected = useNDRace();
  const race = forcedRace ? RACES[forcedRace] : detected;
  const enemy = RACES[race.enemyRace];
  const router = useRouter();

  const roster = useMemo(() => buildRoster(race), [race]);
  const [grid, setGrid] = useState<FormationGrid>(() => emptyGrid());
  const [dragId, setDragId] = useState<string | null>(null);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of grid) if (cell) map.set(cell, (map.get(cell) ?? 0) + 1);
    return map;
  }, [grid]);

  const filled = useMemo(() => grid.filter(Boolean).length, [grid]);

  const totalPower = useMemo(() => {
    let p = 0;
    for (const cell of grid) {
      if (!cell) continue;
      const u = roster.find((r) => r.id === cell);
      if (u) p += u.power;
    }
    return p;
  }, [grid, roster]);

  const handleDragStart = useCallback((id: string) => (e: DragEvent<HTMLButtonElement>) => {
    setDragId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (slot: number) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    if (!id) return;
    placeIn(slot, id);
  };

  const placeIn = useCallback((slot: number, id: string) => {
    setGrid((prev) => {
      const u = roster.find((r) => r.id === id);
      if (!u) return prev;
      const next = prev.slice();
      // Capacity check
      const used = next.filter((c) => c === id).length;
      if (used >= u.count && next[slot] !== id) return prev;
      next[slot] = id;
      return next;
    });
  }, [roster]);

  const handleSlotTap = (slot: number) => {
    setGrid((prev) => {
      const next = prev.slice();
      next[slot] = null;
      return next;
    });
  };

  const handleAutoFill = () => {
    setGrid(() => {
      const next = emptyGrid();
      // Prioritize lower-tier infantry in front rows, higher tier in back.
      const byTier = [...roster].sort((a, b) => a.tier - b.tier);
      let cursor = 0;
      for (let row = FORMATION_ROWS - 1; row >= 0 && cursor < byTier.length; row--) {
        const unit = byTier[cursor];
        for (let col = 0; col < FORMATION_COLS && unit; col++) {
          const slot = row * FORMATION_COLS + col;
          const used = next.filter((c) => c === unit.id).length;
          if (used >= unit.count) break;
          next[slot] = unit.id;
        }
        cursor++;
      }
      return next;
    });
  };

  const handleClear = () => setGrid(emptyGrid());

  const handleEngage = () => {
    if (filled === 0) return;
    router.push(`/battle?race=${race.key}${targetId ? `&target=${targetId}` : ''}`);
  };

  return (
    <div
      data-race={race.key}
      style={{
        minHeight: '100dvh',
        background: ND.bgDeep,
        color: ND.text,
        fontFamily: ND.body,
        position: 'relative',
        overflow: 'hidden',
        paddingBottom: 100,
      }}
    >
      <Backdrop race={race} enemy={enemy} />

      <header
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderBottom: `1px solid ${ND.border}`,
          background: 'linear-gradient(180deg, rgba(6,8,15,0.92), rgba(6,8,15,0.40))',
        }}
      >
        <button
          type="button"
          aria-label="Geri"
          onClick={() => router.back()}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 32,
            height: 32,
            border: `1px solid ${ND.border}`,
            color: ND.textDim,
            fontFamily: ND.display,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)',
          }}
        >
          ‹
        </button>
        <div>
          <Eyebrow>Screen 13 · Savaş Hazırlık</Eyebrow>
          <H3 style={{ color: race.primary }}>FORMASYON KUR</H3>
        </div>
        <div style={{ flex: 1 }} />
        <Sigil race={race} size={28} glow />
      </header>

      <main
        style={{
          position: 'relative',
          zIndex: 5,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        {/* Formation grid */}
        <Panel race={race} glow style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <H2 style={{ color: ND.text }}>FORMASYON {FORMATION_ROWS}×{FORMATION_COLS}</H2>
            <Eyebrow color={race.primary}>{filled}/{FORMATION_ROWS * FORMATION_COLS}</Eyebrow>
          </div>

          {/* Front / back labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px 6px' }}>
            <Eyebrow color={enemy.primary}>{enemy.short} ↑ DÜŞMAN ↑</Eyebrow>
            <Eyebrow>BİZ</Eyebrow>
          </div>

          <div
            role="grid"
            aria-label="Formasyon ızgarası"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${FORMATION_COLS}, 1fr)`,
              gap: 6,
              padding: 10,
              background: `${race.primary}08`,
              border: `1px dashed ${race.primary}44`,
              borderRadius: 6,
            }}
          >
            {grid.map((cell, i) => {
              const row = Math.floor(i / FORMATION_COLS);
              const isFront = row === 0;
              const unit = cell ? roster.find((r) => r.id === cell) : null;
              return (
                <div
                  key={i}
                  role="gridcell"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(i)}
                  onClick={() => unit && handleSlotTap(i)}
                  style={{
                    aspectRatio: '1 / 1',
                    background: unit ? `${race.primary}22` : 'rgba(6,8,15,0.6)',
                    border: `1px solid ${unit ? race.primary + '88' : ND.border}`,
                    borderTopWidth: isFront ? 2 : 1,
                    borderTopColor: isFront ? race.primary + 'aa' : ND.border,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: unit ? 'pointer' : 'default',
                    transition: 'background 200ms ease',
                  }}
                  aria-label={
                    unit
                      ? `${unit.name} — tıkla çıkar`
                      : `Boş slot satır ${row + 1}`
                  }
                >
                  {unit ? (
                    <>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          background: race.primary,
                          color: '#0A0E1A',
                          fontFamily: ND.display,
                          fontWeight: 700,
                          fontSize: 11,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        T{unit.tier}
                      </div>
                      <span
                        style={{
                          marginTop: 4,
                          fontFamily: ND.mono,
                          fontSize: 9,
                          color: ND.text,
                          textAlign: 'center',
                          letterSpacing: '0.04em',
                          lineHeight: 1,
                        }}
                      >
                        {unit.name}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontFamily: ND.mono, fontSize: 18, color: ND.textMute }} aria-hidden>
                      +
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <NDButton race={race} variant="ghost" size="sm" onClick={handleAutoFill}>
              OTOMATİK
            </NDButton>
            <NDButton race={race} variant="ghost" size="sm" onClick={handleClear}>
              TEMİZLE
            </NDButton>
            <div style={{ flex: 1 }} />
            <span
              style={{
                fontFamily: ND.mono,
                fontSize: 11,
                color: ND.textDim,
                alignSelf: 'center',
              }}
            >
              GÜÇ <span style={{ color: race.primary, fontWeight: 600 }}>{totalPower.toLocaleString('tr-TR')}</span>
            </span>
          </div>
        </Panel>

        {/* Roster */}
        <Panel style={{ padding: 14 }}>
          <H3 style={{ color: ND.text, marginBottom: 8 }}>BİRİM DEPOSU</H3>
          <Caption style={{ color: ND.textDim, marginBottom: 10 }}>
            Birimi sürükleyip ızgaraya bırak. Slot’a tıklarsan çıkarır.
          </Caption>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 8,
            }}
          >
            {roster.map((u) => {
              const used = usage.get(u.id) ?? 0;
              const exhausted = used >= u.count;
              return (
                <button
                  key={u.id}
                  type="button"
                  draggable={!exhausted}
                  onDragStart={handleDragStart(u.id)}
                  onClick={() => {
                    const idx = grid.findIndex((c) => c === null);
                    if (idx >= 0) placeIn(idx, u.id);
                  }}
                  aria-label={`${u.name} ekle`}
                  style={{
                    all: 'unset',
                    cursor: exhausted ? 'not-allowed' : 'grab',
                    padding: 10,
                    background: exhausted ? 'rgba(8,12,26,0.5)' : `${race.primary}10`,
                    border: `1px solid ${exhausted ? ND.border : race.primary + '55'}`,
                    borderRadius: 4,
                    opacity: exhausted ? 0.45 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        background: race.primary,
                        color: '#0A0E1A',
                        fontFamily: ND.display,
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      T{u.tier}
                    </div>
                    <span style={{ fontFamily: ND.display, fontSize: 12, color: ND.text }}>{u.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: ND.mono, fontSize: 10, color: ND.textDim, letterSpacing: '0.08em' }}>
                      GÜÇ {u.power}
                    </span>
                    <span style={{ fontFamily: ND.mono, fontSize: 10, color: race.primary }}>
                      {used}/{u.count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* Projected outcome ribbon */}
        {projectedOutcome && (
          <Panel style={{ padding: 12 }}>
            <Bar
              label="Tahmini başarı"
              trailing={projectedOutcome === 'victory' ? 'ZAFER' : 'RİSK'}
              value={projectedOutcome === 'victory' ? 68 : 32}
              color={projectedOutcome === 'victory' ? ND.ok : ND.danger}
              height={8}
            />
          </Panel>
        )}
      </main>

      <footer
        style={{
          position: 'fixed',
          insetInline: 0,
          bottom: 0,
          zIndex: 20,
          padding: 12,
          background: 'linear-gradient(0deg, rgba(6,8,15,0.96), rgba(6,8,15,0.55))',
          borderTop: `1px solid ${ND.border}`,
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, maxWidth: 720, margin: '0 auto' }}>
          <NDButton race={race} variant="primary" size="lg" full onClick={handleEngage} disabled={filled === 0}>
            SAVAŞA GİR ⚔
          </NDButton>
        </div>
      </footer>
    </div>
  );
}

function Backdrop({ race, enemy }: { race: NDRace; enemy: NDRace }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(40% 40% at 50% 0%, ${race.primary}28 0%, transparent 60%),
                     radial-gradient(40% 30% at 50% 100%, ${enemy.primary}1a 0%, transparent 60%),
                     ${ND.bgDeep}`,
      }}
    />
  );
}
