import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

/* Battle + battle-prep stub.
 *
 * Wraps the deterministic logic the /battle-prep, /battle and /battle-result
 * screens need so they can talk to a real endpoint while the full backend
 * BattleModule lands. State is in-memory only — battles created here vanish on
 * container restart.
 *
 * - POST /battles               → create + return new battle id
 * - GET  /battles/:id           → battle state (rolls forward each call)
 * - GET  /battles/me/last       → most-recent battle for the caller (last seed)
 * - GET  /battle-prep/formation → returns the saved formation (stub default)
 * - POST /battle-prep/formation → echo back (no persistence in stub) */

type RaceKey = 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';

interface BattleState {
  id: string;
  attackerRace: RaceKey;
  defenderRace: RaceKey;
  status: 'pending' | 'in-progress' | 'won' | 'lost';
  turnsElapsed: number;
  maxTurns: number;
  /** 0–100 prediction of victory at the current turn. */
  winProb: number;
  log: { turn: number; text: string }[];
  rewards: { gold: number; gems: number; xp: number };
  createdAt: string;
}

const BATTLES = new Map<string, BattleState>();

function rand(seed: number): number {
  // mulberry32
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function newBattle(attacker: RaceKey, defender: RaceKey): BattleState {
  const id = `b_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
  const winProb = 50 + Math.floor(rand(id.length) * 30); // 50–80
  return {
    id,
    attackerRace: attacker,
    defenderRace: defender,
    status: 'in-progress',
    turnsElapsed: 0,
    maxTurns: 8,
    winProb,
    log: [{ turn: 0, text: 'Filolar konuşlandı. İlk dalga geliyor.' }],
    rewards: { gold: 0, gems: 0, xp: 0 },
    createdAt: new Date().toISOString(),
  };
}

function advance(state: BattleState): BattleState {
  if (state.status !== 'in-progress') return state;
  state.turnsElapsed += 1;
  const roll = rand(state.turnsElapsed * 13 + state.id.length);
  if (state.turnsElapsed >= state.maxTurns) {
    if (state.winProb >= 60) {
      state.status = 'won';
      state.rewards = { gold: 1500 + Math.floor(roll * 1000), gems: 50, xp: 320 };
      state.log.push({ turn: state.turnsElapsed, text: 'Düşman filosu yok edildi. Zafer.' });
    } else {
      state.status = 'lost';
      state.rewards = { gold: 250, gems: 0, xp: 80 };
      state.log.push({ turn: state.turnsElapsed, text: 'Filomuz geri çekildi. Yenilgi kabul edildi.' });
    }
  } else {
    state.winProb = Math.max(20, Math.min(95, state.winProb + Math.round(roll * 10 - 4)));
    state.log.push({
      turn: state.turnsElapsed,
      text:
        roll < 0.25
          ? 'Sniper menzile girdi.'
          : roll < 0.5
            ? 'Genetik Savaşçı stim aktif.'
            : roll < 0.75
              ? 'Düşman flagman hasar aldı.'
              : 'Mecha Walker hattı korudu.',
    });
  }
  return state;
}

@ApiTags('battles (stub)')
@Controller('battles')
export class BattlesStubController {
  @Post()
  @ApiOperation({ summary: 'Start a new battle (stub)' })
  start(@Body() body: { attackerRace?: RaceKey; defenderRace?: RaceKey }) {
    const battle = newBattle(body?.attackerRace ?? 'insan', body?.defenderRace ?? 'zerg');
    BATTLES.set(battle.id, battle);
    return battle;
  }

  @Get('me/last')
  @ApiOperation({ summary: 'Last battle for this device (stub)' })
  last() {
    const list = [...BATTLES.values()];
    return list[list.length - 1] ?? null;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get battle state (rolls a turn forward)' })
  get(@Param('id') id: string) {
    let state = BATTLES.get(id);
    if (!state) {
      state = newBattle('insan', 'zerg');
      state.id = id;
      BATTLES.set(id, state);
    }
    return advance(state);
  }
}

@ApiTags('battle-prep (stub)')
@Controller('battle-prep')
export class BattlePrepStubController {
  @Get('formation')
  @ApiOperation({ summary: 'Saved formation for this player (stub default)' })
  getFormation() {
    return {
      id: 'fm_default',
      name: 'Saldırı Hattı',
      slots: [
        { idx: 0, unitType: 'marine',        count: 6 },
        { idx: 1, unitType: 'medic',         count: 2 },
        { idx: 2, unitType: 'siege_tank',    count: 2 },
        { idx: 3, unitType: 'mecha_walker',  count: 1 },
        { idx: 4, unitType: 'captain',       count: 1 },
      ],
      power: 5_280,
    };
  }

  @Post('formation')
  @ApiOperation({ summary: 'Save formation (stub — echoes input)' })
  setFormation(@Body() body: unknown) {
    return { saved: true, formation: body, at: new Date().toISOString() };
  }
}
