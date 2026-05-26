'use client';

/* Shared layout primitives — ScreenHeader / ScreenFooter / DetailLayout / NDModal.
 *
 * The goal is to stop every detail page re-implementing the same "back button
 * + scrollable middle + action bar" pattern inline (which led to height /
 * z-index / spacing inconsistencies between pages).  Every detail / form /
 * popup screen should compose one of these three primitives so spacing,
 * typography and behaviour stay identical across the app.
 */

import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { ND, type NDRace } from './nd-tokens';
import { NebulaBg } from './Sigil';

/* ── ScreenHeader ─────────────────────────────────────────────────────────
 * A standardized header strip with:
 *   - leading "← Geri" back button (calls router.back() by default)
 *   - title (H3-sized) and optional eyebrow
 *   - optional right-side accessory slot
 *
 * Use it at the top of every detail / form / popup-page screen so the
 * back-button affordance lives in the same spot everywhere. */
interface ScreenHeaderProps {
  /** Title shown next to the back button. */
  title: ReactNode;
  /** Small overline shown above the title (typically a section name or breadcrumb). */
  eyebrow?: ReactNode;
  /** Right-aligned accessory — chips, codes, icon buttons. */
  right?: ReactNode;
  /** Custom back handler.  When omitted, calls `router.back()`. */
  onBack?: () => void;
  /** Drops the back button entirely (root screens). */
  hideBack?: boolean;
  /** Override the back label (defaults to "Geri"). */
  backLabel?: string;
}

export function ScreenHeader({
  title,
  eyebrow,
  right,
  onBack,
  hideBack,
  backLabel = 'Geri',
}: ScreenHeaderProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'rgba(8,10,16,0.92)',
        borderBottom: `1px solid ${ND.border}`,
        backdropFilter: 'blur(12px)',
        minHeight: 44,
        flexShrink: 0,
      }}
    >
      {!hideBack && (
        <button
          type="button"
          onClick={handleBack}
          aria-label={backLabel}
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: ND.display,
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: ND.textDim,
            padding: '4px 8px',
            border: `1px solid ${ND.border}`,
            borderRadius: 2,
          }}
        >
          ← {backLabel}
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow && (
          <div
            style={{
              fontFamily: ND.mono,
              fontSize: 9,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color: ND.textMute,
              marginBottom: 1,
            }}
          >
            {eyebrow}
          </div>
        )}
        <div
          style={{
            fontFamily: ND.display,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: ND.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </header>
  );
}

/* ── ScreenFooter ─────────────────────────────────────────────────────────
 * The action / CTA bar pinned to the bottom of a detail screen.
 * Children are typically 1–2 NDButton instances (use `flex: 1` on each
 * to fill the row). */
interface ScreenFooterProps {
  children: ReactNode;
  /** Extra style overrides for the footer wrapper. */
  style?: CSSProperties;
}

export function ScreenFooter({ children, style }: ScreenFooterProps) {
  return (
    <footer
      style={{
        display: 'flex',
        gap: 8,
        padding: '10px 14px',
        background: 'rgba(8,10,16,0.92)',
        borderTop: `1px solid ${ND.border}`,
        backdropFilter: 'blur(12px)',
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </footer>
  );
}

/* ── DetailLayout ─────────────────────────────────────────────────────────
 * Full-page wrapper enforcing the header + scrollable middle + footer
 * pattern.  Use it for every detail / form / drill-in screen so the chrome
 * always looks the same and the player learns the affordances once.
 *
 *   <DetailLayout
 *     race={race}
 *     header={<ScreenHeader title="…" right={<Chip>…</Chip>} />}
 *     footer={<ScreenFooter><NDButton …/></ScreenFooter>}>
 *     {…page content…}
 *   </DetailLayout>
 */
interface DetailLayoutProps {
  /** Race for theming / data-attribute. */
  race: NDRace;
  /** Sticky header element — typically <ScreenHeader …/>. */
  header: ReactNode;
  /** Sticky footer — typically <ScreenFooter><NDButton …/></ScreenFooter>.
   * Omit when the screen has no bottom actions. */
  footer?: ReactNode;
  /** Page body — auto-wrapped in a scrolling <main>. */
  children: ReactNode;
  /** Nebula background dim. Default 0.65 (matches the design). */
  bgDim?: number;
  /** Extra style on the outermost container. */
  style?: CSSProperties;
  /** Extra style on the scrolling <main>. */
  mainStyle?: CSSProperties;
}

export function DetailLayout({
  race,
  header,
  footer,
  children,
  bgDim = 0.65,
  style,
  mainStyle,
}: DetailLayoutProps) {
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
        ...style,
      }}
    >
      <NebulaBg race={race} intensity={0.7} dim={bgDim} />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        {header}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '12px 14px',
            ...mainStyle,
          }}
        >
          {children}
        </main>
        {footer}
      </div>
    </div>
  );
}

/* ── NDModal ──────────────────────────────────────────────────────────────
 * Centered modal popup with backdrop click-to-dismiss + ESC key support.
 * Use it for confirms / info dialogs / level-up popups / tier-up modals
 * instead of re-implementing position:fixed overlays inline. */
interface NDModalProps {
  /** Race for accent colours and glow. */
  race: NDRace;
  /** Whether the modal is currently open. */
  open: boolean;
  /** Called when the user dismisses via backdrop / ESC / close button. */
  onClose: () => void;
  /** Optional modal title shown in the header band. */
  title?: ReactNode;
  /** Optional eyebrow shown above the title. */
  eyebrow?: ReactNode;
  /** Body content — scrolls when it exceeds the available vertical space. */
  children: ReactNode;
  /** Optional footer actions — typically 1–2 NDButton.  Adds a top border. */
  actions?: ReactNode;
  /** Max content width.  Default 360px (mobile-first modal). */
  maxWidth?: number;
  /** Whether clicking the backdrop dismisses the modal.  Default true. */
  closeOnBackdrop?: boolean;
  /** Hides the × close button in the header.  Default false. */
  hideClose?: boolean;
}

export function NDModal({
  race,
  open,
  onClose,
  title,
  eyebrow,
  children,
  actions,
  maxWidth = 360,
  closeOnBackdrop = true,
  hideClose = false,
}: NDModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // ESC key + body scroll lock while the modal is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (!closeOnBackdrop) return;
        if (e.target === backdropRef.current) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(3,5,11,0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth,
          background: ND.surface,
          border: `1px solid ${race.primary}55`,
          boxShadow: `0 12px 48px -8px ${race.glow}66`,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100dvh - 32px)',
        }}
      >
        {(title || eyebrow || !hideClose) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderBottom: `1px solid ${ND.border}`,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {eyebrow && (
                <div
                  style={{
                    fontFamily: ND.mono,
                    fontSize: 9,
                    letterSpacing: '0.20em',
                    textTransform: 'uppercase',
                    color: race.primary,
                    marginBottom: 2,
                  }}
                >
                  {eyebrow}
                </div>
              )}
              {title && (
                <div
                  style={{
                    fontFamily: ND.display,
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color: ND.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {title}
                </div>
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Kapat"
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  width: 26,
                  height: 26,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: ND.textDim,
                  border: `1px solid ${ND.border}`,
                  fontFamily: ND.mono,
                  fontSize: 14,
                }}
              >
                ×
              </button>
            )}
          </div>
        )}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 14,
            minHeight: 0,
          }}
        >
          {children}
        </div>
        {actions && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '10px 12px',
              borderTop: `1px solid ${ND.border}`,
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
