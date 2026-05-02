'use client';

import clsx from 'clsx';

export type GameTab = 'home' | 'map' | 'battle' | 'guild' | 'shop';

interface NavItem {
  id: GameTab;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',   label: 'Ana Üs',  icon: '🏰' },
  { id: 'map',    label: 'Harita',  icon: '🌌' },
  { id: 'battle', label: 'Savaş',   icon: '⚔️' },
  { id: 'guild',  label: 'Lonca',   icon: '🤝' },
  { id: 'shop',   label: 'Mağaza',  icon: '💎' },
];

interface BottomNavProps {
  activeTab: GameTab;
  onTabChange: (tab: GameTab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'rgba(7, 9, 15, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}
      aria-label="Ana navigasyon"
    >
      <div
        style={{
          display: 'flex',
          maxWidth: 640,
          margin: '0 auto',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                padding: '10px 4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.32,0.72,0,1)',
                position: 'relative',
              }}
            >
              {/* Active indicator bar at top */}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '20%',
                  right: '20%',
                  height: 2,
                  borderRadius: '0 0 3px 3px',
                  background: isActive ? 'var(--color-brand)' : 'transparent',
                  boxShadow: isActive ? '0 0 8px var(--color-brand-glow)' : undefined,
                  transition: 'all 0.25s cubic-bezier(0.32,0.72,0,1)',
                }}
              />

              {/* Icon */}
              <span
                aria-hidden
                style={{
                  fontSize: 20,
                  lineHeight: 1,
                  transform: isActive ? 'scale(1.15) translateY(-1px)' : 'scale(1)',
                  transition: 'transform 0.25s cubic-bezier(0.32,0.72,0,1)',
                  filter: isActive ? 'drop-shadow(0 0 6px var(--color-brand-glow))' : 'none',
                }}
              >
                {item.icon}
              </span>

              {/* Label */}
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 9,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? 'var(--color-brand)' : 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'color 0.2s ease',
                  lineHeight: 1,
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
