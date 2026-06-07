import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, EntityManager } from 'typeorm';
import { Alliance } from './entities/alliance.entity';
import { AllianceMember, AllianceRole } from './entities/alliance-member.entity';
import { AllianceWar, WarStatus } from './entities/alliance-war.entity';

/**
 * Cycle-18 BAL-02 — war resolution window. A declared war has a 24h prep
 * (startsAt = declaredAt + 24h, entity default) then a 48h combat window;
 * once startsAt + WAR_COMBAT_MS has passed the war auto-resolves. The api has
 * no @nestjs/schedule, so resolution is LAZY — triggered whenever anyone reads
 * the war list for either side (mirrors the resource offline-accumulation
 * pattern). This fixes BOTH halves of the original no-op: warWins/warLosses
 * now actually move (a reward + ranking), and the pairing unlocks for a
 * re-declaration instead of being locked in DECLARED forever.
 */
const WAR_COMBAT_MS = 48 * 60 * 60 * 1000;

/**
 * Dedicated war service for the Alliance War MVP.
 *
 * Scope: declare + list. No battle matchmaking, no negotiation, no truce
 * flow — these arrive in follow-up phases. The existing AlliancePlayerService
 * has a tag-based declareWar that powers the legacy /api/alliance/wars path;
 * this service backs the new clean /api/v1/alliance-wars surface that the
 * web client (alliance/page.tsx) consumes.
 *
 * "Active war" = status DECLARED or ACTIVE. A pair of alliances can only
 * have ONE such war live at a time — duplicate declaration in either
 * direction yields HTTP 409 Conflict. Same-alliance self-declaration is
 * HTTP 400 Bad Request.
 */
@Injectable()
export class AllianceWarService {
  private readonly logger = new Logger(AllianceWarService.name);

  constructor(
    @InjectRepository(Alliance)
    private readonly allianceRepo: Repository<Alliance>,
    @InjectRepository(AllianceMember)
    private readonly memberRepo: Repository<AllianceMember>,
    @InjectRepository(AllianceWar)
    private readonly warRepo: Repository<AllianceWar>,
  ) {}

  /** Caller must be the leader or an officer of the initiator alliance. */
  async declareWar(userId: string, targetAllianceId: string): Promise<AllianceWar> {
    const membership = await this.memberRepo.findOne({ where: { userId } });
    if (!membership) {
      throw new ForbiddenException('Bir ittifaka üye değilsiniz');
    }
    if (
      membership.role !== AllianceRole.LEADER &&
      membership.role !== AllianceRole.OFFICER
    ) {
      throw new ForbiddenException(
        'Savaş ilan etmek için lider veya subay yetkisi gerekir',
      );
    }

    const initiatorAllianceId = membership.allianceId;
    if (initiatorAllianceId === targetAllianceId) {
      throw new BadRequestException('Kendi ittifakınıza savaş ilan edemezsiniz');
    }

    const targetAlliance = await this.allianceRepo.findOne({
      where: { id: targetAllianceId },
    });
    if (!targetAlliance) {
      throw new NotFoundException('Hedef ittifak bulunamadı');
    }

    // Duplicate prevention — active = DECLARED or ACTIVE. Either direction
    // counts; a "they declared on us, now we declare back" needs to wait
    // until the first war ends.
    const existing = await this.warRepo.findOne({
      where: [
        { attackerId: initiatorAllianceId, defenderId: targetAllianceId, status: WarStatus.DECLARED },
        { attackerId: initiatorAllianceId, defenderId: targetAllianceId, status: WarStatus.ACTIVE },
        { attackerId: targetAllianceId, defenderId: initiatorAllianceId, status: WarStatus.DECLARED },
        { attackerId: targetAllianceId, defenderId: initiatorAllianceId, status: WarStatus.ACTIVE },
      ],
    });
    if (existing) {
      throw new ConflictException(
        'Bu ittifakla halihazırda aktif veya ilan edilmiş bir savaş var',
      );
    }

    const war = this.warRepo.create({
      attackerId: initiatorAllianceId,
      defenderId: targetAllianceId,
      status: WarStatus.DECLARED,
    });
    return this.warRepo.save(war);
  }

