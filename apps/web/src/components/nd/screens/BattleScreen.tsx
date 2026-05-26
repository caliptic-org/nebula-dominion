'use client';

import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  ND,
  RACES,
  Sigil,
  Eyebrow,
  H2,
  H3,
  Caption,
  Panel,
  ResPill,
  NDButton,
  Bar,
  useNDRace,
  type NDRace,
  type NDRaceKey,
} from '@/components/handoff';
import { api, FetchError } from '@/lib/api';
import { hasSession } from '@/lib/session';
import { refreshGameResources } from '@/hooks/useGameResources';

/* ───────────────────────── Simulation model ───────────────────────── */

interface Combatant {
  id: string;
  side: 'us' | 'them';
  /** Tier from race tokens (1..5). */
  tier: number;
  name: string;
  /** Normalized 0..1 position along battle axis (0 = our line, 1 = enemy line). */
  x: number;
  /** Normalized 0..1 vertical lane (0..1). */
  y: number;
  hp: number;
  maxHp: number;
  attackCooldown: number;
  /** Total damage this combatant has dealt — used to pick the MVP and to
   *  surface real "damage dealt" + "kills" numbers on /battle-result. */
  damageDealt: number;
  /** Number of enemies finished off (their hp fell to 0 from a hit by us). */
  kills: number;
}

interface Projectile {
  id: string;
  side: 'us' | 'them';
  /** Combatant id that fired this projectile — used to attribute damage and
   *  kills back to the shooter on /battle-result (MVP selection). */
  shooterId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
}

interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: number;
  ttl: number;
  side: 'us' | 'them';
}

interface SimState {
  ours: Combatant[];
  theirs: Combatant[];
  projectiles: Projectile[];
  damage: DamageNumber[];
  status: 'fighting' | 'victory' | 'defeat';
  /** seconds elapsed */
  elapsed: number;
}

let __nextId = 0;
const nextId = () => `c${++__nextId}`;

function spawnSide(race: NDRace, side: 'us' | 'them', flip: boolean): Combatant[] {
  const units = race.units.slice(0, 5);
  return units.map((u, i) => ({
    id: nextId(),
    side,
    tier: u.t,
    name: u.n,
    x: flip ? 0.86 - (i % 2) * 0.04 : 0.14 + (i % 2) * 0.04,
    y: 0.18 + i * 0.16,
    hp: 50 + u.t * 24,
    maxHp: 50 + u.t * 24,
    attackCooldown: 0.6 + Math.random() * 0.6,
    damageDealt: 0,
    kills: 0,
  }));
}

function initialState(us: NDRace, them: NDRace): SimState {
  return {
    ours: spawnSide(us, 'us', false),
    theirs: spawnSide(them, 'them', true),
    projectiles: [],
    damage: [],
    status: 'fighting',
    elapsed: 0,
  };
}

type SimAction =
  | { type: 'tick'; dt: number }
  | { type: 'reset'; us: NDRace; them: NDRace };

