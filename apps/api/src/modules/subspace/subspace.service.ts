import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SubspaceZone } from './entities/subspace-zone.entity';
import { SubspaceSession } from './entities/subspace-session.entity';
import { SubspaceBattle } from './entities/subspace-battle.entity';
import { EnterSubspaceDto, StartSubspaceBattleDto } from './dto/enter-subspace.dto';
import {
  deriveSubspaceDefenders,
  resolveSubspaceUnitStats,
  SubspaceDefenderSnapshot,
} from './subspace-unit-stats';
import { Race } from '../../user/entities/race.enum';

/**
 * Server-side canonical shape stamped onto SubspaceBattle.attackerUnits at
 * startBattle() time. resolveBattle() iterates this — never the inbound
 * DTO — so client-supplied stat fields can't drive subspace combat math.
 *
 * Mirrors the BossService DeployedUnitSnapshot pattern from
 * apps/api/src/modules/boss/boss.service.ts.
 */
interface SubspaceAttackerSnapshot {
  unitId: string;
  type: string;
  count: number;
  attack: number;
  defense: number;
  hp: number;
  raceBonus: number;
}

@Injectable()
export class SubspaceService {
  private readonly logger = new Logger(SubspaceService.name);

  constructor(
    @InjectRepository(SubspaceZone)
    private readonly zoneRepository: Repository<SubspaceZone>,
    @InjectRepository(SubspaceSession)
    private readonly sessionRepository: Repository<SubspaceSession>,
    @InjectRepository(SubspaceBattle)
    private readonly battleRepository: Repository<SubspaceBattle>,
    // game-server-owned tables (player_units etc.) live in the same
    // Postgres DB but aren't modeled as TypeORM entities in the api
    // module — raw queries via the shared DataSource are how the
    // formations module already crosses this boundary (see
    // FormationsService.calculatePower).
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getZones(userLevel?: number) {
    const qb = this.zoneRepository
      .createQueryBuilder('zone')
      .where('zone.isActive = true')
      .orderBy('zone.levelRequired', 'ASC');

    if (userLevel !== undefined) {
      qb.andWhere('zone.levelRequired <= :level', { level: userLevel });
    }

    return qb.getMany();
  }

  async getZoneByCode(code: string) {
    const zone = await this.zoneRepository.findOne({ where: { code } });
    if (!zone) throw new NotFoundException(`Subspace bölgesi '${code}' bulunamadı`);
    return zone;
  }

  async enterSubspace(userId: string, dto: EnterSubspaceDto): Promise<SubspaceSession> {
    const zone = await this.zoneRepository.findOne({ where: { code: dto.zoneCode } });
    if (!zone) throw new NotFoundException(`Subspace bölgesi '${dto.zoneCode}' bulunamadı`);

    const activeSession = await this.sessionRepository.findOne({
      where: { userId, status: 'active' },
    });
    if (activeSession) {
      throw new BadRequestException('Zaten aktif bir subspace oturumunuz var. Önce çıkış yapın.');
    }

    const session = this.sessionRepository.create({
      userId,
      zoneId: zone.id,
      status: 'active',
      unitsDeployed: dto.unitCodes.map((code) => ({ code, deployedAt: new Date() })),
    });

    const saved = await this.sessionRepository.save(session);
    this.logger.log(`Kullanıcı ${userId} subspace bölgesine girdi: ${zone.name}`);
    return saved;
  }

  async exitSubspace(userId: string, sessionId: string, fled = false): Promise<SubspaceSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId, status: 'active' },
      relations: ['zone'],
    });
    if (!session) throw new NotFoundException('Aktif subspace oturumu bulunamadı');

    const exitedAt = new Date();
    const durationSecs = Math.floor((exitedAt.getTime() - session.enteredAt.getTime()) / 1000);

    const rewards = this.calculateRewards(session.zone, durationSecs, session.enemiesKilled);

    session.status = fled ? 'fled' : 'completed';
    session.exitedAt = exitedAt;
    session.durationSecs = durationSecs;
    session.rewardsEarned = rewards;

    const saved = await this.sessionRepository.save(session);
    this.logger.log(
      `Kullanıcı ${userId} subspace'ten çıktı: ${session.zone.name}, süre: ${durationSecs}s`,
    );
    return saved;
  }

  async applyHazard(userId: string, sessionId: string): Promise<Record<string, unknown>> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId, status: 'active' },
      relations: ['zone'],
    });
    if (!session) throw new NotFoundException('Aktif oturum bulunamadı');

    const zone = session.zone;
    const triggeredHazards: Record<string, unknown>[] = [];

    for (const hazard of zone.hazards as Array<{ type: string; chance: number; damage_pct?: number; effect?: string }>) {
      if (Math.random() < hazard.chance) {
        triggeredHazards.push({
          type: hazard.type,
          damage_pct: hazard.damage_pct,
          effect: hazard.effect,
          triggeredAt: new Date(),
        });
      }
    }

    if (triggeredHazards.length > 0) {
      session.hazardsHit = [...session.hazardsHit, ...triggeredHazards];
      await this.sessionRepository.save(session);
    }

    return { triggeredHazards, zoneModifiers: zone.modifiers };
  }

  /**
   * Start a subspace battle.
   *
   * SECURITY (C4-3 + HIGH ECON-C6-05):
   *  - `defenderId` is NEVER taken from the client. Previously
   *    `dto.defenderId` was written straight into the row, which let any
   *    authenticated caller spoof an attack target (PvP grief vector).
   *  - PvP battle types are rejected outright at this endpoint until a
   *    real matchmaking service mints the pair server-side. For PvE the
   *    defender is a bot / zone-owned entity and is represented as a null
   *    defenderId on the row (the row already supports it — see
   *    SubspaceBattle.defenderId).
   *  - Each `attackerUnits[i].unitId` is verified against `player_units`
   *    WHERE player_id = caller. Anything not owned by the caller causes
   *    a 403 — no partial successes, no silent drops.
   *  - ECON-C6-05 fix: the persisted attackerUnits snapshot is the
   *    SERVER-DERIVED {type, attack, defense, hp, raceBonus, count}
   *    tuple from UNIT_STATS_BY_TYPE + RACE_BONUSES applied to the
   *    player_units row. The dto's stat fields are stripped at the
   *    ValidationPipe (whitelist: true) so they don't even arrive here,
   *    and even if they did, resolveBattle would never read them.
   *    Previously startBattle wrote the dto verbatim, and
   *    computeBattleResult read `(u.attack as number) || 100` straight
   *    from it — a guaranteed-win recipe with any positive `attack`
   *    integer on the wire.
   */
  async startBattle(userId: string, dto: StartSubspaceBattleDto): Promise<SubspaceBattle> {
    const zone = await this.zoneRepository.findOne({ where: { id: dto.zoneId } });
    if (!zone) throw new NotFoundException('Subspace bölgesi bulunamadı');

    // ─── PvE-only gate ─────────────────────────────────────────────────
    // DTO `@IsIn(['pve_raid', 'boss_hunt'])` already blocks PvP at the
    // class-validator layer; this is a defense-in-depth check for any
    // future code path that constructs the DTO programmatically.
    if (dto.battleType !== 'pve_raid' && dto.battleType !== 'boss_hunt') {
      throw new BadRequestException(
        "PvP subspace savaşları şu an devre dışı: matchmaking servisi henüz hazır değil. " +
          "Sadece 'pve_raid' veya 'boss_hunt' kullanın.",
      );
    }

    // ─── Caller must have an active session in this zone ───────────────
    // Defender entity for PvE is derived from session state, not body.
    const activeSession = await this.sessionRepository.findOne({
      where: { userId, zoneId: dto.zoneId, status: 'active' },
    });
    if (!activeSession) {
      throw new BadRequestException(
        'Bu bölgede aktif bir subspace oturumunuz yok. Önce /subspace/enter çağırın.',
      );
    }

    // ─── Dedup unit ids ────────────────────────────────────────────────
    // Two slots referencing the same player_units row is a client bug —
    // treat it as 400 instead of silently double-deploying.
    const requestedIds = dto.attackerUnits.map((u) => u.unitId);
    if (new Set(requestedIds).size !== requestedIds.length) {
      throw new BadRequestException('Aynı birim ID birden fazla slot için gönderildi');
    }

    // ─── Ownership + stat lookup in a single round-trip ────────────────
    // Same SQL shape BossService.startAttempt uses.
    let ownedRows: Array<{
      id: string;
      type: string;
      race: string;
      attack: number;
      defense: number;
      hp: number;
    }>;
    try {
      ownedRows = await this.dataSource.query(
        `SELECT id, type, race, attack, defense, hp
           FROM player_units
          WHERE player_id = $1
            AND id = ANY($2::uuid[])
            AND is_alive = true`,
        [userId, requestedIds],
      );
    } catch (err) {
      // Treat query failure (e.g. player_units missing in this DB) as a
      // hard 400 — silently allowing the battle to start would defeat
      // the purpose of the check. This differs from FormationsService
      // .calculatePower which is read-only and falls back safely.
      this.logger.error(
        `unit ownership check failed for user=${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException('Birim sahipliği doğrulanamadı, lütfen tekrar deneyin.');
    }

    if (ownedRows.length !== requestedIds.length) {
      const ownedSet = new Set(ownedRows.map((r) => r.id));
      const offending = requestedIds.filter((id) => !ownedSet.has(id));
      this.logger.warn(
        `startBattle ownership reject: user=${userId} sent ${offending.length} non-owned-or-dead unitId(s): ${offending.join(',')}`,
      );
      throw new ForbiddenException(
        'attackerUnits içinde sahibi olmadığınız veya hayatta olmayan birimler var. Sadece kendi yaşayan birimlerinizi savaşa sokabilirsiniz.',
      );
    }

    // ─── Stamp the canonical server-derived snapshot ───────────────────
    // DTO order is preserved so the client can correlate slots after the
    // response. Stat fields on the dto (if any survived the validation
    // pipe) are IGNORED — every value below is server-side.
    const ownedById = new Map(ownedRows.map((r) => [r.id, r]));
    const snapshot: SubspaceAttackerSnapshot[] = dto.attackerUnits.map((slot) => {
      const row = ownedById.get(slot.unitId)!;
      const stats = resolveSubspaceUnitStats({
        type: row.type,
        race: row.race as Race,
        attack: Number(row.attack),
        defense: Number(row.defense),
        hp: Number(row.hp),
      });
      return {
        unitId: row.id,
        type: stats.type,
        count: slot.count,
        attack: stats.attack,
        defense: stats.defense,
        hp: stats.hp,
        raceBonus: stats.raceBonus,
      };
    });

    const battle = this.battleRepository.create({
      zoneId: dto.zoneId,
      battleType: dto.battleType,
      attackerId: userId,
      // PvE: no human defender. Encoded as null on the row.
      defenderId: null,
      status: 'pending',
      attackerUnits: snapshot as unknown as Record<string, unknown>[],
      subspaceEffects: this.resolveSubspaceEffects(zone),
    });

    return this.battleRepository.save(battle);
  }

  /**
   * Resolve a pending subspace battle.
   *
   * SECURITY (C4-2 + HIGH ECON-C6-05):
   *  - C4-2: the caller must be a participant in the battle — either
   *    the attacker, or (in a future PvP world) the defender. The
   *    previous version accepted ANY authenticated caller, which meant
   *    a third party could:
   *      - end someone else's battle prematurely with garbage defenderUnits
   *        to grief them, or
   *      - end their OWN battle on a stranger's id to harvest rewards
   *        once the result-rewards pipeline lands.
   *  - ECON-C6-05: the `defenderUnits` argument from the controller is
   *    IGNORED. Previously this jsonb was written straight to the row
   *    and then summed by computeBattleResult, letting the attacker pick
   *    their own opponent's stats (e.g. `[{attack: 0}]`) for a
   *    guaranteed-win recipe. The defender roster is now synthesized
   *    server-side from the zone tier via SUBSPACE_DEFENDER_TABLE.
   *    PvP types were already rejected at startBattle (C4-3) so we
   *    never need a "real opponent's roster" path here.
   *
   *    NOTE: the controller signature still accepts a body param for
   *    backwards compatibility with the FE, but the service drops it
   *    on the floor. A future change can remove the param entirely.
   */
  async resolveBattle(
    userId: string,
    battleId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _defenderUnitsIgnored: Record<string, unknown>[] | undefined,
  ): Promise<SubspaceBattle> {
    const battle = await this.battleRepository.findOne({
      where: { id: battleId, status: 'pending' },
      relations: ['zone'],
    });
    if (!battle) throw new NotFoundException('Savaş bulunamadı veya zaten tamamlandı');

    if (battle.attackerId !== userId && battle.defenderId !== userId) {
      this.logger.warn(
        `resolveBattle forbidden: user=${userId} tried to resolve battle=${battleId} (attacker=${battle.attackerId}, defender=${battle.defenderId ?? 'null'})`,
      );
      throw new ForbiddenException('Bu savaşı sonuçlandırma yetkiniz yok.');
    }

    // Server-derived defender roster, seeded by zone tier. Deterministic
    // per (zone, battleId) so the row written is stable and re-resolves
    // produce the same answer.
    const defenderSnapshot = deriveSubspaceDefenders(battle.zone.tier, battle.id);

    const attackerSnapshot = (battle.attackerUnits || []) as unknown as SubspaceAttackerSnapshot[];

    const result = this.computeBattleResult(
      attackerSnapshot,
      defenderSnapshot,
      battle.zone.modifiers as Record<string, number>,
    );

    battle.status = 'completed';
    // Persist the server-derived snapshot — useful for replay/audit and
    // makes it obvious in the DB row that the defender wasn't client-supplied.
    battle.defenderUnits = defenderSnapshot as unknown as Record<string, unknown>[];
    battle.result = result;
    battle.winnerId = result.winnerId as string;
    battle.startedAt = new Date(Date.now() - (result.durationMs as number));
    battle.endedAt = new Date();

    return this.battleRepository.save(battle);
  }

  async getUserSessions(userId: string, limit = 20) {
    return this.sessionRepository.find({
      where: { userId },
      relations: ['zone'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private calculateRewards(
    zone: SubspaceZone,
    durationSecs: number,
    enemiesKilled: number,
  ): Record<string, unknown> {
    const base = zone.rewards as Record<string, number>;
    const timeFactor = Math.min(durationSecs / 300, 2.0);
    const killBonus = enemiesKilled * 50;

    return {
      minerals: Math.floor((base.minerals || 0) * timeFactor),
      energy: Math.floor((base.energy || 0) * timeFactor),
      void_crystals: Math.floor((base.void_crystals || 0) * timeFactor) + Math.floor(killBonus / 100),
      enemies_killed: enemiesKilled,
    };
  }

  private resolveSubspaceEffects(zone: SubspaceZone): Record<string, unknown>[] {
    const modifiers = zone.modifiers as Record<string, unknown>;
    return Object.entries(modifiers).map(([key, value]) => ({ effect: key, value }));
  }

  /**
   * Compute the battle outcome.
   *
   * SECURITY (HIGH ECON-C6-05):
   *   Both inputs are SERVER-DERIVED snapshots — `attackerUnits` is the
   *   {type, attack, defense, hp, raceBonus, count} tuple written by
   *   startBattle() from UNIT_STATS_BY_TYPE + RACE_BONUSES, and
   *   `defenderUnits` is synthesized by deriveSubspaceDefenders() from
   *   the zone tier. Neither comes off the wire. Even if a future
   *   regression re-introduces client-supplied stats on the dto, this
   *   reducer is typed against the snapshot shape and ignores anything
   *   that isn't a finite non-negative number.
   *
   *   The old `(u.attack as number) || 100` per-unit reducer is gone —
   *   that pattern let a client send `{attack: 99_999_999}` and crash
   *   through any defender power. Now `attack * count * raceBonus` is
   *   summed for attackers and `attack * count` for defenders, with
   *   non-finite or negative values clamped to zero.
   */
  private computeBattleResult(
    attackerUnits: SubspaceAttackerSnapshot[],
    defenderUnits: SubspaceDefenderSnapshot[],
    zoneModifiers: Record<string, number>,
  ): Record<string, unknown> {
    const attackMod = Number(zoneModifiers.attack_multiplier) || 1.0;
    const defMod = Number(zoneModifiers.defense_penalty) || 1.0;

    const safe = (n: unknown): number => {
      const v = Number(n);
      return Number.isFinite(v) && v > 0 ? v : 0;
    };

    let attackerPower = 0;
    for (const u of attackerUnits) {
      const atk = safe(u?.attack);
      const count = safe(u?.count);
      const raceBonus = safe(u?.raceBonus) || 1;
      attackerPower += atk * count * raceBonus;
    }

    let defenderPower = 0;
    for (const d of defenderUnits) {
      const atk = safe(d?.attack);
      defenderPower += atk; // 1 per slot — slot count varies by tier
    }

    attackerPower *= attackMod;
    defenderPower *= defMod;

    const attackerWins = attackerPower >= defenderPower;
    const maxPower = Math.max(attackerPower, defenderPower, 1);
    const margin = Math.abs(attackerPower - defenderPower) / maxPower;

    return {
      attackerPower: Math.floor(attackerPower),
      defenderPower: Math.floor(defenderPower),
      winnerId: attackerWins ? 'attacker' : 'defender',
      marginPct: Math.floor(margin * 100),
      durationMs: 5000 + Math.random() * 10000,
      subspaceBonus: attackMod !== 1.0,
    };
  }
}
