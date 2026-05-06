'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { ResourceBar } from './ResourceBar';
import { BuildingListPanel } from './BuildingListPanel';
import { IsoMap } from './IsoMap';
import { BuildingDetailPanel } from './BuildingDetailPanel';
import { CommandCard } from './CommandCard';
import { Minimap } from './Minimap';
import { BASE_SNAPSHOTS } from './data';
import type {
  BaseBuilding,
  CommandAction,
  ProductionItem,
  RaceBaseSnapshot,
} from './types';
import './base-v2.css';

interface State {
  snapshot: RaceBaseSnapshot;
  selectedId: string | null;
  elapsedSeconds: number;
}

type Action =
  | { type: 'tick'; deltaSeconds: number }
  | { type: 'select'; id: string | null }
  | { type: 'enqueue'; buildingId: string; item: ProductionItem; cost: { mineral: number; gas: number; energy: number; pop: number } }
  | { type: 'cancel-queue'; buildingId: string; queueId: string; refund: { mineral: number; gas: number } }
  | { type: 'apply-upgrade'; buildingId: string }
  | { type: 'demolish'; buildingId: string }
  | { type: 'reset'; race: Race };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'tick': {
      const dt = action.deltaSeconds;
      // Decrement active queue head, gain resources from rates.
      const buildings = state.snapshot.buildings.map((b) => {
        if (b.queue.length === 0) {
          return b.status === 'producing' ? { ...b, status: 'idle' as const } : b;
        }
        const [head, ...rest] = b.queue;
        const remaining = head.remainingSeconds - dt;
        if (remaining <= 0) {
          // Pop head, promote next to active.
          const newQueue = rest.map((q, idx) =>
            idx === 0 ? { ...q, remainingSeconds: q.buildSeconds } : q,
          );
          const status = newQueue.length > 0 ? 'producing' : 'idle';
          return { ...b, queue: newQueue, status: status as BaseBuilding['status'] };
        }
        const newQueue = [{ ...head, remainingSeconds: remaining }, ...rest];
        return { ...b, queue: newQueue, status: 'producing' as const };
      });
      const r = state.snapshot.resources;
      const resources = {
        ...r,
        mineral: Math.max(0, r.mineral + r.rates.mineral * dt),
        gas: Math.max(0, r.gas + r.rates.gas * dt),
        energy: Math.max(0, r.energy + r.rates.energy * dt),
      };
      // Round down to whole units to keep the UI clean.
      resources.mineral = Math.floor(resources.mineral);
      resources.gas = Math.floor(resources.gas);
      resources.energy = Math.floor(resources.energy);
      return {
        ...state,
        snapshot: { ...state.snapshot, buildings, resources },
        elapsedSeconds: state.elapsedSeconds + dt,
      };
    }
    case 'select':
      return { ...state, selectedId: action.id };
    case 'enqueue': {
      const buildings = state.snapshot.buildings.map((b) => {
        if (b.id !== action.buildingId) return b;
        if (b.queue.length >= b.queueCapacity) return b;
        const queue = [...b.queue, action.item];
        return { ...b, queue, status: 'producing' as const };
      });
      const r = state.snapshot.resources;
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          buildings,
          resources: {
            ...r,
            mineral: r.mineral - action.cost.mineral,
            gas: r.gas - action.cost.gas,
            energy: r.energy - action.cost.energy,
            population: { ...r.population, current: r.population.current + action.cost.pop },
          },
        },
      };
    }
    case 'cancel-queue': {
      const buildings = state.snapshot.buildings.map((b) => {
        if (b.id !== action.buildingId) return b;
        const queue = b.queue.filter((q) => q.id !== action.queueId);
        // If we removed the head, restart the new head's timer fresh.
        const headWasRemoved = b.queue[0]?.id === action.queueId;
        const newQueue = headWasRemoved && queue.length > 0
          ? [{ ...queue[0], remainingSeconds: queue[0].buildSeconds }, ...queue.slice(1)]
          : queue;
        const status: BaseBuilding['status'] = newQueue.length > 0 ? 'producing' : 'idle';
        return { ...b, queue: newQueue, status };
      });
      const r = state.snapshot.resources;
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          buildings,
          resources: {
            ...r,
            mineral: r.mineral + action.refund.mineral,
            gas: r.gas + action.refund.gas,
          },
        },
      };
    }
    case 'apply-upgrade': {
      const buildings = state.snapshot.buildings.map((b) => {
        if (b.id !== action.buildingId || !b.upgrade) return b;
        const nextLevel = Math.min(b.maxLevel, b.upgrade.nextLevel);
        const nextUpgrade = nextLevel < b.maxLevel
          ? {
              nextLevel: nextLevel + 1,
              costMineral: b.upgrade.costMineral + 100,
              costGas: b.upgrade.costGas + 50,
              seconds: b.upgrade.seconds + 10,
            }
          : undefined;
        return {
          ...b,
          level: nextLevel,
          maxHp: Math.round(b.maxHp * 1.1),
          hp: Math.round(b.hp * 1.1),
          upgrade: nextUpgrade,
          status: 'upgrading' as const,
        };
      });
      const r = state.snapshot.resources;
      const target = state.snapshot.buildings.find((b) => b.id === action.buildingId);
      const upgrade = target?.upgrade;
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          buildings,
          resources: upgrade
            ? {
                ...r,
                mineral: Math.max(0, r.mineral - upgrade.costMineral),
                gas: Math.max(0, r.gas - upgrade.costGas),
              }
            : r,
        },
      };
    }
    case 'demolish': {
      const target = state.snapshot.buildings.find((b) => b.id === action.buildingId);
      const buildings = state.snapshot.buildings.filter((b) => b.id !== action.buildingId);
      const r = state.snapshot.resources;
      // Refund 50% of the building's hypothetical investment using its level as a proxy.
      const refundM = target ? Math.round(target.level * 100 * 0.5) : 0;
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          buildings,
          resources: { ...r, mineral: r.mineral + refundM },
        },
        selectedId: state.selectedId === action.buildingId ? null : state.selectedId,
      };
    }
    case 'reset':
      return { snapshot: cloneSnapshot(BASE_SNAPSHOTS[action.race]), selectedId: null, elapsedSeconds: 0 };
    default:
      return state;
  }
}

