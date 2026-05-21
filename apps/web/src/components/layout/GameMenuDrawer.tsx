'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

interface DrawerLink {
  href: string;
  label: string;
  icon: string;
  description?: string;
}

interface DrawerSection {
  title: string;
  links: DrawerLink[];
}

const SECTIONS: DrawerSection[] = [
  {
    title: 'Profil',
    links: [
      { href: '/profile',       icon: '👤', label: 'Profil',     description: 'Komutan profili' },
      { href: '/settings',      icon: '⚙️', label: 'Ayarlar',    description: 'Hesap ve oyun' },
      { href: '/customization', icon: '🎨', label: 'Kozmetik',   description: 'Görünüm' },
      { href: '/vip',           icon: '👑', label: 'VIP',        description: 'Premium ayrıcalıklar' },
    ],
  },
  {
    title: 'İlerleme',
    links: [
      { href: '/progression', icon: '📈', label: 'İlerleme',    description: 'Seviye ve XP' },
      { href: '/missions',    icon: '📋', label: 'Görevler',    description: 'Günlük & haftalık' },
      { href: '/research',    icon: '🔬', label: 'Araştırma',   description: 'Teknoloji ağacı' },
      { href: '/tier-up',     icon: '🌀', label: 'Çağ Atlama',  description: 'Yeni çağa geçiş' },
      { href: '/story',       icon: '📖', label: 'Hikaye',      description: 'Kampanya' },
      { href: '/story-gallery', icon: '🖼️', label: 'Galeri',     description: 'Hikaye anıları' },
    ],
  },
  {
    title: 'Ordu',
    links: [
      { href: '/inventory',         icon: '🎒', label: 'Envanter',    description: 'Eşyalar' },
      { href: '/inventory/roster',  icon: '🛡️', label: 'Birlik Roster', description: 'Tüm birlikler' },
      { href: '/inventory/merge',   icon: '⚗️', label: 'Birleştirme',  description: 'Birim birleşimi' },
      { href: '/formation',         icon: '🎯', label: 'Formasyon',    description: 'Savaş düzeni' },
      { href: '/battle-prep',       icon: '⚔️', label: 'Savaş Hazırlık', description: 'Loadout' },
    ],
  },
  {
    title: 'Sosyal',
    links: [
      { href: '/alliance',    icon: '🤝', label: 'İttifak',     description: 'Lonca' },
      { href: '/chat',        icon: '💬', label: 'Sohbet',      description: 'Genel kanal' },
      { href: '/mail',        icon: '📬', label: 'Mesajlar',    description: 'Posta kutusu' },
      { href: '/events',      icon: '🎉', label: 'Etkinlikler', description: 'Aktif olaylar' },
      { href: '/leaderboard', icon: '🏆', label: 'Lider Tablosu', description: 'En iyi oyuncular' },
    ],
  },
  {
    title: 'Komuta',
    links: [
      { href: '/dashboard',        icon: '🛰️', label: 'Komuta Merkezi', description: 'Genel bakış' },
      { href: '/dashboard/guild',  icon: '🏛️', label: 'Lonca Yönetimi', description: 'Üyeler & izinler' },
      { href: '/stats',            icon: '📊', label: 'İstatistikler',   description: 'Detaylı veriler' },
      { href: '/base/production',  icon: '🏭', label: 'Üretim',         description: 'Kaynak çıktısı' },
      { href: '/base/build',       icon: '🏗️', label: 'İnşaat',          description: 'Yeni yapılar' },
    ],
  },
];

interface GameMenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function GameMenuDrawer({ open, onClose }: GameMenuDrawerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-[60] transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        style={{ background: 'rgba(0, 2, 8, 0.72)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={clsx(
          'fixed top-0 right-0 bottom-0 z-[70] w-[min(92vw,360px)] flex flex-col transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{
          background: 'rgba(8, 10, 16, 0.96)',
          borderLeft: '1px solid var(--color-border-hover)',
          boxShadow: '-12px 0 32px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(20px)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Oyun menüsü"
        aria-hidden={!open}
      >
        <header
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <span
            className="font-display text-sm font-black tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-brand)' }}
          >
            ◆ Menü
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            aria-label="Menüyü kapat"
          >
            <span aria-hidden>✕</span>
          </button>
        </header>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-5" aria-label="İkincil navigasyon">
          {SECTIONS.map((section) => (
            <section key={section.title} aria-labelledby={`menu-section-${section.title}`}>
              <h2
                id={`menu-section-${section.title}`}
                className="font-display text-[10px] font-bold uppercase tracking-[0.2em] mb-2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {section.title}
              </h2>
              <ul className="grid grid-cols-2 gap-2">
                {section.links.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className="flex flex-col gap-1 p-3 rounded-lg transition-all h-full"
                        style={{
                          background: active
                            ? 'var(--color-brand-dim)'
                            : 'rgba(255,255,255,0.025)',
                          border: `1px solid ${active ? 'var(--color-border-focus)' : 'var(--color-border)'}`,
                          color: active ? 'var(--color-brand)' : 'var(--color-text-primary)',
                        }}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="text-lg leading-none" aria-hidden>{link.icon}</span>
                        <span className="font-display text-[11px] font-bold uppercase tracking-wide">
                          {link.label}
                        </span>
                        {link.description && (
                          <span
                            className="text-[10px] font-body leading-tight"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {link.description}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      </aside>
    </>
  );
}
