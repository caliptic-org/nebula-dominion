'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavTab {
  href: string;
  label: string;
  icon: string;
  match?: string[];
}

const TABS: NavTab[] = [
  { href: '/',           label: 'Ana Üs',  icon: '🏰', match: ['/'] },
  { href: '/map',        label: 'Harita',  icon: '🌌' },
  { href: '/battle',     label: 'Savaş',   icon: '⚔️' },
  { href: '/dashboard',  label: 'Lonca',   icon: '🤝' },
  { href: '/shop',       label: 'Mağaza',  icon: '💎' },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (tab: NavTab) => {
    if (tab.match) return tab.match.includes(pathname);
    return pathname.startsWith(tab.href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
      style={{
        background: 'rgba(10, 13, 20, 0.95)',
        borderTop: '1px solid var(--color-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label="Ana navigasyon"
    >
      {TABS.map((tab) => {
        const active = isActive(tab);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all relative"
            style={{
              color: active ? 'var(--color-energy)' : 'var(--color-text-muted)',
              minHeight: 56,
            }}
            aria-current={active ? 'page' : undefined}
          >
            {active && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: 'var(--color-energy)' }}
                aria-hidden
              />
            )}
            <span className="text-xl leading-none" aria-hidden>{tab.icon}</span>
            <span
              className="text-xs font-bold tracking-wider font-display"
              style={{ fontSize: '9px', letterSpacing: '0.6px' }}
            >
              {tab.label.toUpperCase()}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
