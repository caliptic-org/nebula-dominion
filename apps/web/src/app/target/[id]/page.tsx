'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { TargetDetailScreen } from '@/components/nd/screens';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { useTargetNode } from '@/hooks/useTargetNode';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import type { NDRaceKey } from '@/components/handoff';

const ND_RACE_KEYS: readonly NDRaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];

function isNDRaceKey(value: string | null): value is NDRaceKey {
  return value != null && (ND_RACE_KEYS as readonly string[]).includes(value);
}

function Inner({ id }: { id: string }) {
  const params = useSearchParams();
  const raceParam = params.get('race');
  const { race, setRace } = useRaceTheme();
  // /api/v1/target/:id — meta stub falls back to a synthesised node when the
  // id isn't in the static seed.  Without this hook, TargetDetailScreen
  // would silently render GALAXY_NODES[0] for any unknown id (i.e. /target/x
  // showed the same Voss capital as /target/y), which is a major source of
  // confusion when the player lands here from a /map click.
  const { target } = useTargetNode(id);

  useEffect(() => {
    if (!raceParam) return;
    const wanted = (Object.values(Race) as Race[]).find(
      (r) => RACE_DESCRIPTIONS[r].dataRace === raceParam || r === raceParam,
    );
    if (wanted && wanted !== race) setRace(wanted);
  }, [raceParam, race, setRace]);

  return (
    <TargetDetailScreen
      nodeId={id}
      forcedRace={isNDRaceKey(raceParam) ? raceParam : undefined}
      liveTarget={
        target
          ? {
              name: target.name,
              ownerRace: target.ownerRace,
              level: target.level,
              power: target.power,
              defence: target.defence,
              rewards: target.rewards,
              status: target.status,
            }
          : undefined
      }
    />
  );
}

export default function TargetPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={null}>
      <Inner id={params.id} />
    </Suspense>
  );
}
