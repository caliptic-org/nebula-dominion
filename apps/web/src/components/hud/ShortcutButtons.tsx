'use client';

import { useRaceTheme } from '@/hooks/useRaceTheme';
import clsx from 'clsx';

interface ShortcutButtonsProps {
  unreadMessages?: number;
  activeMissions?: number;
  inventoryStatus?: 'normal' | 'full' | 'critical';
  onChatClick?: () => void;
  onMissionsClick?: () => void;
  onInventoryClick?: () => void;
}

export function ShortcutButtons({
  unreadMessages = 3,
  activeMissions = 2,
  inventoryStatus = 'normal',
  onChatClick,
  onMissionsClick,
  onInventoryClick,
}: ShortcutButtonsProps) {
  const { raceColor, raceGlow, raceDim } = useRaceTheme();

  const buttons = [
    {
      id: 'chat',
      icon: '💬',
      label: 'Sohbet',
      badge: unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : String(unreadMessages)) : null,
      badgeColor: '#ff3355',
      badgeShadow: 'rgba(255,51,85,0.6)',
      badgePulse: true,
      onClick: onChatClick,
    },
    {
      id: 'missions',
      icon: '🎯',
      label: 'Görevler',
      badge: activeMissions > 0 ? String(activeMissions) : null,
      badgeColor: raceColor,
      badgeShadow: raceGlow,
      badgePulse: false,
      onClick: onMissionsClick,
    },
    {
      id: 'inventory',
      icon: '📦',
      label: 'Envanter',
      badge: inventoryStatus !== 'normal' ? (inventoryStatus === 'critical' ? '!' : '↑') : null,
      badgeColor: inventoryStatus === 'critical' ? '#ff3355' : '#ffaa22',
      badgeShadow: inventoryStatus === 'critical' ? 'rgba(255,51,85,0.6)' : 'rgba(255,170,34,0.5)',
      badgePulse: inventoryStatus === 'critical',
      onClick: onInventoryClick,
    },
  ];

  return (
    <div
      className="fixed right-3 z-40 flex flex-col gap-2"
      style={{ top: '4.5rem' }}
      role="toolbar"
      aria-label="Hızlı erişim kısayolları"
    >
      {/* Outer shell — double-bezel glass pill */}
      <div
        className="flex flex-col items-center gap-1.5 p-1.5 rounded-2xl"
        style={{
          background: 'rgba(8,10,16,0.90)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {buttons.map((btn, i) => (
          <button
            key={btn.id}
            onClick={btn.onClick}
            title={btn.label}
            aria-label={`${btn.label}${btn.badge ? ` (${btn.badge})` : ''}`}
            className="group relative w-10 h-10 rounded-xl flex items-center justify-center
                       transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                       hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              animationDelay: `${i * 80}ms`,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = `${raceColor}18`;
              el.style.borderColor = `${raceColor}40`;
              el.style.boxShadow = `0 0 16px ${raceGlow}, inset 0 1px 0 rgba(255,255,255,0.08)`;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'rgba(255,255,255,0.04)';
              el.style.borderColor = 'rgba(255,255,255,0.06)';
              el.style.boxShadow = 'none';
            }}
          >
            {/* Icon */}
            <span
              className="text-base leading-none pointer-events-none select-none
                         transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                         group-hover:scale-110"
              aria-hidden
            >
              {btn.icon}
            </span>

            {/* Badge overlay */}
            {btn.badge && (
              <span
                className={clsx(
                  'absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-[3px]',
                  'flex items-center justify-center rounded-full',
                  'font-display font-black text-[8px] leading-none text-white',
                  btn.badgePulse && 'animate-pulse',
                )}
                style={{
                  background: btn.badgeColor,
                  boxShadow: `0 0 8px ${btn.badgeShadow}`,
                }}
                aria-hidden
              >
                {btn.badge}
              </span>
            )}
          </button>
        ))}

        {/* Divider */}
        <div
          className="w-5 h-px"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          aria-hidden
        />

        {/* Race status dot */}
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{
            background: raceColor,
            boxShadow: `0 0 8px ${raceGlow}`,
          }}
          title="Irk aktif"
          aria-hidden
        />
      </div>
    </div>
  );
}
