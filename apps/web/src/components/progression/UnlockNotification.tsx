'use client';

import { useEffect, useState } from 'react';
import '@/styles/progression.css';
import { ContentUnlock, UNLOCK_LABELS } from '@/types/progression';

const UNLOCK_ICONS: Partial<Record<ContentUnlock, string>> = {
  [ContentUnlock.RACE_ZERG]: '🐛',
  [ContentUnlock.RACE_AUTOMATON]: '🤖',
  [ContentUnlock.RACE_MONSTER_PREVIEW]: '👹',
  [ContentUnlock.MODE_RANKED]: '🏆',
  [ContentUnlock.CONSTRUCTION_BASICS]: '🏗️',
  [ContentUnlock.ADVANCED_ABILITIES]: '⚡',
  [ContentUnlock.SPECIAL_MAPS]: '🗺️',
  [ContentUnlock.ADVANCED_TACTICS]: '⚔️',
  [ContentUnlock.AGE_2_PREVIEW]: '🌟',
};

interface Toast {
  id: string;
  unlock: ContentUnlock;
}

interface UnlockNotificationProps {
  newUnlocks: ContentUnlock[];
}

export function UnlockNotification({ newUnlocks }: UnlockNotificationProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!newUnlocks.length) return;

    const incoming = newUnlocks.map((unlock) => ({
      id: `${unlock}-${Date.now()}`,
      unlock,
    }));

    setToasts((prev) => [...prev, ...incoming]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => !incoming.some((i) => i.id === t.id)));
    }, 4000);

    return () => clearTimeout(timer);
  }, [newUnlocks]);

  if (!toasts.length) return null;

  return (
    <div className="unlock-notifications" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="unlock-toast">
          <span className="unlock-toast-icon">{UNLOCK_ICONS[toast.unlock] ?? '🔓'}</span>
          <div>
            <div className="unlock-toast-label">İçerik Açıldı</div>
            <div className="unlock-toast-sub">{UNLOCK_LABELS[toast.unlock] ?? toast.unlock}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
