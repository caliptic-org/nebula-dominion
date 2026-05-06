'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { BattleTopBar } from './BattleTopBar';
import { UnitListPanel } from './UnitListPanel';
import { BattleGround } from './BattleGround';
import { BattleCommandCard } from './BattleCommandCard';
import { BattleMinimap } from './BattleMinimap';
import { buildSnapshot } from './data';
import { BATTLEFIELD_BOUNDS } from './types';
import type { BattleSnapshot, DamageNumber, DamageType } from './types';
import './battle-hud-v2.css';

type Action =
  | { type: 'tick'; deltaSeconds: number }
  | { type: 'select-unit'; id: string | null }
  | { type: 'select-group'; num: number }
  | { type: 'select-all' }
  | { type: 'select-idle' }
  | { type: 'select-low-health' }
  | { type: 'select-next-idle' }
  | { type: 'cast-ability'; id: string }
  | { type: 'spawn-damage'; damage: Omit<DamageNumber, 'id' | 'spawnedAt'> }
  | { type: 'expire-damage'; ids: string[] }
  | { type: 'set-speed'; speed: 0.5 | 1 | 2 }
  | { type: 'toggle-pause' }
  | { type: 'reset'; race: Race };

const DAMAGE_TTL_MS = 1200;

function reducer(state: BattleSnapshot, action: Action): BattleSnapshot {
  switch (action.type) {
    case 'tick': {
      if (state.paused) return state;
      const dt = action.deltaSeconds * state.speed;

      // Resources
      const r = state.resources;
      const rates = state.resourceRates;
      const resources = {
        mineral: Math.max(0, r.mineral + rates.mineral * dt),
        gas: Math.max(0, r.gas + rates.gas * dt),
        energy: Math.max(0, r.energy + rates.energy * dt),
      };

      // Wave timer
      const wave = { ...state.wave };
      wave.nextInSeconds = Math.max(0, wave.nextInSeconds - dt);
      if (wave.nextInSeconds <= 0 && wave.current < wave.total) {
        wave.current += 1;
        wave.nextInSeconds = wave.totalSeconds;
      }

      // Ability cooldowns
      const abilities = state.abilities.map((a) => ({
        ...a,
        remainingCooldown: Math.max(0, a.remainingCooldown - dt),
      }));

      return { ...state, resources, wave, abilities };
    }
    case 'select-unit':
      return { ...state, selectedUnitId: action.id };
    case 'select-group': {
      const group = state.units.filter((u) => u.controlGroup === action.num);
      return { ...state, selectedUnitId: group[0]?.id ?? state.selectedUnitId };
    }
    case 'select-all':
      return { ...state, selectedUnitId: state.units[0]?.id ?? null };
    case 'select-idle': {
      const idle = state.units.find((u) => u.status === 'idle');
      return idle ? { ...state, selectedUnitId: idle.id } : state;
    }
    case 'select-low-health': {
      const lowest = [...state.units].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      return lowest ? { ...state, selectedUnitId: lowest.id } : state;
    }
    case 'select-next-idle': {
      const idleList = state.units.filter((u) => u.status === 'idle');
      if (idleList.length === 0) return state;
      const idx = idleList.findIndex((u) => u.id === state.selectedUnitId);
      const next = idleList[(idx + 1) % idleList.length];
      return { ...state, selectedUnitId: next.id };
    }
    case 'cast-ability': {
      const abilities = state.abilities.map((a) =>
        a.id === action.id && a.remainingCooldown <= 0
          ? { ...a, remainingCooldown: a.cooldownSeconds }
          : a,
      );
      return { ...state, abilities };
    }
    case 'spawn-damage': {
      const dmg: DamageNumber = {
        ...action.damage,
        id: `dmg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        spawnedAt: Date.now(),
      };
      return { ...state, damageNumbers: [...state.damageNumbers, dmg] };
    }
    case 'expire-damage':
      return {
        ...state,
        damageNumbers: state.damageNumbers.filter((d) => !action.ids.includes(d.id)),
      };
    case 'set-speed':
      return { ...state, speed: action.speed };
    case 'toggle-pause':
      return { ...state, paused: !state.paused };
    case 'reset':
      return buildSnapshot(action.race);
    default:
      return state;
  }
}

const ABILITY_HOTKEYS: Record<string, 'Q' | 'W' | 'E' | 'R' | 'A' | 'S'> = {
  KeyQ: 'Q', KeyW: 'W', KeyE: 'E', KeyR: 'R', KeyA: 'A', KeyS: 'S',
};

export function BattleScreen() {
  const { race, setRace, raceColor, meta } = useRaceTheme();

  const [state, dispatch] = useReducer(reducer, race, buildSnapshot);

  // Reset on race change
  const lastRaceRef = useRef<Race>(race);
  useEffect(() => {
    if (lastRaceRef.current !== race) {
      lastRaceRef.current = race;
      dispatch({ type: 'reset', race });
    }
  }, [race]);

  // Tick loop
  const lastTickRef = useRef<number>(performance.now());
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.25, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;
      dispatch({ type: 'tick', deltaSeconds: dt });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-spawn demo damage numbers around active combat
  useEffect(() => {
    const id = window.setInterval(() => {
      if (state.paused) return;
      const combat = state.combats[Math.floor(Math.random() * state.combats.length)];
      if (!combat) return;
      const roll = Math.random();
      const type: DamageType =
        roll < 0.08 ? 'miss' : roll < 0.22 ? 'critical' : roll < 0.32 ? 'heal' : 'damage';
      const baseValue =
        type === 'critical' ? 60 + Math.floor(Math.random() * 40)
        : type === 'heal'   ? 8 + Math.floor(Math.random() * 14)
        : type === 'miss'   ? 0
        : 12 + Math.floor(Math.random() * 24);
      dispatch({
        type: 'spawn-damage',
        damage: {
          value: baseValue,
          type,
          x: combat.x + (Math.random() - 0.5) * 80,
          y: combat.y + (Math.random() - 0.5) * 60,
        },
      });
    }, 700);
    return () => window.clearInterval(id);
  }, [state.combats, state.paused]);

  // Garbage-collect expired damage numbers
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const expired = state.damageNumbers
        .filter((d) => now - d.spawnedAt > DAMAGE_TTL_MS)
        .map((d) => d.id);
      if (expired.length > 0) dispatch({ type: 'expire-damage', ids: expired });
    }, 400);
    return () => window.clearInterval(id);
  }, [state.damageNumbers]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Abilities
      const hk = ABILITY_HOTKEYS[e.code];
      if (hk) {
        const ab = state.abilities.find((a) => a.hotkey === hk);
        if (ab && ab.remainingCooldown <= 0) {
          e.preventDefault();
          dispatch({ type: 'cast-ability', id: ab.id });
        }
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        dispatch({ type: 'toggle-pause' });
        return;
      }
      if (e.code === 'Escape') {
        dispatch({ type: 'select-unit', id: null });
        return;
      }
      if (e.code === 'Tab') {
        e.preventDefault();
        dispatch({ type: 'select-next-idle' });
        return;
      }
      const groupMatch = e.code.match(/^Digit([1-3])$/);
      if (groupMatch) {
        e.preventDefault();
        dispatch({ type: 'select-group', num: parseInt(groupMatch[1], 10) });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.abilities]);

  const selectedUnit = useMemo(
    () => state.units.find((u) => u.id === state.selectedUnitId) ?? null,
    [state.units, state.selectedUnitId],
  );
  const activeGroup = selectedUnit?.controlGroup ?? null;

  const handleCast = useCallback((id: string) => dispatch({ type: 'cast-ability', id }), []);
  const handleSelectGroup = useCallback((num: number) => dispatch({ type: 'select-group', num }), []);
  const handleSelectAll = useCallback(() => dispatch({ type: 'select-all' }), []);
  const handleSelectIdle = useCallback(() => dispatch({ type: 'select-idle' }), []);
  const handleSelectLowHealth = useCallback(() => dispatch({ type: 'select-low-health' }), []);
  const handleMinimapJump = useCallback((x: number, y: number) => {
    let bestId: string | null = null;
    let bestDist = Infinity;
    state.units.forEach((u) => {
      const dx = u.x - x;
      const dy = u.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        bestId = u.id;
      }
    });
    if (bestId) dispatch({ type: 'select-unit', id: bestId });
  }, [state.units]);

  return (
    <div
      className="battle-screen"
      data-race={meta.dataRace}
      style={{ ['--race-primary-rgb' as string]: hexToRgb(raceColor) }}
    >
      <BattleTopBar
        resources={state.resources}
        rates={state.resourceRates}
        populationCap={state.populationCap}
        wave={state.wave}
        speed={state.speed}
        paused={state.paused}
        onSpeedChange={(s) => dispatch({ type: 'set-speed', speed: s })}
        onTogglePause={() => dispatch({ type: 'toggle-pause' })}
      />

      <UnitListPanel
        units={state.units}
        selectedId={state.selectedUnitId}
        populationCap={state.populationCap}
        onSelect={(id) => dispatch({ type: 'select-unit', id })}
        onSelectAll={handleSelectAll}
        onSelectIdle={handleSelectIdle}
        onSelectLowHealth={handleSelectLowHealth}
      />

      <BattleGround
        units={state.units}
        enemies={state.enemies}
        selectedUnitId={state.selectedUnitId}
        damageNumbers={state.damageNumbers}
        onSelectUnit={(id) => dispatch({ type: 'select-unit', id })}
      />

      <BattleCommandCard
        unit={selectedUnit}
        abilities={state.abilities}
        controlGroups={state.controlGroups}
        activeGroup={activeGroup}
        onCastAbility={handleCast}
        onSelectGroup={handleSelectGroup}
      />

      <BattleMinimap
        friendlyUnits={state.units}
        enemyUnits={state.enemies}
        combats={state.combats}
        raceColor={raceColor}
        selectedUnitId={state.selectedUnitId}
        onJumpTo={handleMinimapJump}
      />

      {state.paused && (
        <div className="battle-pause-overlay" role="status" aria-live="polite">
          <span className="battle-pause-glyph" aria-hidden>❚❚</span>
          <span className="battle-pause-label">DURAKLATILDI</span>
          <span className="battle-pause-hint">SPACE = devam</span>
        </div>
      )}

      <Link href="/" className="battle-back-link">← Ana Üs</Link>

      <RaceToolbar race={race} onChange={setRace} />
    </div>
  );
}

function RaceToolbar({ race, onChange }: { race: Race; onChange: (r: Race) => void }) {
  return (
    <div className="battle-race-toolbar" role="group" aria-label="Irk değiştir">
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

function hexToRgb(hex: string): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
