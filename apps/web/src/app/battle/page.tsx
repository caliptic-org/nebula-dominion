'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const GameCanvas = dynamic(() => import('@/game/GameCanvas'), { ssr: false });

function BattleContent() {
  const params = useSearchParams();
  const race = params.get('race') ?? 'human';
  const mode = params.get('mode') ?? 'pve';
  const userId = params.get('userId') ?? 'player_demo';

  return (
    <main className="battle-page">
      <GameCanvas race={race} mode={mode} userId={userId} />
    </main>
  );
}

export default function BattlePage() {
  return (
    <Suspense fallback={<main className="battle-page"><p style={{ color: '#666' }}>Loading...</p></main>}>
      <BattleContent />
    </Suspense>
  );
}
