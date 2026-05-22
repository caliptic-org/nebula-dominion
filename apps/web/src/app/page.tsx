'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasSession } from '@/lib/session';
import { useRaceCommitment } from '@/components/race-selection/useRaceCommitment';

export default function HomePage() {
  const router = useRouter();
  const { committed } = useRaceCommitment();

  useEffect(() => {
    if (!hasSession()) {
      router.replace('/splash');
      return;
    }
    if (committed === null) {
      router.replace('/race-select');
      return;
    }
    router.replace('/base');
  }, [router, committed]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="h-dvh w-dvw flex items-center justify-center bg-nd-bg text-nd-muted"
    >
      <span className="font-nd-mono text-[10px] uppercase tracking-[0.24em] animate-nd-glow">
        Yönlendiriliyor…
      </span>
    </div>
  );
}
