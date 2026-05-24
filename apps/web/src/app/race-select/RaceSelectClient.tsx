'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Caption,
  Chip,
  Code,
  Eyebrow,
  H2,
  H3,
  ND,
  NDButton,
  RACES,
  type NDRace,
  type NDRaceKey,
  Sigil,
} from '@/components/handoff';
import { useRaceCommitment } from '@/components/race-selection/useRaceCommitment';
import { FetchError } from '@/lib/api';
import { raceApi } from '@/lib/race-api';
import { Race } from '@/types/units';

const RACE_ORDER: NDRaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];
const RACE_DESIGNATION: Record<NDRaceKey, string> = {
  insan: '218',
  zerg: '473',
  otomat: '091',
  canavar: '660',
  seytan: '812',
};

const CTA_LABEL: Record<NDRaceKey, string> = {
  insan: 'EVRENE GİR',
  zerg: "KOVAN'A KATIL",
  otomat: '::initialize',
  canavar: 'AV BAŞLAT',
  seytan: 'PAKT YAZ',
};

interface RaceCardProps {
  race: NDRace;
  selected: boolean;
  onSelect: () => void;
}

function RaceCard({ race, selected, onSelect }: RaceCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${race.name} — ${race.motto}`}
      onClick={onSelect}
      className="nd-notch"
      style={{
        position: 'relative',
        textAlign: 'left',
        cursor: 'pointer',
        padding: '12px 14px',
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        font: 'inherit',
        color: 'inherit',
        border: `1px solid ${selected ? race.primary : ND.border}`,
        background: selected
          ? `linear-gradient(90deg, color-mix(in oklch, ${race.primary}, transparent 86%), transparent 70%), rgba(10,14,28,0.85)`
          : 'rgba(10,14,28,0.6)',
        boxShadow: selected
          ? `0 0 0 1px color-mix(in oklch, ${race.primary}, transparent 66%), 0 0 24px -6px ${race.glow}`
          : 'none',
        transition: 'border-color 200ms ease, box-shadow 200ms ease, background 200ms ease',
      }}
    >
      <Sigil race={race} size={44} glow={selected} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <H3 style={{ color: race.primary, fontSize: 13 }}>{race.name.toUpperCase()}</H3>
          <Code style={{ fontSize: 9, color: ND.textMute }}>
            {race.short}-{RACE_DESIGNATION[race.key]}
          </Code>
        </div>
        <Caption style={{ fontSize: 11, marginTop: 2 }}>{race.motto}</Caption>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <Chip color={race.primary}>{race.resourceA.name}</Chip>
          <Chip color={race.primary}>{race.resourceB.name}</Chip>
        </div>
      </div>

      <span
        aria-hidden
        style={{
          width: 24,
          height: 24,
          flexShrink: 0,
          border: `1px solid ${selected ? race.primary : ND.border}`,
          background: selected ? race.primary : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-bg-elevated)',
          fontFamily: ND.display,
          fontWeight: 900,
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        {selected ? '✓' : ''}
      </span>
    </button>
  );
}

export function RaceSelectClient() {
  const router = useRouter();
  const { committed, commit } = useRaceCommitment();
  const [selectedKey, setSelectedKey] = useState<NDRaceKey>(
    (committed as NDRaceKey | null) ?? 'insan',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = RACES[selectedKey];

  async function handleStart() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    // Commit locally first so the confirm screen always has a race even when
    // the API is unreachable (offline/dev). Backend persistence is best-effort.
    commit(selectedKey as Race);

    try {
      await raceApi.selectRace(selectedKey);
    } catch (err) {
      // 400 = "race already selected" — fine to proceed. Anything else: surface
      // a hint but still continue into the cinematic.
      if (!(err instanceof FetchError) || err.status !== 400) {
        setError(err instanceof Error ? err.message : 'Sunucuya ulaşılamadı');
      }
    } finally {
      setSubmitting(false);
      router.push(`/race-confirm?race=${selectedKey}`);
    }
  }

  return (
    <div
      data-race={selectedKey}
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: ND.bgDeep,
        color: ND.text,
        fontFamily: ND.body,
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 85% 55% at 50% 0%, ${selected.glow} 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 50% 100%, ${selected.primaryDim} 0%, transparent 65%)
          `,
          opacity: 0.45,
          pointerEvents: 'none',
          transition: 'background 500ms ease',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(3,5,11,0.55) 0%, rgba(3,5,11,0.15) 35%, rgba(3,5,11,0.92) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Locked-height column with three regions:
       *   1. header — fixed at top
       *   2. race list — scrolls when 5 cards + header don't fit
       *      the viewport (the common case on phones / narrow preview)
       *   3. footer with caption + sticky CTA — never leaves the viewport
       *
       * Without this split the CTA at the bottom of a flex-column with
       * `minHeight: 100dvh` gets pushed below the fold on short screens
       * and there's no visible scroll affordance to find it. */}
      <main
        className="nd-slide-up"
        style={{
          position: 'relative',
          maxWidth: 440,
          margin: '0 auto',
          height: '100dvh',
          padding: '52px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <header style={{ textAlign: 'center', padding: '0 8px', flexShrink: 0 }}>
          <Eyebrow color={selected.primary} style={{ marginBottom: 6 }}>
            I. KOZMİK YANKI / İLK AŞAMA
          </Eyebrow>
          <H2 style={{ color: ND.text }}>IRKINI SEÇ</H2>
          <Caption style={{ marginTop: 6, color: ND.textDim }}>
            Bu seçim kalıcıdır. Beş yorum, beş yol.
          </Caption>
        </header>

        <div
          role="radiogroup"
          aria-label="Irk listesi"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '4px 2px',
          }}
        >
          {RACE_ORDER.map((key) => (
            <RaceCard
              key={key}
              race={RACES[key]}
              selected={key === selectedKey}
              onSelect={() => setSelectedKey(key)}
            />
          ))}
        </div>

        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {error && (
            <div
              role="alert"
              style={{
                padding: '8px 12px',
                borderRadius: 4,
                fontFamily: ND.mono,
                fontSize: 11,
                background: 'color-mix(in oklch, oklch(0.65 0.22 25), transparent 84%)',
                border: '1px solid color-mix(in oklch, oklch(0.65 0.22 25), transparent 60%)',
                color: ND.danger,
                textAlign: 'center',
              }}
            >
              ÇEVRİMDIŞI · YEREL DEVAM · {error}
            </div>
          )}

          <Caption style={{ textAlign: 'center' }}>
            <span
              style={{
                color: selected.primary,
                fontFamily: ND.display,
                letterSpacing: '0.12em',
              }}
            >
              {selected.name.toUpperCase()}
            </span>{' '}
            seçildi · {selected.title}
          </Caption>

          <NDButton
            race={selected}
            size="lg"
            full
            onClick={handleStart}
            disabled={submitting}
          >
            {submitting ? 'BAĞLANIYOR…' : `${CTA_LABEL[selectedKey]} →`}
          </NDButton>
        </div>
      </main>
    </div>
  );
}
