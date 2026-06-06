import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BossEncounter } from './entities/boss-encounter.entity';
import { BossAttempt } from './entities/boss-attempt.entity';
import { StartAttemptDto, AttackBossDto } from './dto/boss-attempt.dto';
import { resolveUnitStats } from './boss-unit-stats';
import { Race } from '../../user/entities/race.enum';

/**
 * Server-side canonical shape stamped onto BossAttempt.unitsDeployed at
 * startAttempt() time. attackBoss() iterates this — never the inbound
 * DTO — so client-supplied stat fields can't drive boss damage.
 */
interface DeployedUnitSnapshot {
  unitId: string;
  type: string;
  attack: number;
  count: number;
  raceBonus: number;
}

/** Minimum gap between two attackBoss calls on the same attempt. */
const ATTACK_COOLDOWN_MS = 500;

/** Sentinel jsonb shape inserted into mechanics_triggered to make
 *  victory reward credit a one-shot. The unique partial index added by
 *  the migration enforces at most one such row per attempt_id. */
const VICTORY_CREDIT_SENTINEL = 'victory_credit';

@Injectable()
export class BossService {
  private readonly logger = new Logger(BossService.name);

  constructor(
    @InjectRepository(BossEncounter)
    private readonly bossRepository: Repository<BossEncounter>,
    @InjectRepository(BossAttempt)
    private readonly attemptRepository: Repository<BossAttempt>,
    // player_units is game-server-owned; api queries it via raw SQL on
    // the shared DataSource (same pattern formations.service.ts uses).
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getAllBosses() {
    return this.bossRepository.find({
      where: { isActive: true },
      order: { phase: 'ASC' },
    });
  }

  async getBossByCode(code: string) {
    const boss = await this.bossRepository.findOne({ where: { code }, relations: ['age'] });
    if (!boss) throw new NotFoundException(`Boss '${code}' bulunamadı`);
    return boss;
  }

  async getDevoringWormEncounters() {
    return this.bossRepository
      .createQueryBuilder('boss')
      .where('boss.code LIKE :pattern', { pattern: 'devouring_worm%' })
      .orderBy('boss.phase', 'ASC')
      .getMany();
  }

  /**
   * Start a boss attempt.
   *
   * SECURITY (E2 — prior vulnerability):
   *   The previous implementation stored `dto.unitsDeployed` VERBATIM —
   *   a `Record<string, unknown>[]` — onto the attempt row, with no
   *   ownership check and no stat validation. attackBoss() then summed
   *   `attack * count * raceBonus` straight from that snapshot, so any
   *   authenticated caller could POST `{attack:999999, count:999,
   *   raceBonus:999}` and one-shot any boss in <=10 hits (capped only
   *   by the 10%-HP per-attack ceiling). damageDealt drives the
   *   leaderboard, so the exploit also trashed ranking.
   *
   *   Fix:
   *     1. DTO now accepts only `{ unitId, count }` per slot, with
   *        class-validator bounds (count ∈ [1,99]).
   *     2. Each unitId is resolved against `player_units` filtered by
   *        `player_id = userId`. Any mismatch → 403.
   *     3. attack/raceBonus are stamped from the server-side
   *        UNIT_ATTACK_BY_TYPE + RACE_ATTACK_BONUS mirror (see
   *        boss-unit-stats.ts), NEVER from the wire.
   *     4. The persisted unitsDeployed jsonb is the canonical snapshot
   *        attackBoss() reads from.
   */
  async startAttempt(userId: string, dto: StartAttemptDto): Promise<BossAttempt> {
    const boss = await this.bossRepository.findOne({ where: { code: dto.bossCode } });
    if (!boss) throw new NotFoundException(`Boss '${dto.bossCode}' bulunamadı`);

    const existingActive = await this.attemptRepository.findOne({
      where: { userId, status: 'in_progress' },
    });
    if (existingActive) {
      throw new BadRequestException('Zaten aktif bir boss karşılaşması var. Önce bitirin veya çekilin.');
    }

    // Dedupe requested unitIds — two slots referencing the same row
    // can't both deploy that row; treat the duplicate as a client bug.
    const requestedIds = dto.unitsDeployed.map((u) => u.unitId);
    if (new Set(requestedIds).size !== requestedIds.length) {
      throw new BadRequestException('Aynı birim ID birden fazla slot için gönderildi');
    }

    // Ownership + stat lookup in a single round-trip. is_alive filter
    // mirrors formations.calculatePower — dead units don't deploy.
    const ownedRows = await this.dataSource.query<
      Array<{ id: string; type: string; race: string; attack: number }>
    >(
      `SELECT id, type, race, attack
         FROM player_units
        WHERE player_id = $1
          AND id = ANY($2::uuid[])
          AND is_alive = true`,
      [userId, requestedIds],
    );

    if (ownedRows.length !== requestedIds.length) {
      const ownedSet = new Set(ownedRows.map((r) => r.id));
      const offending = requestedIds.filter((id) => !ownedSet.has(id));
      this.logger.warn(
        `Boss deploy reddedildi — kullanıcı ${userId} sahip olmadığı ${offending.length} birim ID gönderdi`,
      );
      throw new ForbiddenException(
        'Konuşlandırılan birimlerden biri size ait değil veya hayatta değil',
      );
    }

    // Stamp the canonical snapshot. The DTO order is preserved so the
    // client can correlate slots after the response.
    const ownedById = new Map(ownedRows.map((r) => [r.id, r]));
    const snapshot: DeployedUnitSnapshot[] = dto.unitsDeployed.map((slot) => {
      const row = ownedById.get(slot.unitId)!;
      const { attack, raceBonus } = resolveUnitStats({
        type: row.type,
        race: row.race as Race,
        attack: Number(row.attack),
      });
      return {
        unitId: row.id,
        type: row.type,
        attack,
        count: slot.count,
        raceBonus,
      };
    });

    const attempt = this.attemptRepository.create({
      userId,
      bossEncounterId: boss.id,
      status: 'in_progress',
      currentPhase: boss.phase,
      bossHpRemaining: boss.hp,
      unitsDeployed: snapshot as unknown as Record<string, unknown>[],
      damageDealt: '0',
      damageTaken: '0',
    });

    const saved = await this.attemptRepository.save(attempt);
    this.logger.log(`Kullanıcı ${userId} boss deneme başlattı: ${boss.name}`);
    return saved;
  }

  /**
   * Attack the boss.
   *
   * SECURITY (E2):
   *   Damage is computed from the SERVER-STAMPED `unitsDeployed`
   *   snapshot written by startAttempt() — NEVER from the inbound
   *   request body. The DTO carries only an optional mechanicName tag;
   *   the controller does not surface a damage / attack power /
   *   raceBonus field, and even if a future regression added one, this
   *   method would ignore it.
   *
   *   Additional hardening:
   *     - A per-attempt cooldown (ATTACK_COOLDOWN_MS) blocks rapid-fire
   *       drains. Rejected with 429 if not elapsed.
   *     - Victory rewards are credited at most once per attempt via a
   *       UNIQUE(attempt_id, 'victory_credit') sentinel row in
   *       mechanics_triggered. A future wallet-credit hook that watches
   *       this column gets idempotency for free.
   */
  async attackBoss(userId: string, dto: AttackBossDto & { attemptId: string }): Promise<Record<string, unknown>> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: dto.attemptId, userId, status: 'in_progress' },
      relations: ['bossEncounter'],
    });
    if (!attempt) throw new NotFoundException('Aktif boss karşılaşması bulunamadı');

    // Cooldown gate. We compare against lastAttackAt rather than
    // updatedAt so that retreat()/save() bumps don't reset the window.
    const now = new Date();
    if (attempt.lastAttackAt) {
      const sinceLast = now.getTime() - attempt.lastAttackAt.getTime();
      if (sinceLast < ATTACK_COOLDOWN_MS) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: `Saldırı bekleme süresi: ${ATTACK_COOLDOWN_MS - sinceLast}ms`,
            retryAfterMs: ATTACK_COOLDOWN_MS - sinceLast,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const boss = attempt.bossEncounter;

    // Read ONLY from the server-derived snapshot. The cast is safe
    // because startAttempt is the only writer and it writes
    // DeployedUnitSnapshot[].
    const units = (attempt.unitsDeployed || []) as unknown as DeployedUnitSnapshot[];
    if (!Array.isArray(units) || units.length === 0) {
      throw new BadRequestException('Saldırı için birim seç');
    }

    let attackPower = 0;
    for (const unit of units) {
      const atk = Number(unit?.attack) || 0;
      const count = Number(unit?.count) || 0;
      const raceBonus = Number(unit?.raceBonus) || 1;
      if (atk < 0 || count < 0 || raceBonus < 0) continue; // defensive: ignore negatives
      attackPower += atk * count * raceBonus;
    }

    const bossDefense = Math.max(0, Number(boss.defense) || 0);
    let damage = Math.max(1, Math.floor(attackPower - bossDefense));

    // Cap per-attack damage at 10% of boss max HP so a kill takes >=10 attacks.
    const bossMaxHp = parseInt(boss.hp, 10);
    const damageCap = Math.max(1, Math.floor(bossMaxHp * 0.1));
    if (damage > damageCap) damage = damageCap;

    // Defensive: never allow a negative damage path to slip through.
    if (damage < 0 || !Number.isFinite(damage)) damage = 1;

    const currentHp = parseInt(attempt.bossHpRemaining || boss.hp, 10);
    const newHp = Math.max(0, currentHp - damage);
    const totalDamage = parseInt(attempt.damageDealt, 10) + damage;

    attempt.bossHpRemaining = String(newHp);
    attempt.damageDealt = String(totalDamage);
    attempt.lastAttackAt = now;

    if (dto.mechanicName) {
      const mechanic = (boss.mechanics as Array<{ name: string; cooldown: number; damage_pct?: number; effect?: string }>)
        .find((m) => m.name === dto.mechanicName);
      if (mechanic) {
        attempt.mechanicsTriggered = [
          ...attempt.mechanicsTriggered,
          { name: mechanic.name, triggeredAt: new Date() },
        ];
      }
    }

    const bossResponse = this.calculateBossCounterAttack(boss, attempt.currentPhase);
    const newDamageTaken = parseInt(attempt.damageTaken, 10) + bossResponse.damage;
    attempt.damageTaken = String(newDamageTaken);

    const phaseInfo = this.checkPhaseTransition(boss, newHp);
    if (phaseInfo.newPhase > attempt.currentPhase) {
      attempt.currentPhase = phaseInfo.newPhase;
      this.logger.log(`Boss faz geçişi: ${boss.name} faz ${phaseInfo.newPhase}!`);
    }

    let victoryRewards: Record<string, unknown> | null = null;
    if (newHp === 0) {
      attempt.status = 'victory';
      attempt.endedAt = new Date();
      attempt.durationSecs = Math.floor(
        (attempt.endedAt.getTime() - attempt.startedAt.getTime()) / 1000,
      );
      victoryRewards = boss.rewards;
      attempt.rewardsEarned = victoryRewards;
      this.logger.log(`Boss yenildi: ${boss.name} - kullanıcı: ${userId}`);
    }

    await this.attemptRepository.save(attempt);

    // One-shot victory credit. The unique partial index added by the
    // migration (UNIQUE(attempt_id) WHERE kind = 'victory_credit')
    // turns a concurrent kill-shot race into exactly one credit row.
    // We swallow the duplicate-key error: it just means another
    // request already credited this attempt.
    if (newHp === 0) {
      try {
        await this.dataSource.query(
          `INSERT INTO boss_attempt_credits (attempt_id, kind, awarded_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT DO NOTHING`,
          [attempt.id, VICTORY_CREDIT_SENTINEL],
        );
      } catch (err) {
        // Don't fail the victory response over a credit-row write —
        // surface as a warn so a future wallet-credit hook can repair.
        this.logger.warn(
          `Victory credit sentinel ekleme başarısız (attempt=${attempt.id}): ${(err as Error)?.message}`,
        );
      }
    }

    return {
      bossHpRemaining: newHp,
      bossHpMax: parseInt(boss.hp, 10),
      bossHpPct: Math.floor((newHp / parseInt(boss.hp, 10)) * 100),
      bossCounterAttack: bossResponse,
      currentPhase: attempt.currentPhase,
      phaseChanged: phaseInfo.newPhase > (attempt.currentPhase - 1),
      victory: newHp === 0,
      rewards: victoryRewards,
    };
  }

  async retreat(userId: string, attemptId: string): Promise<BossAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, userId, status: 'in_progress' },
    });
    if (!attempt) throw new NotFoundException('Aktif karşılaşma bulunamadı');

    attempt.status = 'defeat';
    attempt.endedAt = new Date();
    attempt.durationSecs = Math.floor(
      (attempt.endedAt.getTime() - attempt.startedAt.getTime()) / 1000,
    );

    return this.attemptRepository.save(attempt);
  }

  async getLeaderboard(bossCode: string, limit = 20) {
    const boss = await this.bossRepository.findOne({ where: { code: bossCode } });
    if (!boss) throw new NotFoundException('Boss bulunamadı');

    return this.attemptRepository
      .createQueryBuilder('attempt')
      .where('attempt.bossEncounterId = :bossId', { bossId: boss.id })
      .andWhere('attempt.status = :status', { status: 'victory' })
      .orderBy('attempt.damageDealt', 'DESC')
      .take(limit)
      .getMany();
  }

  async getUserAttempts(userId: string, bossCode?: string) {
    const qb = this.attemptRepository
      .createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.bossEncounter', 'boss')
      .where('attempt.userId = :userId', { userId })
      .orderBy('attempt.createdAt', 'DESC');

    if (bossCode) {
      qb.andWhere('boss.code = :bossCode', { bossCode });
    }

    return qb.take(50).getMany();
  }

  private calculateBossCounterAttack(
    boss: BossEncounter,
    currentPhase: number,
  ): { damage: number; mechanic: string | null } {
    const phaseMultiplier = 1 + (currentPhase - 1) * 0.5;
    const baseDamage = boss.attack * phaseMultiplier;
    const mechanics = boss.mechanics as Array<{ name: string; damage_pct?: number; cooldown: number }>;

    if (mechanics.length > 0 && Math.random() < 0.3) {
      const mechanic = mechanics[Math.floor(Math.random() * mechanics.length)];
      const mechanicDamage = Math.floor(baseDamage * ((mechanic.damage_pct || 100) / 100));
      return { damage: mechanicDamage, mechanic: mechanic.name };
    }

    return {
      damage: Math.floor(baseDamage * (0.8 + Math.random() * 0.4)),
      mechanic: null,
    };
  }

  private checkPhaseTransition(
    boss: BossEncounter,
    currentHp: number,
  ): { newPhase: number } {
    const hpPct = currentHp / parseInt(boss.hp, 10);
    const phases = boss.phases as Array<{ phase: number; hp_threshold: number }>;

    let newPhase = boss.phase;
    for (const phase of phases) {
      if (hpPct <= phase.hp_threshold && phase.phase > newPhase) {
        newPhase = phase.phase;
      }
    }

    return { newPhase };
  }
}
