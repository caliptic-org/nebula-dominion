'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { toast } from '@/components/handoff/Toaster';
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
  const locked = !race.playable;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={locked}
      aria-label={
        locked
          ? `${race.name} — yakında oynanabilir`
          : `${race.name} — ${race.motto}`
      }
      onClick={onSelect}
      className="nd-notch"
      style={{
        position: 'relative',
        textAlign: 'left',
        cursor: locked ? 'not-allowed' : 'pointer',
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
        // Locked races render grayscale + dimmed so they read as "catalog
        // visible, gameplay disabled" rather than misleadingly selectable.
        // The backend rejects POST /users/me/race for non-HUMAN/ZERG with a
        // BadRequestException — without this visual signal the user has no
        // way to know which races are actually playable.
        filter: locked ? 'grayscale(0.85) brightness(0.78)' : 'none',
        opacity: locked ? 0.78 : 1,
        transition: 'border-color 200ms ease, box-shadow 200ms ease, background 200ms ease',
      }}
    >
      <Sigil race={race} size={44} glow={selected && !locked} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <H3 style={{ color: race.primary, fontSize: 13 }}>{race.name.toUpperCase()}</H3>
          <Code style={{ fontSize: 9, color: ND.textMute }}>
            {race.short}-{RACE_DESIGNATION[race.key]}
          </Code>
          {locked && (
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: ND.mono,
                fontSize: 9,
                letterSpacing: '0.12em',
                padding: '2px 6px',
                borderRadius: 2,
                border: `1px solid ${ND.borderHi}`,
                color: ND.warn,
                background: 'rgba(10,14,28,0.85)',
              }}
            >
              YAKINDA
            </span>
          )}
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
          background: selected && !locked ? race.primary : 'transparent',
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
        {selected && !locked ? '✓' : locked ? '🔒' : ''}
      </span>
    </button>
  );
}

export function RaceSelectClient() {
  const t = useTranslations('races');
  const router = useRouter();
  const { committed, commit } = useRaceCommitment();
  // Default to the committed race only if it's still playable — otherwise
  // fall back to insan (always playable) so the CTA never starts wired to
  // an unplayable race. Prevents handleStart from immediately bouncing on
  // its own belt-and-braces guard.
  const initialKey: NDRaceKey =
    committed && committed in RACES && RACES[committed as NDRaceKey].playable
      ? (committed as NDRaceKey)
      : 'insan';
  const [selectedKey, setSelectedKey] = useState<NDRaceKey>(initialKey);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = RACES[selectedKey];

  /**
   * Handle card tap. Unplayable races flash a toast and do NOT update the
   * `selectedKey` state — i.e. the CTA stays bound to the previously chosen
   * playable race so the user can still proceed by tapping start without
   * having to reselect insan/zerg from scratch.
   *
   * This is the *client-side* half of the gate; the server still enforces
   * (POST /users/me/race rejects non-HUMAN/ZERG with a BadRequestException),
   * and handleStart() also has a belt-and-braces check.
   */
  function handleSelect(key: NDRaceKey) {
    const race = RACES[key];
    if (!race.playable) {
      toast.info('Bu ırk yakında oynanabilir, başka birini seç.');
      return;
    }
    setSelectedKey(key);
  }

  /**
   * Confirm the race choice and continue into the awakening cinematic.
   *
   * Historical note (cycle-6 audit): the prior implementation treated *any*
   * 400 from POST /users/me/race as "race already selected, navigate to
   * /race-confirm". The backend whitelists only HUMAN + ZERG (see
   * apps/api/src/user/user.service.ts → selectRace) and rejects everything
   * else with a `BadRequestException("Bu ırk yakında oynanabilir olacak …")`.
   * Picking otomat / canavar / şeytan would therefore: silently fail the
   * persist call → play the cinematic → drop the user on /base with
   * `users.race = null` → /base/production refuses to queue ("Irk
   * seçilmemiş") → battles run with placeholder data. Day-0 churn for the
   * three non-shipped races.
   *
   * Fix:
   *   1. Block unplayable selections client-side (handleSelect + the gated
   *      onSelect handler + the playable flag on the catalog).
   *   2. Belt-and-braces guard here so a stale state can't slip through.
   *   3. Parse 400 bodies before treating them as "already selected": only
   *      messages mentioning "zaten" (Turkish "already") still bypass into
   *      the cinematic; "yakında oynanabilir" messages stay on the
   *      selector with a toast and let the user pick a different race.
   *   4. All other errors keep the user on the screen (no router.push
   *      inside `finally`).
   */
  async function handleStart() {
    if (submitting) return;

    // Belt-and-braces — handleSelect should have prevented this, but a
    // stale `selectedKey` (e.g. a default that became unplayable) should
    // never silently 400 through to /race-confirm.
    if (!selected.playable) {
      toast.info('Bu ırk yakında oynanabilir, başka birini seç.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await raceApi.selectRace(selectedKey);
      // Mirror the backend-confirmed race into localStorage *after* the
      // server accepts it. Done here (not before the call) so we never
      // commit to a race the API will reject — the previous order
      // committed first and then silently swallowed the 400.
      commit(selectedKey as Race);
      router.push(`/race-confirm?race=${selectedKey}`);
      return;
    } catch (err) {
      if (err instanceof FetchError && err.status === 400) {
        // Distinguish the two backend 400 cases by inspecting the raw
        // body — neither is a true 400 "bad request" from the user's
        // perspective. The translated `err.message` keeps the original
        // Turkish (translateBackendError has no rule for these) so we can
        // pattern-match it directly.
        const raw = err.message ?? '';
        const rawData = ((err.data as { message?: string | string[] })?.message) ?? '';
        const haystack = (
          raw + ' ' + (Array.isArray(rawData) ? rawData.join(' ') : rawData)
        ).toLowerCase();

        if (haystack.includes('yakında oynanabilir')) {
          // Server-side "race not playable yet". Stay on /race-select.
          toast.info('Bu ırk yakında oynanabilir, başka birini seç.');
          setError(null);
          return;
        }

        if (
          haystack.includes('zaten') ||
          haystack.includes('already')
        ) {
          // "Race has already been chosen" — the user picked this race on
          // another device. Mirror locally and proceed into the cinematic.
          commit(selectedKey as Race);
          router.push(`/race-confirm?race=${selectedKey}`);
          return;
        }

        // Unknown 400 — surface the message and stay put.
        setError(err.message);
        return;
      }

      // Network / 5xx / non-FetchError — surface and stay put so the user
      // can retry. Previously this also navigated into the cinematic via
      // the `finally`-block router.push, which masked outages.
      setError(err instanceof Error ? err.message : 'Sunucuya ulaşılamadı');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      data-race={selectedKey}
      style={{
        position: 'relative',
        height: '100dvh',
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
          <H2 style={{ color: ND.text }}>{t('selectTitle')}</H2>
          <Caption style={{ marginTop: 6, color: ND.textDim }}>
            {t('selectSubtitle')}
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
              onSelect={() => handleSelect(key)}
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
              SUNUCU HATASI · TEKRAR DENE · {error}
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
