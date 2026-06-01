'use client';

/**
 * <GatedButton gateId="…"> — drop-in NDButton replacement that reads the gate
 * state from `useGates()` and renders three things on top:
 *
 *   1. The button itself (disabled when locked).
 *   2. A 🔒 prefix on the label + a hint subtitle ("Kışla Lv 1 gerekli").
 *   3. A modal that opens on a locked-button tap, listing every unmet
 *      requirement with current vs required values.
 *
 * Source-of-truth lives in apps/game-server/src/progression/gates.config.ts.
 * The frontend doesn't decide what unlocks — it just renders whatever
 * GET /api/progression/gates says.
 *
 * Note on "soft" failures: even when a gate is technically `unlocked` (all
 * hard rules met), individual requirements may still be unmet (e.g. not
 * enough minerals). Those don't disable the button — the backend will reject
 * the action with a toast. We just show them on the modal for transparency.
 */

import { useState, type CSSProperties, type ReactNode } from 'react';
import { NDButton } from './atoms';
import { NDModal } from './layout';
import type { NDRace } from './nd-tokens';
import { useGate, type GateEvalResult, type ResolvedRequirement } from '@/lib/gates';

interface GatedButtonProps {
  gateId: string;
  race?: NDRace;
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
  style?: CSSProperties;
  /** When true, lock blocks the click. When false, lock is informational only. */
  enforce?: boolean;
  /** Override for situations where the page already disables (e.g. busy state). */
  forceDisabled?: boolean;
  /** Optional one-line subtitle below the button when locked.
   *  Defaults to the gate's `primaryHint`. Pass `null` to hide entirely. */
  hint?: string | null;
}

/**
 * Drop-in replacement for <NDButton> that consults useGate() and renders
 * lock affordances. If the gate is not in the config yet (returns null),
 * GatedButton behaves like a plain NDButton — no harm, easy to migrate.
 */
export function GatedButton({
  gateId,
  race,
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  full,
  style,
  enforce = true,
  forceDisabled = false,
  hint,
}: GatedButtonProps) {
  const gate = useGate(gateId);
  const [modalOpen, setModalOpen] = useState(false);

  const locked = enforce && gate !== null && !gate.unlocked;
  const disabled = forceDisabled || locked;

  const subtitle = hint === null
    ? null
    : (locked ? (hint ?? gate?.primaryHint ?? null) : null);

  function handleClick() {
    if (locked) {
      // Locked → open explanatory modal instead of silently doing nothing.
      // User explicitly chose tap-to-modal in the gate UX spec.
      setModalOpen(true);
      return;
    }
    onClick?.();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: full ? '100%' : undefined }}>
      <NDButton
        race={race}
        variant={variant}
        size={size}
        full={full}
        style={style}
        disabled={disabled}
        onClick={handleClick}
      >
        {locked ? <>🔒&nbsp;{children}</> : children}
      </NDButton>
      {subtitle ? (
        <span
          aria-hidden
          style={{
            fontSize: 11,
            opacity: 0.65,
            textAlign: 'center',
            letterSpacing: 0.3,
          }}
        >
          {subtitle}
        </span>
      ) : null}

      {gate && race ? (
        <RequirementsModal
          race={race}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          gate={gate}
        />
      ) : null}
    </div>
  );
}

/**
 * Modal body: lists every requirement with current vs required + a check/
 * cross. Headlines split into "Açılması için" (hard locks not yet met) and
 * "Maliyet" (soft locks — resource costs). When all locks are met but soft
 * costs aren't, the button is technically unlocked and the modal just acts
 * as a cost preview.
 */
function RequirementsModal({
  race, open, onClose, gate,
}: { race: NDRace; open: boolean; onClose: () => void; gate: GateEvalResult }) {
  const hardUnmet = gate.requirements.filter((r) => r.severity === 'hard' && !r.met);
  const softUnmet = gate.requirements.filter((r) => r.severity === 'soft' && !r.met);
  const allMet = hardUnmet.length === 0 && softUnmet.length === 0;

  return (
    <NDModal
      race={race}
      open={open}
      onClose={onClose}
      eyebrow={allMet ? 'AÇIK' : 'KİLİTLİ'}
      title={allMet ? 'Hazırsın' : 'Bunun için gerekli'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {hardUnmet.length > 0 ? (
          <Section title="Açılması için" rows={hardUnmet} />
        ) : null}
        {softUnmet.length > 0 ? (
          <Section title="Maliyet" rows={softUnmet} />
        ) : null}
        {allMet ? (
          <p style={{ margin: 0, opacity: 0.7, fontSize: 13 }}>
            Bütün koşullar sağlandı. Bu özellik şu anda kullanılabilir.
          </p>
        ) : null}
      </div>
    </NDModal>
  );
}

function Section({ title, rows }: { title: string; rows: ResolvedRequirement[] }) {
  return (
    <div>
      <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: 0.4, marginBottom: 6 }}>{title.toUpperCase()}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '6px 8px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <span style={{ fontSize: 13 }}>
              <span style={{ marginRight: 6 }}>{r.met ? '✓' : '✗'}</span>
              {r.long}
            </span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>
              {r.current} / {r.required}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
