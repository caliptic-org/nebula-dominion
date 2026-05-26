'use client';

import { useRaceTheme } from '@/hooks/useRaceTheme';
import { useNDRace } from '@/components/handoff/useNDRace';
import { raceShape } from '@/components/handoff';

interface ShortcutButtonsProps {
  unreadMessages?: number;
  activeMissions?: number;
  /** Retained for API compatibility; the inventory shortcut was removed
   *  (the right-rail RaceQuickActions already exposes TUGAY → /inventory
   *  and the two were duplicating each other). */
  inventoryStatus?: 'normal' | 'full' | 'critical';
  onChatClick?: () => void;
  onMissionsClick?: () => void;
  onInventoryClick?: () => void;
}

/* Top-right floating chat + missions shortcuts.
 *
 * Visual contract mirrors `RaceQuickActions` (right-rail vertical chip
 * stack on /base) — same 34×26 race-tinted box with a tiny icon + label
 * stack.  Earlier this was a glass pill with 40×40 emoji buttons that
 * read as a separate UI layer; aligning the chip shape keeps the two
 * floating columns visually related.
 *
 * Inventory button removed — `RaceQuickActions` ships TUGAY → /inventory,
 * so the third shortcut here was a duplicate target and the column was
 * crowding the top-right corner with redundant affordance.
 */
export function ShortcutButtons({
  unreadMessages = 3,
  activeMissions = 2,
  onChatClick,
  onMissionsClick,
}: ShortcutButtonsProps) {
  const race = useNDRace();
  const { raceColor, raceGlow } = useRaceTheme();
  const shape = raceShape(race.key, 'card');

  const buttons = [
    {
      id: 'chat',
      glyph: '✉',
      label: 'SOHBET',
      badge: unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : String(unreadMessages)) : null,
      badgeColor: '#ff3355',
      badgeShadow: 'rgba(255,51,85,0.6)',
      badgePulse: true,
      onClick: onChatClick,
    },
    {
      id: 'missions',
      glyph: '◎',
      label: 'GÖREV',
      badge: activeMissions > 0 ? String(activeMissions) : null,
      badgeColor: raceColor,
      badgeShadow: raceGlow,
      badgePulse: false,
      onClick: onMissionsClick,
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        top: '4.5rem',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
      role="toolbar"
      aria-label="Hızlı erişim kısayolları"
    >
      {buttons.map((btn) => (
        <button
          key={btn.id}
          type="button"
          onClick={btn.onClick}
          title={btn.label}
          aria-label={`${btn.label}${btn.badge ? ` (${btn.badge})` : ''}`}
          style={{
            all: 'unset',
            position: 'relative',
            // Same 34×26 footprint as the RaceQuickActions chips on the
            // other side of the screen.  Keeps the two floating columns
            // visually paired instead of one looking like a glass pill
            // from a different design language.
            width: 34,
            height: 26,
            padding: '2px 0',
            background: 'rgba(8,12,26,0.78)',
            border: `1px solid ${raceColor}77`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            color: raceColor,
            cursor: 'pointer',
            ...shape,
          }}
        >
          <span aria-hidden style={{ fontSize: 11, lineHeight: 1 }}>
            {btn.glyph}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-nd-display), system-ui',
              fontSize: 7,
              letterSpacing: '0.08em',
              lineHeight: 1,
            }}
          >
            {btn.label}
          </span>

          {btn.badge && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                minWidth: 12,
                height: 12,
                padding: '0 2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                background: btn.badgeColor,
                boxShadow: `0 0 6px ${btn.badgeShadow}`,
                color: '#fff',
                fontFamily: 'var(--font-nd-display), system-ui',
                fontSize: 7,
                fontWeight: 900,
                lineHeight: 1,
                animation: btn.badgePulse ? 'pulse 2s ease-in-out infinite' : undefined,
              }}
            >
              {btn.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