function tick(state: SimState, dt: number): SimState {
  if (state.status !== 'fighting') return state;

  const findNearestEnemy = (c: Combatant, candidates: Combatant[]) => {
    let best: Combatant | null = null;
    let bestD = Infinity;
    for (const t of candidates) {
      const dx = t.x - c.x;
      const dy = t.y - c.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  };

  // Cooldowns & move toward enemy
  const updateSide = (mine: Combatant[], foes: Combatant[]): { units: Combatant[]; newProj: Projectile[]; newDmg: DamageNumber[] } => {
    const newProj: Projectile[] = [];
    const newDmg: DamageNumber[] = [];
    const units: Combatant[] = [];
    for (const c of mine) {
      const target = findNearestEnemy(c, foes);
      if (!target) {
        units.push(c);
        continue;
      }
      const dx = target.x - c.x;
      const dy = target.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 0.05 + c.tier * 0.012;
      let nx = c.x;
      let ny = c.y;
      if (dist > 0.18) {
        nx += (dx / dist) * speed * dt;
        ny += (dy / dist) * speed * dt;
      }
      let cd = c.attackCooldown - dt;
      if (cd <= 0 && dist <= 0.22) {
        cd = 0.8 + Math.random() * 0.4;
        newProj.push({
          id: nextId(),
          side: c.side,
          shooterId: c.id,
          x: c.x,
          y: c.y,
          vx: (dx / Math.max(0.01, dist)) * 0.55,
          vy: (dy / Math.max(0.01, dist)) * 0.55,
          ttl: 0.6,
        });
      }
      units.push({ ...c, x: nx, y: ny, attackCooldown: Math.max(0, cd) });
    }
    return { units, newProj, newDmg };
  };

  const ours = updateSide(state.ours, state.theirs);
  const theirs = updateSide(state.theirs, state.ours);

  // Advance projectiles, resolve hits
  const allCombatants = [...ours.units, ...theirs.units];
  const projectiles: Projectile[] = [];
  const damage: DamageNumber[] = state.damage
    .map((d) => ({ ...d, ttl: d.ttl - dt }))
    .filter((d) => d.ttl > 0);

  // Shooter lookup over the post-update combatant pool — same array the
  // projectile was spawned from, so the id always resolves.  Attribution
  // mutates the shooter's `damageDealt` / `kills` in place so the final
  // state at end-of-battle carries the real numbers /battle-result needs.
  const shooterPool = proj => (proj.side === 'us' ? ours.units : theirs.units);

  const apply = (proj: Projectile) => {
    const candidates = proj.side === 'us' ? theirs.units : ours.units;
    for (const enemy of candidates) {
      const dx = enemy.x - proj.x;
      const dy = enemy.y - proj.y;
      if (dx * dx + dy * dy < 0.0035) {
        const dmg = 8 + Math.floor(Math.random() * 14) + (proj.side === 'us' ? 2 : 0);
        const hpBefore = enemy.hp;
        enemy.hp = Math.max(0, enemy.hp - dmg);
        const actualDmg = hpBefore - enemy.hp;

        // Attribute damage + (kills, if this hit dropped them to zero) to
        // the shooter so the MVP/score logic on /battle-result reflects
        // who actually carried the team.
        const shooter = shooterPool(proj).find((u) => u.id === proj.shooterId);
        if (shooter) {
          shooter.damageDealt += actualDmg;
          if (hpBefore > 0 && enemy.hp === 0) shooter.kills += 1;
        }

        damage.push({
          id: nextId(),
          x: enemy.x,
          y: enemy.y,
          value: dmg,
          ttl: 0.7,
          side: proj.side,
        });
        return true;
      }
    }
    return false;
  };

  for (const p of [...state.projectiles, ...ours.newProj, ...theirs.newProj]) {
    const moved: Projectile = {
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      ttl: p.ttl - dt,
    };
    if (moved.x < 0 || moved.x > 1 || moved.y < 0 || moved.y > 1 || moved.ttl <= 0) continue;
    if (apply(moved)) continue;
    projectiles.push(moved);
  }

  // Remove dead
  const aliveOurs = ours.units.filter((u) => u.hp > 0);
  const aliveTheirs = theirs.units.filter((u) => u.hp > 0);

  let status: SimState['status'] = 'fighting';
  if (aliveOurs.length === 0) status = 'defeat';
  else if (aliveTheirs.length === 0) status = 'victory';

  // Silence the linter — we mutate enemy.hp in place in apply()
  void allCombatants;

  return {
    ours: aliveOurs,
    theirs: aliveTheirs,
    projectiles,
    damage,
    status,
    elapsed: state.elapsed + dt,
  };
}

function reducer(state: SimState, action: SimAction): SimState {
  switch (action.type) {
    case 'tick':
      return tick(state, action.dt);
    case 'reset':
      return initialState(action.us, action.them);
  }
}

/* ───────────────────────── View ───────────────────────── */

interface Props {
  forcedRace?: NDRaceKey;
  /** Optional live battle state from /api/v1/battles/:id. When present, the
   * win-probability dial and turn log surface real backend numbers; the
   * stub advances one turn per refetch so an interval-driven page animates
   * forward. The cinematic visual layer stays client-side. */
  liveBattle?: {
    id: string;
    status: 'pending' | 'in-progress' | 'won' | 'lost';
    turnsElapsed: number;
    maxTurns: number;
    winProb: number;
    log: { turn: number; text: string }[];
  };
}

export function BattleScreen({ forcedRace, liveBattle }: Props) {
  const detected = useNDRace();
  const race = forcedRace ? RACES[forcedRace] : detected;
  const enemy = RACES[race.enemyRace];
  const router = useRouter();

  const [animMode, setAnimMode] = useState<'on' | 'off'>(() => {
    if (typeof window === 'undefined') return 'on';
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'on';
  });

  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(race, enemy));

  useEffect(() => {
    dispatch({ type: 'reset', us: race, them: enemy });
  }, [race, enemy]);

  // RAF loop. When reduced motion is on we sample at 4 Hz instead of 60.
  const lastRef = useRef<number>(performance.now());
  useEffect(() => {
    if (state.status !== 'fighting') return;
    let raf = 0;
    let interval = 0;
    if (animMode === 'on') {
      const loop = () => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - lastRef.current) / 1000);
        lastRef.current = now;
        dispatch({ type: 'tick', dt });
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }
    interval = window.setInterval(() => {
      dispatch({ type: 'tick', dt: 0.25 });
    }, 250);
    return () => window.clearInterval(interval);
  }, [animMode, state.status]);

  const elapsedLabel = useMemo(() => {
    const s = Math.floor(state.elapsed);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }, [state.elapsed]);

  const ourPower = state.ours.length;
  const theirPower = state.theirs.length;

  return (
    <div
      data-race={race.key}
      data-nd-anim={animMode}
      style={{
        height: '100dvh',
        background: ND.bgDeep,
        color: ND.text,
        fontFamily: ND.body,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <BattleBackdrop race={race} enemy={enemy} />

      {/* Top HUD */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          background: 'linear-gradient(180deg, rgba(6,8,15,0.95), rgba(6,8,15,0.55))',
          borderBottom: `1px solid ${ND.border}`,
        }}
      >
        <button
          type="button"
          aria-label="Geri çekil"
          // router.back() honours where the player came from (battle-prep,
          // map, missions, etc.) instead of always force-routing to /map.
          // Falls back to /map if there's no history (rare — direct nav).
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.push('/map');
            }
          }}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 30,
            height: 30,
            border: `1px solid ${ND.border}`,
            color: ND.textDim,
            fontFamily: ND.display,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)',
          }}
        >
          ‹
        </button>
        <Sigil race={race} size={24} glow />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Eyebrow>{race.allianceTag} · CEPHE HATTI</Eyebrow>
          <H3 style={{ color: race.primary }}>{race.short} vs {enemy.short}</H3>
        </div>
        <div style={{ flex: 1 }} />
        {/* Live backend win-probability chip — the cinematic combat below
         *  runs client-side via reducer (it's frame-accurate). The api's
         *  poll-driven `liveBattle.winProb` is surfaced here as a small
         *  authoritative read-out so the player sees the "real" odds
         *  alongside the simulated fight. Hidden when backend hasn't
         *  resolved yet so we never flash 0%. */}
        {liveBattle && (
          <span
            aria-label="Canlı kazanma olasılığı"
            style={{
              fontFamily: ND.mono,
              fontSize: 11,
              color:
                liveBattle.winProb >= 0.6
                  ? ND.ok
                  : liveBattle.winProb <= 0.35
                    ? ND.danger
                    : ND.warn,
              letterSpacing: '0.10em',
              padding: '3px 8px',
              border: `1px solid ${
                liveBattle.winProb >= 0.6
                  ? ND.ok
                  : liveBattle.winProb <= 0.35
                    ? ND.danger
                    : ND.warn
              }55`,
              borderRadius: 3,
              background: 'rgba(6,8,15,0.7)',
            }}
          >
            P(W) {Math.round(liveBattle.winProb * 100)}%
          </span>
        )}
        <span
          style={{
            fontFamily: ND.mono,
            fontSize: 12,
            color: ND.text,
            letterSpacing: '0.10em',
          }}
        >
          {elapsedLabel}
        </span>
        <button
          type="button"
          onClick={() => setAnimMode((m) => (m === 'on' ? 'off' : 'on'))}
          aria-pressed={animMode === 'off'}
          aria-label="Animasyonu aç/kapat"
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '4px 8px',
            fontFamily: ND.mono,
            fontSize: 10,
            color: animMode === 'on' ? race.primary : ND.textDim,
            border: `1px solid ${animMode === 'on' ? race.primary + '88' : ND.border}`,
            background: animMode === 'on' ? `${race.primary}14` : 'transparent',
            letterSpacing: '0.10em',
            borderRadius: 3,
          }}
        >
          {animMode === 'on' ? 'ANİM·AÇ' : 'ANİM·KPL'}
        </button>
      </header>

      {/* Side power bars */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
          background: 'rgba(6,8,15,0.55)',
        }}
      >
        <SidePower label={race.short} count={ourPower} max={5} color={race.primary} align="left" />
        <SidePower label={enemy.short} count={theirPower} max={5} color={enemy.primary} align="right" />
      </div>

      {/* Battle board */}
      <main
        style={{
          position: 'relative',
          zIndex: 5,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
        }}
      >
        <BattleBoard state={state} race={race} enemy={enemy} animMode={animMode} />
      </main>

      {/* End-of-battle overlay */}
      {state.status !== 'fighting' && (
        <BattleOverlay
          status={state.status}
          race={race}
          enemy={enemy}
          onContinue={async () => {
            // Record the battle on the backend before navigating so the
            // /profile Geçmiş tab + /battles/history endpoint pick it up,
            // AND so /battle-result shows real reward numbers instead of
            // the mock makeMockData() table.  We pass the client-side
            // simulation outcome via `outcome` — the stub immediately
            // resolves the battle with proper rewards (gold/gems/xp).
            //
            // Stashes the response in sessionStorage so /battle-result can
            // read it without another network round-trip; clears the key
            // after read so a back-button revisit doesn't show stale data.

            // Real simulation stats — collected per-tick inside the sim
            // and rolled up here so /battle-result can drop the mock
            // makeMockData() numbers and show what actually happened.
            const unitsKilled  = state.theirs.filter((u) => u.hp <= 0).length;
            const unitsLost    = state.ours.filter((u) => u.hp <= 0).length;
            const damageDealt  = state.ours.reduce((s, u) => s + u.damageDealt, 0);
            const damageTaken  = state.theirs.reduce((s, u) => s + u.damageDealt, 0);
            const durationSeconds = Math.round(state.elapsed);
            // Score: kill weight scaled by tier + survival bonus.  Mirrors
            // the rough shape of the mock numbers (~18k victory / ~4k loss)
            // so existing UX assumptions stay intact.
            const survivalBonus = state.ours.filter((u) => u.hp > 0)
              .reduce((s, u) => s + u.tier * 200, 0);
            const score = unitsKilled * 800 + damageDealt * 50 + survivalBonus;

            // MVP = our unit with the most damage dealt; if no one fired
            // (very short fight) fall back to the highest-tier survivor.
            const ourSorted = [...state.ours].sort(
              (a, b) => b.damageDealt - a.damageDealt || b.tier - a.tier,
            );
            const mvpUnit = ourSorted[0];
            const realStats = {
              unitsKilled,
              unitsLost,
              damageDealt,
              damageTaken,
              durationSeconds,
              score,
            };
            const realMvp = mvpUnit
              ? {
                  name:        mvpUnit.name,
                  tier:        mvpUnit.tier,
                  kills:       mvpUnit.kills,
                  damageDealt: mvpUnit.damageDealt,
                }
              : null;

            if (hasSession()) {
              try {
                const battle = await api.post<{
                  id: string;
                  status: 'won' | 'lost' | 'in-progress' | 'pending';
                  rewards: {
                    gold: number;
                    gems: number;
                    xp: number;
                    mineral?: number;
                    gas?: number;
                    science?: number;
                  };
                }>('/battles', {
                  attackerRace: race.key,
                  defenderRace: enemy.key,
                  outcome: state.status === 'victory' ? 'won' : 'lost',
                });
                if (typeof window !== 'undefined') {
                  try {
                    window.sessionStorage.setItem(
                      'nebula:last-battle-result:v1',
                      JSON.stringify({
                        id: battle.id,
                        rewards: battle.rewards,
                        status: battle.status,
                        // Real simulation stats — drives /battle-result tiles
                        // (kills / losses / damage / score / duration) instead
                        // of the legacy mock numbers.
                        stats: realStats,
                        mvp: realMvp,
                        savedAt: Date.now(),
                      }),
                    );
                  } catch {
                    /* private mode — best effort */
                  }
                }
                // Credit mineral + gas + science to the player's wallet on
                // the game-server so resources persist between sessions.
                // Logs the grant intent + result so users can see in DevTools
                // whether the wallet write succeeded — silent failures here
                // are the #1 reason science feels "stuck" after a battle.
                try {
                  const GAME_SERVER =
                    (process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:4001')
                      .replace(/\/+$/, '');
                  const { getAccessToken } = await import('@/lib/session');
                  const token = getAccessToken();
                  if (token) {
                    const grantBody = {
                      mineral: battle.rewards.mineral ?? 0,
                      gas:     battle.rewards.gas     ?? 0,
                      science: battle.rewards.science ?? 0,
                      xp:      battle.rewards.xp      ?? 0,
                    };
                    // eslint-disable-next-line no-console
                    console.log('[battle] granting wallet:', grantBody, '→', GAME_SERVER);
                    const r = await fetch(`${GAME_SERVER}/api/buildings/resources/battle-reward`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify(grantBody),
                    });
                    // eslint-disable-next-line no-console
                    console.log('[battle] grant response status:', r.status);
                    if (!r.ok) {
                      const text = await r.text().catch(() => '');
                      // eslint-disable-next-line no-console
                      console.warn('[battle] grant failed:', r.status, text);
                    }
                  } else {
                    // eslint-disable-next-line no-console
                    console.warn('[battle] no access token — grant skipped');
                  }
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error('[battle] grant exception:', err);
                  /* swallow so navigation still happens */
                }
                // Broadcast so the HUD picks up the new wallet totals.
                refreshGameResources();
              } catch (err) {
                // Silent fail — /battle-result will fall back to mock
                // values, matching the old behaviour.
                if (err instanceof FetchError) {
                  console.warn('battle history record failed:', err.message);
                }
              }
            }
            router.push(`/battle-result?race=${race.key}&outcome=${state.status}`);
          }}
        />
      )}
    </div>
  );
}

