import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { MapActionDto, MapActionType } from './dto/map-action.dto';
import { MapActionLog } from './entities/map-action-log.entity';
import { PlayerResources } from './entities/player-resources.entity';

// ── Map constants (matches frontend WorldMap) ──────────────────────────────
const COLS = 26;
const ROWS = 20;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

// ── Static world geometry ──────────────────────────────────────────────────

export interface WorldBase {
  id: string;
  col: number;
  row: number;
  race: string;
  name: string;
  level: number;
  power: number;
  isPlayer?: boolean;
}

export interface WorldResource {
  id: string;
  col: number;
  row: number;
  kind: 'mineral' | 'gas' | 'energy';
  amount: number;
}

export interface WorldEnemy {
  id: string;
  col: number;
  row: number;
  race: string;
  power: number;
  patrolPath: Array<[number, number]>;
}

export interface TerritoryZone {
  race: string;
  centerCol: number;
  centerRow: number;
  radius: number;
}

// ── Deterministic seeding (mirrors WorldMap.tsx) ──────────────────────────

function makeBases(playerRace: string): WorldBase[] {
  return [
    { id: 'player',    col: 13, row: 10, race: playerRace, name: 'Ana Üssün',        level: 7, power: 4800, isPlayer: true },
    { id: 'zerg-1',    col:  3, row:  3, race: 'zerg',     name: 'Kovan Kalbi',       level: 5, power: 3200 },
    { id: 'otomat-1',  col: 22, row:  3, race: 'otomat',   name: 'Prime Hub',         level: 6, power: 4100 },
    { id: 'canavar-1', col:  3, row: 17, race: 'canavar',  name: 'Ateş Kalesi',       level: 4, power: 2700 },
    { id: 'seytan-1',  col: 22, row: 16, race: 'seytan',   name: 'Lanet Kulesi',      level: 6, power: 3900 },
    { id: 'insan-1',   col: 13, row:  3, race: 'insan',    name: 'Kuzey Garnizon',    level: 3, power: 1800 },
    { id: 'neutral-1', col:  7, row: 10, race: 'canavar',  name: 'Yıkılmış Kale',    level: 2, power:  900 },
    { id: 'neutral-2', col: 19, row: 11, race: 'zerg',     name: 'Kovan Çıkıntısı',  level: 3, power: 1200 },
  ];
}

function makeResources(): WorldResource[] {
  const seed: Array<[number, number, 'mineral' | 'gas' | 'energy']> = [
    [8, 5, 'mineral'], [16, 5, 'mineral'], [5, 11, 'gas'],
    [11, 7, 'energy'], [17, 8, 'mineral'], [9, 14, 'gas'],
    [15, 14, 'energy'], [20, 8, 'gas'], [7, 7, 'mineral'],
    [11, 14, 'mineral'], [19, 6, 'energy'], [4, 8, 'energy'],
    [22, 10, 'mineral'], [13, 16, 'gas'], [6, 15, 'energy'],
    [20, 14, 'mineral'], [8, 17, 'gas'], [16, 16, 'energy'],
  ];
  return seed.map(([col, row, kind], i) => ({
    id: `res-${i}`, col, row, kind, amount: 500 + i * 180,
  }));
}

function makeEnemies(): WorldEnemy[] {
  const patrols: Array<[string, Array<[number, number]>]> = [
    ['zerg',    [[10, 5],  [12, 6], [11, 8],  [9, 7],  [10, 5]]],
    ['canavar', [[7, 12],  [10, 13], [9, 15], [7, 14], [7, 12]]],
    ['seytan',  [[17, 5],  [19, 7], [18, 9],  [16, 8], [17, 5]]],
    ['otomat',  [[15, 11], [17, 12], [16, 14], [14, 13], [15, 11]]],
    ['zerg',    [[4, 12],  [6, 11], [5, 14],  [3, 13], [4, 12]]],
    ['seytan',  [[18, 3],  [20, 4], [21, 5],  [19, 5], [18, 3]]],
  ];
  return patrols.map(([race, path], i) => ({
    id: `enemy-${i}`,
    col: path[0][0],
    row: path[0][1],
    race: race as string,
    power: 300 + i * 250,
    patrolPath: path as Array<[number, number]>,
  }));
}

function makeTerritories(): TerritoryZone[] {
  return [
    { race: 'zerg',    centerCol:  3, centerRow:  3, radius: 5 },
    { race: 'otomat',  centerCol: 22, centerRow:  3, radius: 5 },
    { race: 'canavar', centerCol:  3, centerRow: 17, radius: 5 },
    { race: 'seytan',  centerCol: 22, centerRow: 16, radius: 5 },
  ];
}

// ── Coordinate lookup helpers ─────────────────────────────────────────────

type TargetKind = 'own_base' | 'enemy_base' | 'resource' | 'enemy' | 'empty';

