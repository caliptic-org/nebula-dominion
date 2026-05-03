'use client';

import { useState } from 'react';
import { AgeTransitionScreen } from '@/components/progression/AgeTransitionScreen';
import { ContentUnlock } from '@/types/progression';

export default function AgeTransitionTestPage() {
  const [completed, setCompleted] = useState(false);

  const toAge = Number(
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('age') ?? '2'
      : '2',
  );

  if (completed) {
    return (
      <div data-testid="age-transition-completed" style={{ padding: '2rem', color: '#fff', background: '#080a10', minHeight: '100vh' }}>
        <p>Çağ geçişi tamamlandı</p>
      </div>
    );
  }

  return (
    <AgeTransitionScreen
      toAge={toAge}
      race="zerg"
      raceColor="#00ff88"
      raceGlow="rgba(0,255,136,0.4)"
      newUnlocks={[ContentUnlock.RACE_AUTOMATON, ContentUnlock.MODE_RANKED]}
      autoAdvanceMs={0}
      onComplete={() => setCompleted(true)}
    />
  );
}
