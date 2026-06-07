import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Race } from '../matchmaking/dto/join-queue.dto';

export enum GameStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  FINISHED = 'finished',
}

export enum TurnPhase {
  DEPLOY = 'deploy',
  ACTION = 'action',
  COMBAT = 'combat',
}

export interface UnitState {
  id: string;
  type: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  position: { x: number; y: number };
  actionUsed: boolean;
  /** Ability IDs unlocked through mutations */
  abilities?: string[];
  /** IDs of mutations applied to this unit, in application order */
  appliedMutations?: string[];
  /** Remaining cooldown turns per skill slot (index 0-3) */
  skillCooldowns?: number[];
  /** Original cooldown duration per skill slot, used for ability_ready payload */
  skillCooldownMax?: number[];
}

export interface PlayerState {
  userId: string;
  socketId: string;
  race: Race;
  elo: number;
  gamesPlayed: number;
  hp: number;
  mana: number;
  units: UnitState[];
  connected: boolean;
  lastActionSequence: number;
  disconnectedAt?: number;
}

export interface GameRoom {
  id: string;
  matchId: string;
  status: GameStatus;
  mode: string;
  currentTurn: number;
  currentPlayerId: string;
  phase: TurnPhase;
  players: Record<string, PlayerState>;
  stateHash: string;
  createdAt: number;
  turnStartedAt: number;
  winner?: string;
}

const ROOM_KEY = (id: string) => `game:room:${id}`;
const USER_ROOM_KEY = (uid: string) => `user:room:${uid}`;
const ACTIVE_ROOMS_KEY = 'game:active_rooms';

/**
 * Cycle-19 BAL-DEPTH-1 — max units a side fields in a battle. A player can own
 * dozens of trained units; the turn-based engine + battle UI expect a bounded
 * roster, so we field the strongest N. 6 mirrors the size of the old per-race
 * UNIT_TEMPLATES rosters (4-6 units) the engine was tuned around.
 */
export const BATTLE_FORMATION_SIZE = 6;

/** Default PvE bot strength relative to the player's formation (fair-but-winnable). */
export const PVE_BOT_DIFFICULTY = 0.9;

/** Minimal persisted-roster shape buildFormationUnits accepts (a subset of
 *  PlayerUnit) so RoomService stays decoupled from the units entity. */
export interface RosterUnitInput {
  type: string;
  hp: number;
  maxHp?: number;
  attack: number;
  defense: number;
  speed: number;
  abilities?: string[];
}

/** A player input to RoomService.create — optionally carrying a pre-built
 *  battle roster (cycle-19 BAL-DEPTH-1). */
export type CreatePlayerInput = Pick<
  PlayerState,
  'userId' | 'socketId' | 'race' | 'elo' | 'gamesPlayed'
> & { units?: UnitState[] };