  /**
   * Returns every war this alliance has ever been a part of, newest first.
   *
   * Audit cycle 7 (HIGH IDOR-ALLIANCE-WAR-LIST-02 / CHAIN-ALLIANCE-WARS-LEAK):
   * previously this took only `allianceId` and the controller was completely
   * unguarded — anonymous callers could enumerate any alliance's full war
   * history (with attacker/defender entities eagerly loaded), exposing
   * strategic intel like ongoing wars, recent defeats, and active rivalries.
   * Cycle 6 fixed the analogous AllianceService.getWars path on
   * /alliances/:id/wars but missed THIS service, which backs the
   * /alliance-wars/:allianceId endpoint that the FE useAllianceWars hook
   * actually consumes. Now requires that the caller is a member of the
   * queried alliance — mirrors AllianceService.getWars / assertMembership.
   */
  async listWars(requesterId: string, allianceId: string): Promise<AllianceWar[]> {
    await this.assertMembership(requesterId, allianceId);
    await this.resolveDueWars(allianceId);
    return this.warRepo.find({
      where: [{ attackerId: allianceId }, { defenderId: allianceId }],
      relations: ['attacker', 'defender'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Membership guard for the war ledger reader. Kept local to this service
   * rather than calling into AllianceService to avoid a circular-injection
   * footgun (AllianceWarService is mounted alongside AllianceService in
   * AllianceModule). Throws 403 when the requester isn't in the alliance.
   */
  private async assertMembership(userId: string, allianceId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { userId, allianceId } });
    if (!member) {
      throw new ForbiddenException('Bu ittifakın üyesi değilsiniz');
    }
  }

  /** Active = DECLARED or ACTIVE. Ended/truce are excluded. */
  async getActive(allianceId: string): Promise<AllianceWar[]> {
    await this.resolveDueWars(allianceId);
    return this.warRepo.find({
      where: [
        { attackerId: allianceId, status: WarStatus.DECLARED },
        { attackerId: allianceId, status: WarStatus.ACTIVE },
        { defenderId: allianceId, status: WarStatus.DECLARED },
        { defenderId: allianceId, status: WarStatus.ACTIVE },
      ],
      relations: ['attacker', 'defender'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cycle-18 BAL-02 — lazily resolve any of this alliance's wars whose combat
   * window (startsAt + WAR_COMBAT_MS) has elapsed. Deterministic outcome: the
   * side with the higher summed member contribution wins (ties → attacker, by
   * initiative). Sets winner/scores/status=ENDED + endsAt and increments
   * warWins/warLosses on both alliances. Each war resolves exactly once (the
   * pessimistic_write re-check inside the tx + the DECLARED/ACTIVE guard make
   * it idempotent under concurrent reads). Best-effort: a failure here never
   * blocks the war-list read.
   */
  private async resolveDueWars(allianceId: string): Promise<void> {
    const cutoff = new Date(Date.now() - WAR_COMBAT_MS);
    const due = await this.warRepo.find({
      where: [
        { attackerId: allianceId, status: WarStatus.DECLARED, startsAt: LessThanOrEqual(cutoff) },
        { attackerId: allianceId, status: WarStatus.ACTIVE, startsAt: LessThanOrEqual(cutoff) },
        { defenderId: allianceId, status: WarStatus.DECLARED, startsAt: LessThanOrEqual(cutoff) },
        { defenderId: allianceId, status: WarStatus.ACTIVE, startsAt: LessThanOrEqual(cutoff) },
      ],
    });
    for (const war of due) {
      try {
        await this.warRepo.manager.transaction(async (manager) => {
          const fresh = await manager.findOne(AllianceWar, {
            where: { id: war.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (
            !fresh ||
            (fresh.status !== WarStatus.DECLARED && fresh.status !== WarStatus.ACTIVE)
          ) {
            return; // already resolved by a concurrent read
          }

          const [attackerPower, defenderPower] = await Promise.all([
            this.sumContribution(manager, fresh.attackerId),
            this.sumContribution(manager, fresh.defenderId),
          ]);
          const attackerWon = attackerPower >= defenderPower; // ties → attacker
          fresh.attackerScore = attackerPower;
          fresh.defenderScore = defenderPower;
          fresh.winnerId = attackerWon ? fresh.attackerId : fresh.defenderId;
          fresh.status = WarStatus.ENDED;
          fresh.endsAt = new Date();
          await manager.save(fresh);

          const winnerId = attackerWon ? fresh.attackerId : fresh.defenderId;
          const loserId = attackerWon ? fresh.defenderId : fresh.attackerId;
          await manager.increment(Alliance, { id: winnerId }, 'warWins', 1);
          await manager.increment(Alliance, { id: loserId }, 'warLosses', 1);
        });
      } catch (err) {
        this.logger.warn(
          `War resolution failed for ${war.id}: ${(err as Error)?.message ?? err}`,
        );
      }
    }
  }

  /** Sum of member contribution for an alliance — the war strength proxy. */
  private async sumContribution(
    manager: EntityManager,
    allianceId: string,
  ): Promise<number> {
    const row = await manager
      .createQueryBuilder(AllianceMember, 'm')
      .select('COALESCE(SUM(m.contribution), 0)', 'total')
      .where('m.allianceId = :allianceId', { allianceId })
      .getRawOne<{ total: string | number }>();
    return Number(row?.total ?? 0);
  }
}
