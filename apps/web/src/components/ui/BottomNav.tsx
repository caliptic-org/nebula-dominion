'use client';

import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/',             icon: '🏰', label: 'Ana Üs' },
  { href: '/battle',       icon: '⚔️', label: 'Savaş' },
  { href: '/missions',     icon: '📖', label: 'Görevler' },
  { href: '/commanders',   icon: '🤝', label: 'Komutanlar' },
  { href: '/progression',  icon: '✨', label: 'İlerleme' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="bottom-nav" aria-label="Ana navigasyon">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={clsx('bottom-nav-item', active && 'active')}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <span className="text-lg leading-none" aria-hidden>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
