'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BottomNav,
  Caption,
  Chip,
  Code,
  Eyebrow,
  H3,
  HUD,
  ND,
  NDButton,
  NebulaBg,
  Panel,
  ResIcon,
  Sigil,
} from '@/components/handoff';
import { useNDRace } from '@/components/handoff/useNDRace';
import type { NDRace, NDRaceKey } from '@/components/handoff/nd-tokens';
import { useMergePreview } from '@/hooks/useMergePreview';

const MERGE_NAMES: Record<NDRaceKey, string> = {
  insan:   'Promosyon Töreni',
  zerg:    'Evrim Çukuru',
  otomat:  'Derleme Zinciri',
  canavar: 'Yamyamlık Ritüeli',
  seytan:  'Pakt Bağlama',
};

const MERGE_VERB: Record<NDRaceKey, string> = {
  insan:   'Birleştir',
  zerg:    'Mutate',
  otomat:  'Derle',
  canavar: 'Yut',
  seytan:  'Bağla',
};

const POOL_LABEL: Record<NDRaceKey, string> = {
  insan:   'BİRLEŞİME UYGUN',
  zerg:    'KOZA TUTAN LARVALAR',
  otomat:  'MOD-A KOMPATİBL',
  canavar: 'AVA UYGUN BEDEN',
  seytan:  'BAĞLI RUHLAR',
};

const MERGE_HINT: Record<NDRaceKey, string> = {
  insan:   'Üç tier-3 askeri promosyon töreniyle bir tier-4 kaptan unvanı verirsin.',
  zerg:    'Üç larva evrim çukurunda eriyip yeni bir mutasyon formu doğurur. Genetik kazanım kalıcıdır.',
  otomat:  'Üç modülü tek bir yüksek-versiyon yapıya derler. Komponent compatibility ::OK ise birleşir.',
  canavar: 'Alfa, üç küçük canavarı yiyerek bir üst beden formuna yükselir. Yamyamlık vahşi yasadır.',
  seytan:  'Üç ruhu pakt mührüyle bağlayıp daha büyük bir varlığı çağırırsın. Ruh borçludur.',
};

const SLOT_COUNT = 3;
const COST_B = 200;

function riskColor(label: 'GÜVENLİ' | 'RİSKLİ' | 'KRİTİK') {
  if (label === 'GÜVENLİ') return ND.ok;
  if (label === 'RİSKLİ') return ND.warn;
  return ND.danger;
}