const UNIT_TEMPLATES: Record<Race, Omit<UnitState, 'id' | 'position' | 'actionUsed'>[]> = {
  [Race.HUMAN]: [
    { type: 'soldier', hp: 30, maxHp: 30, attack: 8, defense: 5, speed: 3 },
    { type: 'soldier', hp: 30, maxHp: 30, attack: 8, defense: 5, speed: 3 },
    { type: 'mage', hp: 20, maxHp: 20, attack: 15, defense: 2, speed: 2 },
    { type: 'archer', hp: 25, maxHp: 25, attack: 10, defense: 3, speed: 4 },
  ],
  [Race.ZERG]: [
    { type: 'drone', hp: 20, maxHp: 20, attack: 6, defense: 3, speed: 5 },
    { type: 'drone', hp: 20, maxHp: 20, attack: 6, defense: 3, speed: 5 },
    { type: 'drone', hp: 20, maxHp: 20, attack: 6, defense: 3, speed: 5 },
    { type: 'guardian', hp: 50, maxHp: 50, attack: 12, defense: 8, speed: 1 },
  ],
  [Race.AUTOMATON]: [
    { type: 'combat-bot', hp: 40, maxHp: 40, attack: 10, defense: 10, speed: 2 },
    { type: 'combat-bot', hp: 40, maxHp: 40, attack: 10, defense: 10, speed: 2 },
    { type: 'artillery', hp: 20, maxHp: 20, attack: 20, defense: 2, speed: 1 },
    { type: 'nano-drone', hp: 15, maxHp: 15, attack: 7, defense: 3, speed: 6 },
  ],
  // BEAST / DEMON come from api's race.enum but don't have race-specific
  // starting rosters yet. Mirror the Human template so a Canavar / Şeytan
  // player who matchmakes doesn't crash on undefined-deref. Replace these
  // with race-themed starter units when the lore + assets land.
  [Race.BEAST]: [
    { type: 'soldier', hp: 30, maxHp: 30, attack: 8, defense: 5, speed: 3 },
    { type: 'soldier', hp: 30, maxHp: 30, attack: 8, defense: 5, speed: 3 },
    { type: 'mage', hp: 20, maxHp: 20, attack: 15, defense: 2, speed: 2 },
    { type: 'archer', hp: 25, maxHp: 25, attack: 10, defense: 3, speed: 4 },
  ],
  [Race.DEMON]: [
    { type: 'soldier', hp: 30, maxHp: 30, attack: 8, defense: 5, speed: 3 },
    { type: 'soldier', hp: 30, maxHp: 30, attack: 8, defense: 5, speed: 3 },
    { type: 'mage', hp: 20, maxHp: 20, attack: 15, defense: 2, speed: 2 },
    { type: 'archer', hp: 25, maxHp: 25, attack: 10, defense: 3, speed: 4 },
  ],
};

export const AGE_2_AUTOMATON_UNITS: Omit<UnitState, 'id' | 'position' | 'actionUsed'>[] = [
  { type: 'siege-automaton', hp: 80, maxHp: 80, attack: 25, defense: 15, speed: 1 },
  { type: 'shield-sentinel', hp: 100, maxHp: 100, attack: 8, defense: 25, speed: 1 },
  { type: 'nano-drone', hp: 15, maxHp: 15, attack: 7, defense: 3, speed: 6 },
  { type: 'nano-drone', hp: 15, maxHp: 15, attack: 7, defense: 3, speed: 6 },
  { type: 'repair-bot', hp: 30, maxHp: 30, attack: 5, defense: 8, speed: 3 },
  { type: 'combat-bot-mk2', hp: 55, maxHp: 55, attack: 15, defense: 12, speed: 2 },
];