function classifyTarget(col: number, row: number): TargetKind {
  const bases = makeBases('insan');
  for (const base of bases) {
    if (base.col === col && base.row === row) {
      return base.isPlayer ? 'own_base' : 'enemy_base';
    }
  }
  const resources = makeResources();
  if (resources.some((r) => r.col === col && r.row === row)) {
    return 'resource';
  }
  // Use initial patrol positions for server-side validation
  const enemies = makeEnemies();
  if (enemies.some((e) => e.col === col && e.row === row)) {
    return 'enemy';
  }
  return 'empty';
}

// Action → allowed target kinds (server-side mirror of frontend ActionPanel)
const ACTION_TARGETS: Record<MapActionType, TargetKind[]> = {
  [MapActionType.ATTACK]:  ['enemy_base', 'enemy'],
  [MapActionType.SCOUT]:   ['enemy_base', 'resource', 'enemy'],
  [MapActionType.GATHER]:  ['resource'],
  [MapActionType.RALLY]:   ['own_base', 'enemy_base'],
  [MapActionType.DEFEND]:  ['own_base'],
  [MapActionType.UPGRADE]: ['own_base'],
  [MapActionType.FLEE]:    ['enemy'],
};

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class MapService {
  constructor(
    @InjectRepository(PlayerResources)
    private readonly resourcesRepo: Repository<PlayerResources>,
    @InjectRepository(MapActionLog)
    private readonly actionLogRepo: Repository<MapActionLog>,
    private readonly redis: RedisService,
  ) {}

  // ── GET /api/map/state ───────────────────────────────────────────────────

  getMapState(playerRace = 'insan') {
    return {
      bases: makeBases(playerRace),
      resources: makeResources(),
      enemies: makeEnemies(),
      territories: makeTerritories(),
    };
  }

  // ── GET /api/player/resources ────────────────────────────────────────────

  async getPlayerResources(playerId: string) {
    if (!playerId) throw new UnauthorizedException('playerId is required');

    let record = await this.resourcesRepo.findOne({ where: { playerId } });
    if (!record) {
      record = this.resourcesRepo.create({ playerId });
      await this.resourcesRepo.save(record);
    }

    return {
      mineral:       record.mineral,
      gas:           record.gas,
      energy:        record.energy,
      population:    record.population,
      populationCap: record.populationCap,
    };
  }

  // ── POST /api/map/action ─────────────────────────────────────────────────

  async executeAction(dto: MapActionDto) {
    await this.enforceRateLimit(dto.playerId);
    this.validateCoordinates(dto.targetCol, dto.targetRow);
    this.validateActionTarget(dto.action, dto.targetCol, dto.targetRow);

    const resources = await this.getPlayerResources(dto.playerId);
    const message = this.buildResultMessage(dto.action, dto.targetCol, dto.targetRow);

    await this.actionLogRepo.save(
      this.actionLogRepo.create({
        playerId:  dto.playerId,
        action:    dto.action,
        targetCol: dto.targetCol,
        targetRow: dto.targetRow,
        result:    message,
      }),
    );

    return { ok: true, message, updatedResources: resources };
  }

  // ── Validation helpers ────────────────────────────────────────────────────

  validateCoordinates(col: number, row: number): void {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) {
      throw new BadRequestException(
        `Coordinates out of bounds: col must be 0–${COLS - 1}, row must be 0–${ROWS - 1}`,
      );
    }
  }

  validateActionTarget(action: MapActionType, col: number, row: number): void {
    const kind = classifyTarget(col, row);
    const allowed = ACTION_TARGETS[action];
    if (!allowed.includes(kind)) {
      throw new BadRequestException(
        `Action "${action}" is not valid for target type "${kind}" at [${col},${row}]`,
      );
    }
  }

  async enforceRateLimit(playerId: string): Promise<void> {
    const key = `map:rate:${playerId}`;
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    await this.redis.zremrangebyscore(key, '-inf', windowStart);
    const count = await this.redis.zcard(key);

    if (count >= RATE_LIMIT_MAX) {
      throw new HttpException(
        'Rate limit exceeded: max 10 actions per minute',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Unique member per action to allow multiple entries at the same ms
    await this.redis.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`);
    await this.redis.expire(key, 60);
  }

  private buildResultMessage(action: MapActionType, col: number, row: number): string {
    const kind = classifyTarget(col, row);
    const messages: Record<MapActionType, string> = {
      [MapActionType.ATTACK]:  `Saldırı emri verildi → [${col},${row}]`,
      [MapActionType.SCOUT]:   `Keşif başlatıldı → [${col},${row}]`,
      [MapActionType.GATHER]:  `Kaynak toplama başlatıldı → [${col},${row}] (${kind})`,
      [MapActionType.RALLY]:   `Kuvvetler toplanıyor → [${col},${row}]`,
      [MapActionType.DEFEND]:  `Savunma mevzisi kuruldu → [${col},${row}]`,
      [MapActionType.UPGRADE]: `Geliştirme başlatıldı → [${col},${row}]`,
      [MapActionType.FLEE]:    `Geri çekilme emri verildi → [${col},${row}]`,
    };
    return messages[action];
  }
}