export default function MergePage() {
  const race = useNDRace();
  const [selected, setSelected] = useState<number[]>([]);
  const [sourceTier, setSourceTier] = useState(3);

  const pool = useMemo(() => buildPool(race, sourceTier), [race, sourceTier]);
  const preview = useMergePreview({
    race,
    sourceTier,
    selectedCount: selected.length,
    slotCount: SLOT_COUNT,
  });
  const { promotedTier, promotedName, successRate, projectedRate, canMerge, riskLabel } = preview;
  const risk = { color: riskColor(riskLabel), label: riskLabel };

  function toggle(idx: number) {
    setSelected((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      if (prev.length >= SLOT_COUNT) return prev;
      return [...prev, idx];
    });
  }

  function performMerge() {
    if (!canMerge) return;
    setSelected([]);
  }

  return (
    <div
      data-race={race.key}
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: ND.bg,
        color: ND.text,
        fontFamily: ND.body,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <NebulaBg race={race} intensity={0.8} dim={0.5} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Back strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          background: 'rgba(8,10,16,0.92)',
          borderBottom: `1px solid ${ND.border}`,
          backdropFilter: 'blur(12px)',
        }}>
          <Link
            href="/inventory"
            style={{
              fontFamily: ND.display,
              fontSize: 11,
              letterSpacing: '0.08em',
              color: ND.textDim,
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            ← Birim Envanteri
          </Link>
          <div style={{ width: 1, height: 14, background: ND.border }} aria-hidden />
          <Sigil race={race} size={16} />
          <H3 style={{ color: ND.text }}>{MERGE_NAMES[race.key as NDRaceKey] ?? 'Birleştirme'}</H3>
          <div style={{ flex: 1 }} />
          <Chip color={race.primary}>×3 → +1</Chip>
        </div>

        <HUD race={race} level={9} levelName="Metropol" />

        {/* Hint */}
        <div style={{ padding: '12px 14px 0' }}>
          <Caption>{MERGE_HINT[race.key as NDRaceKey] ?? MERGE_HINT.insan}</Caption>
        </div>

        {/* Merge ritual canvas */}
        <div style={{ padding: '14px 14px 0' }}>
          <Panel race={race} glow style={{ padding: 14 }}>
            <Eyebrow color={race.primary}>{MERGE_VERB[race.key as NDRaceKey] ?? 'Birleştir'} RİTÜELİ</Eyebrow>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginTop: 12,
            }}>
              {[0, 1, 2].map((slot) => {
                const filled = selected.length > slot;
                return (
                  <MergeSlot
                    key={slot}
                    race={race}
                    filled={filled}
                    tier={sourceTier}
                    onClick={() => {
                      if (filled) {
                        const idx = selected[slot];
                        toggle(idx);
                      }
                    }}
                  />
                );
              })}
              <div
                aria-hidden
                style={{
                  fontFamily: ND.display,
                  fontSize: 24,
                  color: race.primary,
                  margin: '0 6px',
                  textShadow: `0 0 12px ${race.glow}`,
                }}
              >
                →
              </div>
              <ResultSlot race={race} tier={promotedTier} ready={canMerge} name={promotedName} />
            </div>
          </Panel>
        </div>

        {/* Success rate */}
        <div style={{ padding: '10px 14px 0' }}>
          <Panel race={race} style={{ padding: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 8,
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Eyebrow color={race.primary}>BAŞARI ORANI</Eyebrow>
                <Code>
                  T{sourceTier} → T{promotedTier} · {promotedName.toUpperCase()}
                </Code>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span
                  aria-label={`Başarı oranı yüzde ${projectedRate}`}
                  style={{
                    fontFamily: ND.display,
                    fontSize: 26,
                    fontWeight: 700,
                    color: canMerge ? risk.color : ND.textDim,
                    letterSpacing: '0.04em',
                    textShadow: canMerge ? `0 0 12px ${risk.color}66` : undefined,
                    lineHeight: 1,
                  }}
                >
                  %{projectedRate}
                </span>
                <span
                  style={{
                    fontFamily: ND.mono,
                    fontSize: 9,
                    color: canMerge ? risk.color : ND.textMute,
                    letterSpacing: '0.12em',
                  }}
                >
                  {canMerge ? risk.label : `${selected.length}/${SLOT_COUNT} SLOT`}
                </span>
              </div>
            </div>
            <Bar
              value={projectedRate}
              max={100}
              color={canMerge ? risk.color : race.primaryDim}
              height={8}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                fontFamily: ND.mono,
                fontSize: 9,
                color: ND.textMute,
                letterSpacing: '0.08em',
              }}
            >
              <span>TABAN %{successRate}</span>
              <span>%{projectedRate} / %{successRate}</span>
            </div>
          </Panel>
        </div>

        {/* Source pool */}
        <div style={{ padding: '14px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow color={race.primary}>{POOL_LABEL[race.key as NDRaceKey] ?? POOL_LABEL.insan}</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Code>TIER</Code>
            {[2, 3, 4].map((t) => {
              const on = t === sourceTier;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSourceTier(t);
                    setSelected([]);
                  }}
                  aria-pressed={on}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    padding: '3px 8px',
                    fontFamily: ND.mono,
                    fontSize: 10,
                    color: on ? '#0A0E1A' : ND.textDim,
                    background: on ? race.primary : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${on ? race.primary : ND.border}`,
                    borderRadius: 2,
                  }}
                >
                  T{t}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, padding: '10px 14px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {pool.map((u, i) => {
              const on = selected.includes(i);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={on}
                  style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
                >
                  <div
                    style={{
                      aspectRatio: '1',
                      position: 'relative',
                      border: `1px solid ${on ? race.primary : ND.border}`,
                      background: on ? `${race.primary}22` : 'rgba(10,14,28,0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: on ? `0 0 12px ${race.glow}66` : undefined,
                    }}
                  >
                    <Sigil race={race} size={20} />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 2,
                        right: 3,
                        fontFamily: ND.mono,
                        fontSize: 8,
                        color: race.primary,
                        letterSpacing: '0.06em',
                      }}
                    >
                      T{u.tier}
                    </span>
                    {on && (
                      <Chip
                        color={race.primary}
                        style={{ position: 'absolute', top: 2, left: 2, fontSize: 7 }}
                      >
                        SEÇ
                      </Chip>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(8,10,16,0.92)',
          borderTop: `1px solid ${ND.border}`,
          backdropFilter: 'blur(12px)',
          display: 'flex',
          gap: 8,
        }}>
          <NDButton race={race} variant="ghost" size="md" style={{ flex: 1 }} onClick={() => setSelected([])}>
            İPTAL
          </NDButton>
          <NDButton race={race} size="md" style={{ flex: 2 }} disabled={!canMerge} onClick={performMerge}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {MERGE_VERB[race.key as NDRaceKey] ?? 'Birleştir'} · {COST_B}
              <ResIcon kind={race.resourceB.icon} size={12} color="#0A0E1A" />
              <span style={{ letterSpacing: '0.06em' }}>{race.resourceB.name.toUpperCase()}</span>
            </span>
          </NDButton>
        </div>

        <BottomNav race={race} active="base" />
      </div>
    </div>
  );
}

interface PoolUnit {
  id: string;
  name: string;
  tier: number;
}

function buildPool(race: NDRace, tier: number): PoolUnit[] {
  const base = race.units.find((u) => u.t === tier)?.n ?? race.units[0].n;
  return Array.from({ length: 8 }, (_, i) => ({
    id: `${race.key}-${tier}-${i}`,
    name: base,
    tier,
  }));
}

function MergeSlot({
  race,
  filled,
  tier,
  onClick,
}: {
  race: NDRace;
  filled: boolean;
  tier: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={filled ? 'Seçili birimi kaldır' : 'Boş slot'}
      style={{
        all: 'unset',
        cursor: filled ? 'pointer' : 'default',
        width: 64,
        height: 64,
        border: `1px solid ${filled ? race.primary : `${race.primary}44`}`,
        background: filled ? `${race.primary}22` : 'rgba(8,12,26,0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: filled ? `0 0 14px ${race.glow}55` : undefined,
      }}
    >
      {filled ? (
        <>
          <Sigil race={race} size={24} />
          <span style={{
            position: 'absolute',
            bottom: 3,
            right: 4,
            fontFamily: ND.mono,
            fontSize: 8,
            color: race.primary,
          }}>
            T{tier}
          </span>
        </>
      ) : (
        <span style={{ fontFamily: ND.display, fontSize: 24, color: `${race.primary}55` }}>+</span>
      )}
    </button>
  );
}

function ResultSlot({
  race,
  tier,
  ready,
  name,
}: {
  race: NDRace;
  tier: number;
  ready: boolean;
  name: string;
}) {
  return (
    <div
      style={{
        width: 84,
        height: 84,
        border: `1.5px solid ${ready ? race.primary : `${race.primary}55`}`,
        background: ready
          ? `radial-gradient(circle at 50% 40%, ${race.primary}44, transparent 70%), rgba(8,12,26,0.92)`
          : 'rgba(8,12,26,0.7)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: ready ? `0 0 20px ${race.glow}99` : undefined,
      }}
    >
      <Sigil race={race} size={32} glow={ready} />
      <div style={{
        position: 'absolute',
        bottom: 4,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: ND.mono,
        fontSize: 8,
        color: race.primary,
        letterSpacing: '0.06em',
        padding: '0 4px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        T{tier} {name}
      </div>
    </div>
  );
}
