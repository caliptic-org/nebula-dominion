'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNDRace } from './useNDRace';
import { useWizardStep } from '@/hooks/useWizardStep';
import { ND } from './nd-tokens';

/**
 * Sticky bottom-right hint that surfaces the next onboarding step the
 * player should take. Reads from `useWizardStep` which walks the static
 * step list against live server state — when every step is done (or the
 * player hits "tekrar gösterme"), this renders null.
 *
 * Mount it once on /base (the always-return-here screen) and on any
 * other page where you want first-time guidance — the hook caches its
 * derivation per render cycle so multiple mounts are cheap.
 *
 * Two states:
 *   - collapsed: 1-line chip "🎯 Sonraki Adım: <title> →" (default)
 *   - expanded: chip + description paragraph + CTA + dismiss/hide buttons
 */
export function WizardHint() {
  const race = useNDRace();
  const router = useRouter();
  const { step, route, dismissStep, dismissAll, hiddenForever } = useWizardStep();
  const [expanded, setExpanded] = useState(false);

  // Nothing to show — wizard either finished or user opted out.
  if (!step || !route || hiddenForever) return null;

  const accent = race.primary;

  return (
    <div
      role="complementary"
      aria-label="Sonraki adım rehberi"
      style={{
        position: 'fixed',
        right: 12,
        // Sits above the bottom nav (which is ~64px tall) with a little gap.
        bottom: 80,
        zIndex: 50,
        maxWidth: expanded ? 320 : 280,
        background: 'rgba(8, 12, 26, 0.92)',
        border: `1px solid ${accent}66`,
        borderRadius: 8,
        boxShadow: `0 0 18px -4px ${race.glow}aa, inset 0 1px 0 rgba(255,255,255,0.04)`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        overflow: 'hidden',
        transition: 'max-width 180ms ease',
      }}
    >
      {/* Header row — always visible, click toggles expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: ND.text,
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: 4,
            background: `${accent}33`,
            color: accent,
            fontSize: 12,
          }}
        >
          ✦
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: ND.mono,
              fontSize: 8,
              letterSpacing: '0.18em',
              color: accent,
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            Sonraki Adım
          </div>
          <div
            style={{
              fontFamily: ND.display,
              fontSize: 12,
              color: ND.text,
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {step.title}
          </div>
        </div>
        <span aria-hidden style={{ color: ND.textDim, fontFamily: ND.mono, fontSize: 14 }}>
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {/* Expanded body — description + actions */}
      {expanded && (
        <div
          style={{
            borderTop: `1px solid ${ND.border}`,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <p
            style={{
              fontFamily: ND.body,
              fontSize: 11,
              lineHeight: 1.4,
              color: ND.textDim,
              margin: 0,
            }}
          >
            {step.description}
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                router.push(route);
              }}
              style={{
                flex: 1,
                padding: '6px 10px',
                background: accent,
                color: '#06080F',
                border: 'none',
                borderRadius: 4,
                fontFamily: ND.display,
                fontSize: 11,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: `0 0 12px -2px ${race.glow}`,
              }}
            >
              {step.ctaText ?? 'Git'} →
            </button>
            <button
              type="button"
              onClick={() => {
                dismissStep(step.id);
                setExpanded(false);
              }}
              title="Bu adımı geç"
              style={{
                padding: '6px 8px',
                background: 'transparent',
                color: ND.textDim,
                border: `1px solid ${ND.border}`,
                borderRadius: 4,
                fontFamily: ND.mono,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Geç
            </button>
          </div>

          <button
            type="button"
            onClick={() => dismissAll()}
            style={{
              background: 'transparent',
              color: ND.textMute,
              border: 'none',
              fontFamily: ND.mono,
              fontSize: 9,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'right',
            }}
          >
            Bir daha gösterme ×
          </button>
        </div>
      )}
    </div>
  );
}