@Injectable()
export class RoomService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(RoomService.name);
  private redis: Redis;
  private readonly roomTtl: number;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis(config.get<string>('redisUrl', 'redis://localhost:6379'), {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
    this.roomTtl = config.get<number>('game.roomTtlSeconds', 3600);
  }

  async onModuleInit(): Promise<void> {
    await this.redis.connect();
  }

  async create(
    matchId: string,
    p1: CreatePlayerInput,
    p2: CreatePlayerInput,
    mode: string,
  ): Promise<GameRoom> {
    const roomId = uuidv4();
    const players: Record<string, PlayerState> = {};

    for (const p of [p1, p2]) {
      // Cycle-19 BAL-DEPTH-1 — fight with the player's actual trained/merged
      // roster when supplied; fall back to the race template otherwise (fresh
      // account / roster-load failure) so a battle always has units. The
      // `units` field never reaches the persisted PlayerState beyond here.
      const { units: providedUnits, ...rest } = p;
      players[p.userId] = {
        ...rest,
        hp: 100,
        mana: 50,
        units:
          providedUnits && providedUnits.length > 0
            ? providedUnits
            : this.buildStartingUnits(p.race),
        connected: true,
        lastActionSequence: -1,
      };
    }

    const playerIds = Object.keys(players);
    // cycle 17 BAL-1 — speed initiative / first-strike.
    // The turn engine is strictly alternating (one player acts, then the
    // other), so a unit's `speed` had no combat value beyond move range —
    // ZERG's +30% speed bonus was dead weight. Wire it in here: the player
    // whose roster has the higher total speed acts FIRST, turning the speed
    // stat into a meaningful first-strike advantage. Ties (e.g. mirror
    // matches) fall back to the original coin flip so the opening turn isn't
    // deterministic when initiative is equal.
    const initiative = (pid: string): number =>
      players[pid].units.reduce((sum, u) => sum + (u.speed ?? 0), 0);
    const [a, b] = playerIds;
    const firstPlayer =
      initiative(a) === initiative(b)
        ? playerIds[Math.floor(Math.random() * 2)]
        : initiative(a) > initiative(b)
          ? a
          : b;

    const room: GameRoom = {
      id: roomId,
      matchId,
      status: GameStatus.WAITING,
      mode,
      currentTurn: 1,
      currentPlayerId: firstPlayer,
      phase: TurnPhase.DEPLOY,
      players,
      stateHash: '',
      createdAt: Date.now(),
      turnStartedAt: Date.now(),
    };

    room.stateHash = this.hashState(room);
    await this.save(room);
    this.logger.log(`Room ${roomId} created for match ${matchId}`);
    return room;
  }

  async get(roomId: string): Promise<GameRoom | null> {
    const raw = await this.redis.get(ROOM_KEY(roomId));
    return raw ? JSON.parse(raw) : null;
  }

  async save(room: GameRoom): Promise<void> {
    room.stateHash = this.hashState(room);
    await this.redis.set(ROOM_KEY(room.id), JSON.stringify(room), 'EX', this.roomTtl);
  }

  async setUserRoom(userId: string, roomId: string): Promise<void> {
    await this.redis.set(USER_ROOM_KEY(userId), roomId, 'EX', this.roomTtl);
  }

  async clearUserRoom(userId: string): Promise<void> {
    await this.redis.del(USER_ROOM_KEY(userId));
  }

  async addToActiveRooms(roomId: string): Promise<void> {
    await this.redis.sadd(ACTIVE_ROOMS_KEY, roomId);
  }

  async removeFromActiveRooms(roomId: string): Promise<void> {
    await this.redis.srem(ACTIVE_ROOMS_KEY, roomId);
  }

  async getActiveRoomIds(): Promise<string[]> {
    return this.redis.smembers(ACTIVE_ROOMS_KEY);
  }

  async getRoomByUser(userId: string): Promise<GameRoom | null> {
    const roomId = await this.redis.get(USER_ROOM_KEY(userId));
    if (!roomId) return null;
    return this.get(roomId);
  }

  async setPlayerConnection(roomId: string, userId: string, connected: boolean, socketId?: string): Promise<GameRoom | null> {
    const room = await this.get(roomId);
    if (!room || !room.players[userId]) return null;

    room.players[userId].connected = connected;
    if (socketId) room.players[userId].socketId = socketId;
    if (!connected) room.players[userId].disconnectedAt = Date.now();
    else delete room.players[userId].disconnectedAt;

    if (!connected && room.status === GameStatus.IN_PROGRESS) {
      room.status = GameStatus.PAUSED;
    } else if (connected && room.status === GameStatus.PAUSED) {
      const allConnected = Object.values(room.players).every((p) => p.connected);
      if (allConnected) room.status = GameStatus.IN_PROGRESS;
    }

    await this.save(room);
    return room;
  }

  hashState(room: Partial<GameRoom>): string {
    const { players, currentTurn, phase, currentPlayerId } = room as GameRoom;
    const state = JSON.stringify({ players, currentTurn, phase, currentPlayerId });
    let h = 5381;
    for (let i = 0; i < state.length; i++) {
      h = ((h << 5) + h + state.charCodeAt(i)) >>> 0;
    }
    return h.toString(16);
  }

  private buildStartingUnits(race: Race): UnitState[] {
    const templates = UNIT_TEMPLATES[race] ?? UNIT_TEMPLATES[Race.HUMAN];
    return templates.map((t, i) => ({
      ...t,
      id: uuidv4(),
      position: { x: 0, y: i },
      actionUsed: false,
    }));
  }

  /**
   * Cycle-19 BAL-DEPTH-1 — build a battle formation from a player's persisted
   * trained/merged roster. Previously every battle used a fixed UNIT_TEMPLATES
   * roster, so training, the 5-tier merge ladder, per-unit upgrades and race
   * bonuses had ZERO effect on who won — character development was decoupled
   * from combat. Now the player fights with the strongest BATTLE_FORMATION_SIZE
   * of their ACTUAL units (PlayerUnit hp/attack/defense/speed already bake in
   * upgrade +10%/level, merge results, and race multipliers). Units enter at
   * full health (maxHp). An empty roster (fresh account) or a load failure
   * upstream falls back to the race template so a battle always has units —
   * the engine and FE behave exactly as before for those cases.
   */
  buildFormationUnits(roster: RosterUnitInput[] | null | undefined, race: Race): UnitState[] {
    const valid = (roster ?? []).filter(
      (u) =>
        !!u &&
        Number.isFinite(Number(u.hp)) &&
        Number(u.hp) > 0 &&
        Number.isFinite(Number(u.attack)),
    );
    if (valid.length === 0) return this.buildStartingUnits(race);

    const power = (u: RosterUnitInput) =>
      Math.max(0, Number(u.hp)) * Math.max(0, Number(u.attack));
    const top = [...valid].sort((a, b) => power(b) - power(a)).slice(0, BATTLE_FORMATION_SIZE);

    return top.map((u, i) => {
      const full = Math.max(1, Math.round(Number(u.maxHp ?? u.hp)));
      return {
        id: uuidv4(),
        type: String(u.type ?? 'unit'),
        hp: full,
        maxHp: full,
        attack: Math.max(0, Math.round(Number(u.attack))),
        defense: Math.max(0, Math.round(Number(u.defense))),
        speed: Math.max(0, Math.round(Number(u.speed))),
        position: { x: 0, y: i },
        actionUsed: false,
        abilities: Array.isArray(u.abilities) ? u.abilities : [],
      };
    });
  }

  /**
   * Cycle-19 BAL-DEPTH-1 — PvE bot roster. Mirrors the player's formation at
   * `difficulty` strength so the bot scales WITH the player's development (a
   * developed roster no longer one-shots a fixed template weakling) and the
   * fight stays fair-but-winnable. Falls back to the bot's race template when
   * the player has no formation (fresh account).
   */
  buildBotMirror(
    playerFormation: UnitState[] | null | undefined,
    botRace: Race,
    difficulty = PVE_BOT_DIFFICULTY,
  ): UnitState[] {
    const src = (playerFormation ?? []).filter((u) => !!u && Number(u.maxHp) > 0);
    if (src.length === 0) return this.buildStartingUnits(botRace);
    const f = Math.min(1.5, Math.max(0.1, Number(difficulty) || PVE_BOT_DIFFICULTY));
    return src.map((u, i) => {
      const full = Math.max(1, Math.round(Number(u.maxHp) * f));
      return {
        id: uuidv4(),
        type: u.type,
        hp: full,
        maxHp: full,
        attack: Math.max(1, Math.round(Number(u.attack) * f)),
        defense: Math.max(0, Math.round(Number(u.defense))),
        speed: Math.max(0, Math.round(Number(u.speed))),
        position: { x: 0, y: i },
        actionUsed: false,
        abilities: Array.isArray(u.abilities) ? [...u.abilities] : [],
      };
    });
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
