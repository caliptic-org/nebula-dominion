'use client';

import { useRaceTheme } from '@/hooks/useRaceTheme';
import { useNDRace } from '@/components/handoff/useNDRace';
import { raceShape, RAIL_CHIP_SIZE } from '@/components/handoff';

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
        // Same stack gap as RaceQuickActions on the other side so both
        // columns read as a single design system.
        gap: RAIL_CHIP_SIZE.stackGap,
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
            // Shared chip dimensions — sourced from RAIL_CHIP_SIZE so the
            // sohbet / görev column stays pixel-aligned with the
            // RaceQuickActions column and the TOPLA collect button.
            width: RAIL_CHIP_SIZE.width,
            height: RAIL_CHIP_SIZE.height,
            padding: RAIL_CHIP_SIZE.padding,
            background: 'rgba(8,12,26,0.78)',
            border: `1px solid ${raceColor}77`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: RAIL_CHIP_SIZE.gap,
            color: raceColor,
            cursor: 'pointer',
            boxSizing: 'border-box',
            ...shape,
          }}
        >
          <span aria-hidden style={{ fontSize: RAIL_CHIP_SIZE.iconSize + 2, lineHeight: 1 }}>
            {btn.glyph}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-nd-display), system-ui',
              fontSize: RAIL_CHIP_SIZE.fontSize,
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
