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
  ],
};

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
    p1: Pick<PlayerState, 'userId' | 'socketId' | 'race' | 'elo' | 'gamesPlayed'>,
    p2: Pick<PlayerState, 'userId' | 'socketId' | 'race' | 'elo' | 'gamesPlayed'>,
    mode: string,
  ): Promise<GameRoom> {
    const roomId = uuidv4();
    const players: Record<string, PlayerState> = {};

    for (const p of [p1, p2]) {
      players[p.userId] = {
        ...p,
        hp: 100,
        mana: 50,
        units: this.buildStartingUnits(p.race),
        connected: true,
        lastActionSequence: -1,
      };
    }

    const playerIds = Object.keys(players);
    const firstPlayer = playerIds[Math.floor(Math.random() * 2)];

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

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