function cloneSnapshot(s: RaceBaseSnapshot): RaceBaseSnapshot {
  return {
    ...s,
    resources: { ...s.resources, rates: { ...s.resources.rates }, population: { ...s.resources.population } },
    buildings: s.buildings.map((b) => ({
      ...b,
      queue: b.queue.map((q) => ({ ...q })),
      commands: b.commands.map((c) => ({ ...c, spawnUnit: c.spawnUnit ? { ...c.spawnUnit } : undefined })),
      upgrade: b.upgrade ? { ...b.upgrade } : undefined,
    })),
    rallyPoint: s.rallyPoint ? { ...s.rallyPoint } : null,
    pings: s.pings.map((p) => ({ ...p })),
  };
}

export function BaseScreen() {
  const { race, setRace, raceColor, meta } = useRaceTheme();
  const [state, dispatch] = useReducer(reducer, race, (r) => ({
    snapshot: cloneSnapshot(BASE_SNAPSHOTS[r]),
    selectedId: BASE_SNAPSHOTS[r].buildings[0]?.id ?? null,
    elapsedSeconds: 0,
  }));

  const lastTickRef = useRef<number>(performance.now());

  // Reset state when race changes from the global theme provider.
  const lastRaceRef = useRef<Race>(race);
  useEffect(() => {
    if (lastRaceRef.current !== race) {
      lastRaceRef.current = race;
      dispatch({ type: 'reset', race });
      dispatch({ type: 'select', id: BASE_SNAPSHOTS[race].buildings[0]?.id ?? null });
      lastTickRef.current = performance.now();
    }
  }, [race]);

  // Tick — update queue + resources every second.
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      dispatch({ type: 'tick', deltaSeconds: dt });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const selectedBuilding = useMemo(
    () => state.snapshot.buildings.find((b) => b.id === state.selectedId) ?? null,
    [state.snapshot.buildings, state.selectedId],
  );

  const handleSelect = useCallback((id: string) => {
    dispatch({ type: 'select', id });
  }, []);

  const handleCommand = useCallback((buildingId: string, action: CommandAction) => {
    if (action.kind === 'train' && action.spawnUnit) {
      const item: ProductionItem = {
        id: `${action.id}-${Date.now()}`,
        unitKey: action.spawnUnit.unitKey,
        unitLabel: action.spawnUnit.unitLabel,
        unitIcon: action.spawnUnit.unitIcon,
        buildSeconds: action.buildSeconds ?? 20,
        remainingSeconds: action.buildSeconds ?? 20,
      };
      dispatch({
        type: 'enqueue',
        buildingId,
        item,
        cost: {
          mineral: action.costMineral ?? 0,
          gas: action.costGas ?? 0,
          energy: action.costEnergy ?? 0,
          pop: action.popCost ?? 0,
        },
      });
    } else if (action.kind === 'upgrade') {
      dispatch({ type: 'apply-upgrade', buildingId });
    }
    // 'rally' and 'special' are interactive in a real game; here they are no-ops.
  }, []);

  const handleCancel = useCallback((buildingId: string, queueId: string) => {
    const b = state.snapshot.buildings.find((x) => x.id === buildingId);
    const item = b?.queue.find((q) => q.id === queueId);
    const cmd = b?.commands.find((c) => c.spawnUnit?.unitKey === item?.unitKey);
    dispatch({
      type: 'cancel-queue',
      buildingId,
      queueId,
      refund: {
        mineral: cmd?.costMineral ?? 0,
        gas: cmd?.costGas ?? 0,
      },
    });
  }, [state.snapshot.buildings]);

  const handleUpgrade = useCallback((buildingId: string) => {
    dispatch({ type: 'apply-upgrade', buildingId });
  }, []);

  const handleDemolish = useCallback((buildingId: string) => {
    dispatch({ type: 'demolish', buildingId });
  }, []);

  const handleMinimapJump = useCallback((col: number, row: number) => {
    // Find the nearest building to the jump target and select it.
    let bestId: string | null = null;
    let bestDist = Infinity;
    state.snapshot.buildings.forEach((b) => {
      const dx = b.isoX - col;
      const dy = b.isoY - row;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        bestId = b.id;
      }
    });
    if (bestId) dispatch({ type: 'select', id: bestId });
  }, [state.snapshot.buildings]);

  return (
    <div className="base-screen" data-race={meta.dataRace}>
      <ResourceBar resources={state.snapshot.resources} elapsedSeconds={state.elapsedSeconds} />
      <BuildingListPanel
        buildings={state.snapshot.buildings}
        selectedId={state.selectedId}
        onSelect={handleSelect}
      />
      <IsoMap
        snapshot={state.snapshot}
        selectedId={state.selectedId}
        onSelect={handleSelect}
      />
      <BuildingDetailPanel
        building={selectedBuilding}
        resources={state.snapshot.resources}
        onCancelQueueItem={handleCancel}
        onUpgrade={handleUpgrade}
        onDemolish={handleDemolish}
      />
      <CommandCard
        building={selectedBuilding}
        resources={state.snapshot.resources}
        onCommand={handleCommand}
      />
      <Minimap
        snapshot={state.snapshot}
        selectedId={state.selectedId}
        raceColor={raceColor}
        onJumpTo={handleMinimapJump}
      />

      <Link href="/" className="base-back-link">← Geri</Link>

      <RaceToolbar race={race} onChange={setRace} />
    </div>
  );
}

function RaceToolbar({ race, onChange }: { race: Race; onChange: (r: Race) => void }) {
  return (
    <div className="base-race-toolbar" role="group" aria-label="Irk değiştir">
      {(Object.values(Race) as Race[]).map((r) => {
        const desc = RACE_DESCRIPTIONS[r];
        return (
          <button
            key={r}
            type="button"
            className={clsx(r === race && 'is-active')}
            onClick={() => onChange(r)}
            title={desc.name}
            aria-label={desc.name}
            aria-pressed={r === race}
          >
            {desc.icon}
          </button>
        );
      })}
    </div>
  );
}