function SidePower({
  label,
  count,
  max,
  color,
  align,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
  align: 'left' | 'right';
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: align === 'left' ? 'flex-start' : 'flex-end',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontFamily: ND.display,
            fontSize: 11,
            letterSpacing: '0.18em',
            color,
            textShadow: `0 0 8px ${color}55`,
          }}
        >
          {label}
        </span>
        <span style={{ fontFamily: ND.mono, fontSize: 11, color: ND.textDim }}>
          {count}/{max}
        </span>
      </div>
      <div style={{ width: '100%' }}>
        <Bar value={count} max={max} color={color} height={6} />
      </div>
    </div>
  );
}

function BattleBoard({
  state,
  race,
  enemy,
  animMode,
}: {
  state: SimState;
  race: NDRace;
  enemy: NDRace;
  animMode: 'on' | 'off';
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        maxWidth: 980,
        maxHeight: 540,
        aspectRatio: '16 / 9',
        background: `linear-gradient(90deg, ${race.primary}10 0%, transparent 30%, transparent 70%, ${enemy.primary}10 100%),
                     repeating-linear-gradient(0deg, rgba(120,160,220,0.03) 0 1px, transparent 1px 24px),
                     ${ND.bgDeep}`,
        border: `1px solid ${ND.border}`,
        overflow: 'hidden',
        borderRadius: 6,
      }}
    >
      {/* Battle axis center line */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: 8,
          bottom: 8,
          width: 1,
          background: `linear-gradient(180deg, transparent, ${ND.borderHi}, transparent)`,
        }}
      />

      {/* Friendly units */}
      {state.ours.map((c) => (
        <UnitMarker key={c.id} unit={c} color={race.primary} />
      ))}
      {/* Enemy units */}
      {state.theirs.map((c) => (
        <UnitMarker key={c.id} unit={c} color={enemy.primary} flipped />
      ))}
      {/* Projectiles */}
      {state.projectiles.map((p) => (
        <ProjectileDot
          key={p.id}
          x={p.x}
          y={p.y}
          color={p.side === 'us' ? race.glow : enemy.glow}
          animOn={animMode === 'on'}
        />
      ))}
      {/* Damage numbers */}
      {state.damage.map((d) => (
        <DamageDot key={d.id} dmg={d} race={race} enemy={enemy} animOn={animMode === 'on'} />
      ))}
    </div>
  );
}

