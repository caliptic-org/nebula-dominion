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
   * SECURITY (C4-3):
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

    // ─── Ownership check on attackerUnits ──────────────────────────────
    // Each unit object must carry a `unitId` UUID, and every one of them
    // must belong to the caller. Done in a single SELECT to avoid N+1.
    const unitIds = dto.attackerUnits
      .map((u) => (typeof u?.unitId === 'string' ? u.unitId : null))
      .filter((x): x is string => x !== null);

    if (unitIds.length !== dto.attackerUnits.length) {
      throw new BadRequestException(
        "attackerUnits içindeki her birim bir 'unitId' (uuid) alanı taşımalı.",
      );
    }

    // De-dup; if FE sends the same id twice we only need to verify once.
    const uniqueUnitIds = Array.from(new Set(unitIds));

    try {
      const owned = await this.dataSource.query<Array<{ id: string }>>(
        `SELECT id
           FROM player_units
          WHERE player_id = $1
            AND id = ANY($2::uuid[])`,
        [userId, uniqueUnitIds],
      );
      const ownedSet = new Set(owned.map((r) => r.id));
      const missing = uniqueUnitIds.filter((id) => !ownedSet.has(id));
      if (missing.length > 0) {
        this.logger.warn(
          `startBattle ownership reject: user=${userId} sent ${missing.length} non-owned unitId(s): ${missing.join(',')}`,
        );
        throw new ForbiddenException(
          'attackerUnits içinde sahibi olmadığınız birimler var. Sadece kendi birimlerinizi savaşa sokabilirsiniz.',
        );
      }
    } catch (err) {
      // Re-throw the auth errors we just raised, but treat a query failure
      // (e.g. player_units missing in this DB) as a hard 500 — silently
      // allowing the battle to start would defeat the purpose of the
      // check. This differs from FormationsService.calculatePower which
      // is read-only and falls back safely.
      if (err instanceof ForbiddenException || err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(
        `unit ownership check failed for user=${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException('Birim sahipliği doğrulanamadı, lütfen tekrar deneyin.');
    }

    const battle = this.battleRepository.create({
      zoneId: dto.zoneId,
      battleType: dto.battleType,
      attackerId: userId,
      // PvE: no human defender. Encoded as null on the row.
      defenderId: null,
      status: 'pending',
      attackerUnits: dto.attackerUnits,
      subspaceEffects: this.resolveSubspaceEffects(zone),
    });

    return this.battleRepository.save(battle);
  }

  /**
   * Resolve a pending subspace battle.
   *
   * SECURITY (C4-2): the caller must be a participant in the battle —
   * either the attacker, or (in a future PvP world) the defender. The
   * previous version accepted ANY authenticated caller, which meant a
   * third party could:
   *   - end someone else's battle prematurely with garbage defenderUnits
   *     to grief them, or
   *   - end their OWN battle on a stranger's id to harvest rewards once
   *     the result-rewards pipeline lands.
   * Both are closed off by the participant assertion below.
   */
  async resolveBattle(
    userId: string,
    battleId: string,
    defenderUnits: Record<string, unknown>[],
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

    const result = this.computeBattleResult(
      battle.attackerUnits,
      defenderUnits,
      battle.zone.modifiers as Record<string, number>,
    );

    battle.status = 'completed';
    battle.defenderUnits = defenderUnits;
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

  private computeBattleResult(
    attackerUnits: Record<string, unknown>[],
    defenderUnits: Record<string, unknown>[],
    zoneModifiers: Record<string, number>,
  ): Record<string, unknown> {
    const attackMod = zoneModifiers.attack_multiplier || 1.0;
    const defMod = zoneModifiers.defense_penalty || 1.0;

    let attackerPower = attackerUnits.reduce((sum, u) => sum + ((u.attack as number) || 100), 0);
    let defenderPower = defenderUnits.reduce((sum, u) => sum + ((u.attack as number) || 100), 0);

    attackerPower *= attackMod;
    defenderPower *= defMod;

    const attackerWins = attackerPower >= defenderPower;
    const margin = Math.abs(attackerPower - defenderPower) / Math.max(attackerPower, defenderPower);

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
