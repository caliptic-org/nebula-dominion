import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Race } from './entities/race.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PROFILE_FIELDS: (keyof User)[] = [
  'id',
  'email',
  'username',
  'race',
  'isActive',
  'lastLoginAt',
  'createdAt',
  'updatedAt',
];

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.userRepo.find({ select: PROFILE_FIELDS });
    return users as Omit<User, 'password'>[];
  }

  async findOne(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepo.findOne({ where: { id }, select: PROFILE_FIELDS });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user as Omit<User, 'password'>;
  }

  async getProfile(id: string): Promise<Omit<User, 'password'>> {
    return this.findOne(id);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<Omit<User, 'password'>> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    if (dto.username && dto.username !== user.username) {
      const taken = await this.userRepo.findOne({ where: { username: dto.username } });
      if (taken) throw new ConflictException('username already taken');
      user.username = dto.username;
    }

    await this.userRepo.save(user);
    return this.findOne(id);
  }

  async selectRace(id: string, race: Race): Promise<Omit<User, 'password'>> {
    // Playable-race whitelist.
    //
    // RACE_VALUES (enum DTO validation) accepts all 5 races because the
    // FE catalog has lore, commanders, buildings and assets for every
    // one. But UnitType enum + UNIT_CONFIGS in
    // apps/game-server/src/units/constants/race-configs.constants.ts
    // only carry trainable units for HUMAN + ZERG. AUTOMATON / BEAST /
    // DEMON players land on a base that can't train a single unit
    // (POST /units/train → "Unknown unit type"), can't merge, can't
    // queue PvP. Audit (workflow wf_cea4d7f7-3f1) flagged this as the
    // top "selectable but unplayable" trap.
    //
    // Until the 3-race unit kits ship (each needs ~6 unit configs +
    // stat balance + MERGE_RECIPES + a player_units_type_enum
    // migration), reject the unplayable races here so a new player
    // never gets stuck mid-tutorial.
    const PLAYABLE: Race[] = [Race.HUMAN, Race.ZERG];
    if (!PLAYABLE.includes(race)) {
      throw new BadRequestException(
        `Bu ırk yakında oynanabilir olacak — şu an sadece ${PLAYABLE.join(', ')} aktif.`,
      );
    }

    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    if (user.race) {
      throw new BadRequestException(
        'Race has already been chosen for this player and cannot be changed',
      );
    }
    user.race = race;
    await this.userRepo.save(user);

    // Seed starter buildings — without this, fresh players land on /base
    // with an empty grid AND every downstream feature gated by an active
    // building stays locked: /base/production can't train (no barracks
    // → gate `production.train_marine` blocks the button), /merge has
    // nothing to merge (no units → demo placeholder cards only), /shop
    // VIP claim works but the actual gameplay loop is dead.  4-building
    // pack covers the immediate progression chain:
    //
    //   command_center  — always; HQ for tier gates
    //   mineral_extractor — Kredi (mineral) trickle
    //   solar_plant     — Enerji trickle
    //   barracks        — unlocks /base/production train_marine
    //
    // Idempotent ON CONFLICT: a player who somehow already has a row of
    // a type keeps theirs (e.g. dev seed scripts ran on the same uid).
    // Status 'active' so the gates evaluate immediately rather than
    // queueing the seed buildings through a fake construction cooldown.
    await this.seedStarterBuildings(id);
    return this.findOne(id);
  }

  private async seedStarterBuildings(userId: string): Promise<void> {
    const starters = [
      { type: 'command_center',    x: 4, y: 4 },
      { type: 'mineral_extractor', x: 3, y: 4 },
      { type: 'solar_plant',       x: 5, y: 4 },
      { type: 'barracks',          x: 4, y: 5 },
    ];
    // Raw SQL — same Postgres DB as game-server, no entity import needed.
    // ON CONFLICT DO NOTHING via the partial unique pattern: skip insert
    // if the player already has a row at the same (player_id, type, x, y).
    // The actual UNIQUE constraint isn't there; we filter by SELECT-then-
    // INSERT to avoid duplicate command_center rows from a replay.
    for (const s of starters) {
      try {
        await this.dataSource.query(
          `INSERT INTO player_buildings
             (player_id, type, level, status, position_x, position_y,
              construction_started_at, construction_complete_at)
           SELECT $1::uuid, $2::buildings_type_enum, 1, 'active', $3, $4, NOW(), NOW()
           WHERE NOT EXISTS (
             SELECT 1 FROM player_buildings
             WHERE player_id = $1::uuid AND type = $2::buildings_type_enum
           )`,
          [userId, s.type, s.x, s.y],
        );
      } catch (err) {
        // Non-fatal — log and move on.  A player who lands on /base with
        // 3 of 4 starters still has a playable game; we don't want a
        // single bad enum value to wedge the whole race-select flow.
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`seedStarterBuildings(${s.type}) failed for ${userId}: ${msg}`);
      }
    }
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    user.isActive = false;
    await this.userRepo.save(user);
  }
}
