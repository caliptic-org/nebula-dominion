'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Bar,
  BottomNav,
  Caption,
  Chip,
  Code,
  H3,
  HUD,
  ND,
  NDButton,
  NebulaBg,
  Panel,
  RaceTierBadge,
  ResIcon,
  Sigil,
  raceShape,
  toast,
} from '@/components/handoff';
import { useNDRace } from '@/components/handoff/useNDRace';
import type { NDRace, NDRaceKey } from '@/components/handoff/nd-tokens';
import { useUnitConfigs, type UnitConfigDto } from '@/hooks/useUnitConfigs';
import { useGameUnits, groupUnitsByType, type PlayerUnitDto } from '@/hooks/useGameUnits';
import { useGameResources } from '@/hooks/useGameResources';
import { POP_MAX, POP_USED } from '@/lib/nd-mocks';
import { useHudState } from '@/hooks/useHudState';
import { gameServerApi } from '@/lib/game-server-api';
import { FetchError } from '@/lib/api';

/* ─── Race-specific copy ────────────────────────────────────────────────── */

const ROSTER_NAMES: Record<string, string> = {
  insan:   'TUGAY ENVANTERİ',
  zerg:    'SÜRÜ TABLOSU',
  otomat:  'BİRİM REGİSTRİ',
  canavar: 'SÜRÜ KAYDI',
  seytan:  'MAHKEME SİCİLİ',
};

/** Left button label — race-specific merge / promotion verb */
const MERGE_VERB: Record<string, string> = {
  insan:   'TERFİ',
  zerg:    'EVRİMLE',
  otomat:  'BİRLEŞTİR',
  canavar: 'YE',
  seytan:  'MÜHÜRLE',
};

const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base:     '/base',
  map:      '/map',
  settings: '/settings',
  alliance: '/alliance',
  shop:     '/shop',
};

/* ─── Unit silhouette SVG — abstract race glyph (28×28 vb) ─────────────── */

function UnitSilhouette({ race }: { race: NDRace }) {
  const c = race.primary;
  switch (race.key as NDRaceKey) {
    case 'zerg':
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <ellipse cx="14" cy="15" rx="9" ry="8" stroke={c} strokeWidth="1.2" />
          <circle cx="10" cy="11" r="2" fill={c} opacity="0.6" />
          <circle cx="18" cy="11" r="2" fill={c} opacity="0.6" />
        </svg>
      );
    case 'otomat':
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="6" y="6" width="16" height="16" stroke={c} strokeWidth="1.2" />
          <rect x="10" y="10" width="8" height="8" fill={c} opacity="0.4" />
        </svg>
      );
    case 'canavar':
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M7 21 C10 14 18 14 21 21" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M7 7 C10 14 18 14 21 7" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'seytan':
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M14 5 L23 22 H5 Z" fill={c} opacity="0.35" stroke={c} strokeWidth="1.2" />
          <circle cx="14" cy="17" r="3" fill={c} opacity="0.7" />
        </svg>
      );
    default: /* insan */
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="10" y="4" width="8" height="8" rx="1" stroke={c} strokeWidth="1.2" />
          <path d="M7 22 L7 14 Q14 11 21 14 L21 22" stroke={c} strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </svg>
      );
  }
}

/* ─── Types ─────────────────────────────────────────────────────────────── */

type UnitState = 'ready' | 'fleet' | 'wounded';

interface RosterUnit {
  id: string;
  name: string;
  backendType: string | null;
  tier: number;
  level: number;
  count: number;
  state: UnitState;
  atk: number;
  def: number;
  spd: number;
}

