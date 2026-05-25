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
 * Three states:
 *   - icon (default): a small ✦ pulse in the bottom-right (~40px) so the
 *     hint is discoverable without dominating the /base view.  The pulse
 *     animation calls attention to it without being aggressive.
 *   - chip (on hover or first focus): expands to "Sonraki Adım: <title> →"
 *   - panel (on click): full description + CTA + dismiss/hide buttons
 */
export function WizardHint() {
  const race = useNDRace();
  const router = useRouter();
  const { step, route, dismissStep, dismissAll, hiddenForever } = useWizardStep();
  // `panelOpen` = full panel with description + CTA.  Hover-derived chip
  // state lives in CSS via :hover so it doesn't fight with focus management.
  const [panelOpen, setPanelOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Nothing to show — wizard either finished or user opted out.
  if (!step || !route || hiddenForever) return null;

  const accent = race.primary;
  // Chip mode = hovered OR panelOpen (so the chip stays visible behind
  // the panel while it's expanded).
  const showChip = hovered || panelOpen;

  return (
    <div
      role="complementary"
      aria-label="Sonraki adım rehberi"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        right: 12,
        bottom: 80,
        zIndex: 50,
        // Width grows from icon (40px) → chip (~260px) → panel (320px).
        // The transition makes the discovery feel intentional rather
        // than jarring.
        width: panelOpen ? 320 : showChip ? 260 : 40,
        background: 'rgba(8, 12, 26, 0.92)',
        border: `1px solid ${accent}66`,
        borderRadius: showChip ? 8 : 20,
        boxShadow: `0 0 18px -4px ${race.glow}aa, inset 0 1px 0 rgba(255,255,255,0.04)`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        overflow: 'hidden',
        transition: 'width 220ms ease, border-radius 220ms ease',
      }}
    >
      {/* Header row — always visible, click toggles panel */}
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-expanded={panelOpen}
        aria-label={showChip ? undefined : `Sonraki adım: ${step.title}`}
        title={showChip ? undefined : step.title}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: showChip ? '8px 12px' : '8px',
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
            width: 24,
            height: 24,
            flexShrink: 0,
            borderRadius: 4,
            background: `${accent}33`,
            color: accent,
            fontSize: 13,
            // Soft pulse to advertise interactivity when collapsed; freezes
            // once the player engages so the panel doesn't shimmer.
            animation: showChip ? 'none' : 'nd-wizard-pulse 2200ms ease-in-out infinite',
          }}
        >
          ✦
        </span>
        {/* Text only renders in chip/panel mode — kept mounted but width-
         *  collapsed so the icon doesn't shift when the chip opens. */}
        {showChip && (
          <>
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
              {panelOpen ? '▾' : '▸'}
            </span>
          </>
        )}
      </button>

      {/* Expanded body — description + actions */}
      {panelOpen && (
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
                setPanelOpen(false);
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
                setPanelOpen(false);
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

      {/* Pulse keyframes — scoped via <style> so the component remains
       *  self-contained. Lives once at the root since style+keyframes are
       *  process-wide; mounting twice is fine (browser dedupes the rule). */}
      <style>{`@keyframes nd-wizard-pulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.12); opacity: 0.85 } }`}</style>
    </div>
  );
}
