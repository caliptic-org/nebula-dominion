'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Race } from '@/types/units';
import { RaceSelectionScreen } from '@/components/race-selection/RaceSelectionScreen';

export default function RaceSelectionPage() {
  const [selectedRace, setSelectedRace] = useState<Race | null>(Race.INSAN);
  const router = useRouter();

  return (
    <RaceSelectionScreen
      selectedRace={selectedRace}
      onSelect={setSelectedRace}
      onConfirm={(race) => router.push(`/?race=${race}`)}
    />
  );
}