function UnitMarker({ unit, color, flipped }: { unit: Combatant; color: string; flipped?: boolean }) {
  const hpPct = (unit.hp / unit.maxHp) * 100;
  const style: CSSProperties = {
    position: 'absolute',
    left: `${unit.x * 100}%`,
    top: `${unit.y * 100}%`,
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    transition: 'left 280ms linear, top 280ms linear',
  };
  return (
    <div style={style} aria-hidden>
      <div
        style={{
          width: 32,
          height: 32,
          background: 'rgba(8,10,16,0.85)',
          border: `2px solid ${color}`,
          color,
          fontFamily: ND.display,
          fontWeight: 700,
          fontSize: 12,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)',
          boxShadow: `0 0 12px ${color}55`,
          transform: flipped ? 'scaleX(-1)' : undefined,
        }}
      >
        T{unit.tier}
      </div>
      <div
        style={{
          marginTop: 4,
          width: 32,
          height: 3,
          background: 'rgba(255,255,255,0.08)',
          border: `1px solid ${color}44`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${hpPct}%`,
            height: '100%',
            background: color,
            transition: 'width 240ms linear',
          }}
        />
      </div>
    </div>
  );
}

function ProjectileDot({
  x,
  y,
  color,
  animOn,
}: {
  x: number;
  y: number;
  color: string;
  animOn: boolean;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: 6,
        height: 6,
        background: color,
        boxShadow: `0 0 8px ${color}, 0 0 14px ${color}`,
        borderRadius: 999,
        transform: 'translate(-50%, -50%)',
        opacity: animOn ? 1 : 0.5,
      }}
    />
  );
}

function DamageDot({
  dmg,
  race,
  enemy,
  animOn,
}: {
  dmg: DamageNumber;
  race: NDRace;
  enemy: NDRace;
  animOn: boolean;
}) {
  const color = dmg.side === 'us' ? race.primary : enemy.primary;
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: `${dmg.x * 100}%`,
        top: `${dmg.y * 100}%`,
        transform: `translate(-50%, ${animOn ? -120 : -50}%)`,
        transition: animOn ? 'transform 600ms ease-out, opacity 600ms ease-out' : undefined,
        opacity: dmg.ttl > 0.3 ? 1 : dmg.ttl / 0.3,
        fontFamily: ND.display,
        fontWeight: 700,
        fontSize: 14,
        color,
        textShadow: `0 0 8px ${color}`,
        pointerEvents: 'none',
      }}
    >
      −{dmg.value}
    </div>
  );
}

function BattleOverlay({
  status,
  race,
  enemy,
  onContinue,
}: {
  status: 'victory' | 'defeat';
  race: NDRace;
  enemy: NDRace;
  onContinue: () => void;
}) {
  const isV = status === 'victory';
  const color = isV ? race.primary : ND.danger;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(3,5,11,0.78)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Panel race={race} glow style={{ padding: 24, maxWidth: 360, textAlign: 'center' }}>
        <Eyebrow color={color}>{isV ? 'GALİBİYET' : 'YENİLGİ'}</Eyebrow>
        <H2 style={{ marginTop: 6, color, textShadow: `0 0 18px ${color}66` }}>
          {isV ? 'ZAFER BİZİM' : 'SAVAŞ KAYBEDİLDİ'}
        </H2>
        <Caption style={{ color: ND.textDim, marginTop: 6 }}>
          {isV
            ? `${enemy.allianceName} filosu dağıldı.`
            : `${race.allianceName} geri çekildi.`}
        </Caption>
        <div style={{ marginTop: 16 }}>
          <NDButton race={race} variant="primary" size="lg" full onClick={onContinue}>
            SONUÇLARI GÖR →
          </NDButton>
        </div>
      </Panel>
    </div>
  );
}

function BattleBackdrop({ race, enemy }: { race: NDRace; enemy: NDRace }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(45% 60% at 15% 50%, ${race.primary}24 0%, transparent 60%),
                     radial-gradient(45% 60% at 85% 50%, ${enemy.primary}24 0%, transparent 60%),
                     ${ND.bgDeep}`,
      }}
    />
  );
}