const STATE_LABEL: Record<UnitState, string> = {
  ready:   'HAZIR',
  wounded: 'YARALI',
  fleet:   'FİLODA',
};

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function RosterPage() {
  const race    = useNDRace();
  const router  = useRouter();
  const tInventory = useTranslations('inventory');
  const hud     = useHudState();
  const [tierFilter, setTierFilter] = useState<number | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { configs: backendUnits } = useUnitConfigs(race.key);
  const { data: liveUnits, refresh: refreshUnits } = useGameUnits();
  const units: RosterUnit[] = useMemo(
    () => buildRoster(race, backendUnits, liveUnits),
    [race, backendUnits, liveUnits],
  );

  /* Tier-filtered list, sorted by tier then count */
  const visible = useMemo(() => {
    const filtered = tierFilter === 'all' ? units : units.filter((u) => u.tier === tierFilter);
    return [...filtered].sort((a, b) => a.tier - b.tier || b.count - a.count);
  }, [units, tierFilter]);

  const selectedUnit = useMemo(
    () => units.find((u) => u.id === selectedId) ?? null,
    [units, selectedId],
  );

  /* Population */
  const { data: liveRes } = useGameResources();
  const popUsed  = liveRes ? liveRes.population : POP_USED;
  const popMax   = liveRes && liveRes.populationCap > 0 ? liveRes.populationCap : POP_MAX;
  const popRatio = popMax > 0 ? popUsed / popMax : 0;

  /* Pad to 12 cells (3×4) with empty slots so grid always looks full */
  const GRID_CELLS = 12;
  const emptyCount = Math.max(0, GRID_CELLS - visible.length);

  return (
    <div
      data-race={race.key}
      style={{
        position: 'relative',
        height: '100dvh',
        overflow: 'hidden',
        background: ND.bg,
        color: ND.text,
        fontFamily: ND.body,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <NebulaBg race={race} intensity={0.7} dim={0.65} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

        {/* HUD */}
        <HUD
          race={race}
          level={hud.level}
          levelName={hud.levelName}
          resA={hud.resA}
          resB={hud.resB}
          crystal={hud.crystal}
          science={hud.science !== undefined ? Math.floor(hud.science).toLocaleString() : undefined}
        />

        {/* Title row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 14px 0',
        }}>
          <H3 style={{ color: ND.text, flex: 1 }}>
            {ROSTER_NAMES[race.key] ?? 'TUGAY ENVANTERİ'}
          </H3>
          <Code style={{
            color: popRatio > 0.85 ? ND.warn : race.primary,
            fontSize: 11,
            letterSpacing: '0.04em',
          }}>
            {popUsed.toLocaleString()} / {popMax.toLocaleString()} POP
          </Code>
        </div>

        {/* Tier filter strip */}
        <div style={{ padding: '8px 14px 0' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all', 1, 2, 3, 4, 5] as const).map((t) => {
              const on     = t === tierFilter;
              const locked = typeof t === 'number' && units.filter((u) => u.tier === t).length === 0;
              return (
                <button
                  key={String(t)}
                  type="button"
                  onClick={() => setTierFilter(t)}
                  aria-pressed={on}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    flex: 1,
                    minHeight: 28,
                    padding: '4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    fontFamily: ND.display,
                    fontSize: 10,
                    letterSpacing: '0.10em',
                    color: on ? '#0A0E1A' : locked ? ND.textMute : ND.textDim,
                    background: on ? race.primary : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${on ? race.primary : ND.border}`,
                    fontWeight: on ? 700 : 500,
                    boxShadow: on ? `0 0 8px ${race.glow}44` : 'none',
                    ...raceShape(race.key, 'tab'),
                  }}
                >
                  {t === 'all' ? (
                    <span>TÜM</span>
                  ) : (
                    <>
                      <RaceTierBadge race={race} tier={t} size={13} locked={locked} active={on} />
                      <span style={{ fontSize: 9 }}>T{t}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Unit grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 4px' }}>

          {/* Honest empty state */}
          {liveUnits != null && units.every((u) => u.count === 0) && (
            <div style={{
              marginBottom: 10,
              padding: 14,
              border: `1px dashed ${race.primary}55`,
              borderRadius: 6,
              background: `${race.primary}0a`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 26, opacity: 0.7 }} aria-hidden>⚙</div>
              <H3 style={{ color: ND.text, marginTop: 4 }}>Henüz birim eğitmedin</H3>
              <Caption style={{ marginTop: 4 }}>Üretim sayfasından ilk birimini kuyruğa ekle.</Caption>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                <NDButton race={race} onClick={() => router.push('/base/production')}>Üretime Git</NDButton>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
            {visible.map((u) => (
              <RosterCard
                key={u.id}
                race={race}
                unit={u}
                selected={u.id === selectedId}
                onClick={() => setSelectedId((cur) => (cur === u.id ? null : u.id))}
              />
            ))}
            {/* Empty placeholder cells */}
            {Array.from({ length: emptyCount }).map((_, i) => (
              <EmptySlot key={`empty-${i}`} />
            ))}
          </div>

          {visible.length === 0 && !liveUnits?.length && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ opacity: 0.12, display: 'inline-block' }} aria-hidden>
                <Sigil race={race} size={96} />
              </div>
              <Caption style={{ display: 'block', marginTop: 8 }}>
                Bu tier ile uyumlu birim yok.
              </Caption>
            </div>
          )}
        </div>

        {/* Unit detail drawer */}
        {selectedUnit && (
          <UnitDetailDrawer
            race={race}
            unit={selectedUnit}
            liveUnits={liveUnits}
            onUpgraded={refreshUnits}
            onClose={() => setSelectedId(null)}
          />
        )}

        {/* Bottom action bar */}
        {!selectedUnit && (
          <div style={{
            padding: '8px 14px',
            background: 'rgba(8,10,16,0.92)',
            borderTop: `1px solid ${ND.border}`,
            backdropFilter: 'blur(12px)',
            display: 'flex',
            gap: 8,
          }}>
            <Link href="/merge" style={{ flex: 1, textDecoration: 'none' }}>
              <NDButton race={race} variant="ghost" size="md" full>
                {MERGE_VERB[race.key] ?? 'TERFİ'}
              </NDButton>
            </Link>
            <Link href="/formation" style={{ flex: 1, textDecoration: 'none' }}>
              <NDButton race={race} size="md" full>FİLO YAP</NDButton>
            </Link>
          </div>
        )}

        <BottomNav
          race={race}
          active="base"
          onChange={(key) => router.push(BOTTOM_NAV_ROUTES[key] ?? '/base')}
        />
      </div>
    </div>
  );
}

/* ─── Empty slot ────────────────────────────────────────────────────────── */

function EmptySlot() {
  return (
    <div
      aria-hidden
      style={{
        aspectRatio: '1',
        border: `1px dashed ${ND.border}`,
        background: 'rgba(10,14,28,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...({} as object), // satisfy TS
      }}
    >
      <span style={{
        fontFamily: ND.mono,
        fontSize: 10,
        color: ND.textMute,
        opacity: 0.55,
      }}>—</span>
    </div>
  );
}

/* ─── Roster card ───────────────────────────────────────────────────────── */

interface RosterCardProps {
  race:     NDRace;
  unit:     RosterUnit;
  selected: boolean;
  onClick:  () => void;
}

function RosterCard({ race, unit, selected, onClick }: RosterCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${unit.name}, Tier ${unit.tier}, ${STATE_LABEL[unit.state]}, ${unit.count} adet`}
      style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
    >
      <div style={{
        aspectRatio: '1',
        padding: 5,
        background: `rgba(18,24,42,${selected ? '0.92' : '0.78'})`,
        border: `1px solid ${selected ? race.primary : race.primary + '44'}`,
        boxShadow: selected ? `0 0 12px ${race.glow}55` : 'none',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        ...raceShape(race.key, 'card'),
      }}>
        {/* Tier badge — absolute top-left */}
        <div style={{ position: 'absolute', top: 3, left: 3, zIndex: 2 }}>
          <RaceTierBadge race={race} tier={unit.tier} size={16} active />
        </div>

        {/* Count — absolute top-right */}
        <span style={{
          position: 'absolute',
          top: 4,
          right: 4,
          fontFamily: ND.mono,
          fontSize: 9,
          color: race.primary,
          zIndex: 2,
        }}>×{unit.count}</span>

        {/* Silhouette area — diagonal hatch + centered glyph */}
        <div style={{
          flex: 1,
          marginTop: 20,
          marginBottom: 3,
          background: `repeating-linear-gradient(135deg, ${race.primary}0e 0 5px, transparent 5px 10px)`,
          border: `1px dashed ${race.primary}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <UnitSilhouette race={race} />
        </div>

        {/* Unit name */}
        <div style={{
          fontFamily: ND.mono,
          fontSize: 8,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: ND.text,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {unit.name}
        </div>
      </div>
    </button>
  );
}

/* ─── Unit detail drawer ────────────────────────────────────────────────── */

interface UnitDetailDrawerProps {
  race:       NDRace;
  unit:       RosterUnit;
  liveUnits:  PlayerUnitDto[] | null;
  onUpgraded: () => void;
  onClose:    () => void;
}

function UnitDetailDrawer({ race, unit, liveUnits, onUpgraded, onClose }: UnitDetailDrawerProps) {
  const tInventory = useTranslations('inventory');
  const cost = upgradeCost(unit);
  const [upgrading, setUpgrading] = useState(false);

  const stateColor =
    unit.state === 'ready'   ? race.primary :
    unit.state === 'wounded' ? ND.warn      :
    ND.textDim;

  const liveTarget = unit.backendType && liveUnits
    ? liveUnits.find((u) => u.isAlive && u.type.toLowerCase() === unit.backendType)
    : undefined;

  async function handleUpgrade() {
    if (upgrading) return;
    if (!liveTarget) { toast.error(tInventory('trainFirst')); return; }
    setUpgrading(true);
    try {
      // gameServerApi already prefixes with /api/ — the previous /v1/ here
      // produced /api/v1/units/.../upgrade which game-server doesn't expose
      // (it uses /api/units/:id/upgrade). 404'd silently with the misleading
      // "henüz hazır değil" toast.
      const upgraded = await gameServerApi.post<PlayerUnitDto>(`/units/${liveTarget.id}/upgrade`);
      const newLevel = (upgraded as PlayerUnitDto & { level?: number }).level ?? unit.level + 1;
      toast.success(`${unit.name} Lv ${newLevel}'e yükseltildi`);
      onUpgraded();
    } catch (err) {
      toast.error(err instanceof FetchError ? err.message : 'Yükseltme başarısız');
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <section
      aria-label={`${unit.name} detay`}
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 5,
        background: 'rgba(8,10,16,0.96)',
        borderTop: `1px solid ${race.primary}55`,
        boxShadow: `0 -8px 24px -8px ${race.glow}`,
        backdropFilter: 'blur(14px)',
        padding: '12px 14px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          background: `repeating-linear-gradient(135deg, ${race.primary}0e 0 6px, transparent 6px 12px)`,
          border: `1px solid ${race.primary}66`,
          flexShrink: 0,
        }}>
          <UnitSilhouette race={race} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: ND.display,
            fontSize: 13,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: ND.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {unit.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Chip color={race.primary}>T{unit.tier}</Chip>
            <Chip color={stateColor}>{STATE_LABEL[unit.state]}</Chip>
            <Code>×{unit.count}</Code>
            <Code>Lv {unit.level}</Code>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Detayı kapat"
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ND.textDim,
            border: `1px solid ${ND.border}`,
            borderRadius: 3,
            fontFamily: ND.mono,
            fontSize: 14,
          }}
        >×</button>
      </div>

      {/* Stat bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Bar value={unit.atk} color={race.primary} label="ATK" trailing={String(unit.atk)} height={5} />
        <Bar value={unit.def} color={ND.ok}        label="DEF" trailing={String(unit.def)} height={5} />
        <Bar value={unit.spd} color={ND.warn}      label="SPD" trailing={String(unit.spd)} height={5} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <NDButton
          race={race}
          variant="outline"
          size="md"
          style={{ flex: 1, opacity: !liveTarget ? 0.55 : 1 }}
          disabled={upgrading || !liveTarget}
          onClick={handleUpgrade}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {upgrading ? 'Yükseltiliyor…' : 'Yükselt'}
            <span style={{ opacity: 0.8 }}>Lv {unit.level} → {unit.level + 1}</span>
            <span style={{ opacity: 0.6 }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <ResIcon kind={race.resourceA.icon} size={11} color={race.primary} />
              {cost}
            </span>
          </span>
        </NDButton>
        {liveTarget ? (
          <Link href={`/battle-prep?unit=${encodeURIComponent(unit.id)}`} style={{ flex: 1, textDecoration: 'none' }}>
            <NDButton race={race} size="md" full>Savaşa Gönder</NDButton>
          </Link>
        ) : (
          <Link href="/base/production" style={{ flex: 1, textDecoration: 'none' }}>
            <NDButton race={race} size="md" full>Barakaya Git</NDButton>
          </Link>
        )}
      </div>
      {!liveTarget && (
        <div style={{
          fontSize: 10,
          color: ND.textDim,
          fontFamily: ND.mono,
          letterSpacing: '0.04em',
          textAlign: 'center',
          opacity: 0.85,
        }}>
          {tInventory('notTrainedHint')}
        </div>
      )}
    </section>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function upgradeCost(unit: RosterUnit): number {
  return unit.level * unit.tier * 50;
}

function buildRoster(
  race: NDRace,
  backend: UnitConfigDto[],
  liveUnits: PlayerUnitDto[] | null,
): RosterUnit[] {
  const states: UnitState[] = ['ready', 'fleet', 'wounded'];
  const liveByType = liveUnits ? groupUnitsByType(liveUnits) : null;

  // ── Index helpers ────────────────────────────────────────────────────
  // Match lex names and backend types by NAME, not by array index.  The
  // previous index-based pairing broke after getUnitConfigsByRace started
  // filtering merge-only units (trainable: false) out of the catalog —
  // race.units kept all 6 slots (Marine..Captain) but backend shrank to
  // 4 (Marine/Medic/Siege/Ghost), so lex slot 5 (Captain) paired with
  // backend[5] = undefined and the player's chain-merged Captain unit
  // counted zero in /inventory.
  //
  // The mapping rule: a lex entry matches a backend config if the
  // backend's `type` snake-case prefix equals the lex name's snake-case
  // (case-insensitive). 'Marine' ↔ 'marine', 'Mecha Walker' ↔ 'mecha_walker'.
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '_');
  const backendByName = new Map<string, UnitConfigDto>();
  for (const cfg of backend) {
    backendByName.set(norm(String(cfg.type ?? '')), cfg);
  }

  const cards: RosterUnit[] = race.units.map((u, i) => {
    const id        = `${race.key}-${u.n}-${i}`;
    const seed      = hash(id);
    const lexKey    = norm(u.n);
    const live      = backendByName.get(lexKey);
    // The lex name itself becomes the backendType when no backend config
    // matches — so a lex-only entry (Sniper/Mecha/Genetic/Captain, all
    // merge-only) still resolves correctly against liveByType from the
    // game-server roster fetch.
    const liveType  = live ? norm(String(live.type)) : lexKey;
    const realCount = liveByType?.get(liveType)?.length ?? 0;

    const atk = live?.attack  != null ? clamp(Math.round((live.attack  as number) * 2))   : clamp(u.t * 14 + (seed % 9) + 8);
    const def = live?.defense != null ? clamp(Math.round((live.defense as number) * 2.5)) : clamp(u.t * 11 + ((seed >> 3) % 8) + 6);
    const spd = live?.speed   != null ? clamp(Math.round((live.speed   as number) * 14))  : clamp(94 - u.t * 12 + ((seed >> 6) % 10));

    const liveSampleLevel = (liveByType?.get(liveType)?.[0] as unknown as { level?: number } | undefined)?.level;

    return {
      id,
      name:        u.n,
      backendType: liveType,
      tier:        live?.tier ?? u.t,
      level:       liveSampleLevel ?? Math.max(1, 10 - i * 2),
      count:       realCount,
      state:       realCount > 0 ? 'ready' : states[i % states.length],
      atk,
      def,
      spd,
    };
  });

  // Surface ANY backend types the player actually owns that aren't in the
  // race-lex yet (Medic / Ghost / Siege Tank for İnsan are trainable but
  // not in RACES[insan].units — the lex only covers the promotion ladder).
  // Without this, a player with 50 Ghosts saw zero of them on /inventory.
  if (liveByType) {
    const seenTypes = new Set(cards.map((c) => c.backendType));
    let extraIdx = race.units.length;
    for (const [type, units] of liveByType.entries()) {
      if (seenTypes.has(type)) continue;
      const sample = (units as unknown as Array<{ level?: number }>)[0];
      const cfg = backendByName.get(type);
      const id = `${race.key}-${type}-extra-${extraIdx++}`;
      const seed = hash(id);
      const tier = cfg?.tier ?? 1;
      // Pretty-up the raw enum code: 'siege_tank' → 'Siege Tank'.
      const prettyName = type
        .split('_')
        .map((w) => w[0]?.toUpperCase() + w.slice(1))
        .join(' ');
      cards.push({
        id,
        name: prettyName,
        backendType: type,
        tier,
        level: sample?.level ?? 1,
        count: units.length,
        state: 'ready',
        atk: cfg?.attack  != null ? clamp(Math.round((cfg.attack  as number) * 2))   : clamp(tier * 14 + (seed % 9) + 8),
        def: cfg?.defense != null ? clamp(Math.round((cfg.defense as number) * 2.5)) : clamp(tier * 11 + ((seed >> 3) % 8) + 6),
        spd: cfg?.speed   != null ? clamp(Math.round((cfg.speed   as number) * 14))  : clamp(94 - tier * 12 + ((seed >> 6) % 10)),
      });
    }
  }

  return cards;
}
