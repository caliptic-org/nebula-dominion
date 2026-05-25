import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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

function newBattle(
  attacker: RaceKey,
  defender: RaceKey,
  options: { forceOutcome?: 'won' | 'lost' } = {},
): BattleState {
  const id = `b_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
  const winProb = 50 + Math.floor(rand(id.length) * 30); // 50–80
  const base: BattleState = {
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
  // Frontend can call POST /battles with { outcome: 'won' | 'lost' } to
  // skip the 8-turn simulation and get an immediately-resolved battle with
  // proper rewards. Used by BattleScreen.onContinue after the client-side
  // animation finishes — the simulation already determined the outcome
  // visually, so the backend just needs to log it + grant rewards.
  if (options.forceOutcome === 'won') {
    base.status = 'won';
    base.rewards = { gold: 1500 + Math.floor(rand(id.length * 7) * 1000), gems: 50, xp: 320 };
    base.turnsElapsed = base.maxTurns;
    base.log.push({ turn: base.maxTurns, text: 'Düşman filosu yok edildi. Zafer.' });
  } else if (options.forceOutcome === 'lost') {
    base.status = 'lost';
    base.rewards = { gold: 250, gems: 0, xp: 80 };
    base.turnsElapsed = base.maxTurns;
    base.log.push({ turn: base.maxTurns, text: 'Filomuz geri çekildi. Yenilgi kabul edildi.' });
  }
  return base;
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
  start(
    @Body()
    body: {
      attackerRace?: RaceKey;
      defenderRace?: RaceKey;
      /** Optional — when set, the battle is immediately resolved with the
       *  matching rewards instead of starting in 'in-progress'.  Used by
       *  the frontend BattleScreen after its client-side animation
       *  finishes so /battle-result can show real numbers. */
      outcome?: 'won' | 'lost' | 'victory' | 'defeat';
    },
  ) {
    const forceOutcome =
      body?.outcome === 'won' || body?.outcome === 'victory'
        ? 'won'
        : body?.outcome === 'lost' || body?.outcome === 'defeat'
          ? 'lost'
          : undefined;
    const battle = newBattle(
      body?.attackerRace ?? 'insan',
      body?.defenderRace ?? 'zerg',
      { forceOutcome },
    );
    BATTLES.set(battle.id, battle);
    return battle;
  }

  @Get('me/last')
  @ApiOperation({ summary: 'Last battle for this device (stub)' })
  last() {
    const list = [...BATTLES.values()];
    return list[list.length - 1] ?? null;
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My last 20 battles (stub — currently device-global)' })
  history(@Request() _req: any) {
    const all = [...BATTLES.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const entries = all.slice(0, 20).map((b) => ({
      id: b.id,
      outcome: b.status,
      opponent: b.defenderRace,
      score: b.rewards.gold + b.rewards.xp * 5,
      mvp: null as string | null,
      when: b.createdAt,
    }));
    return { total: entries.length, entries };
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
