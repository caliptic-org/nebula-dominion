import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Alliance } from './entities/alliance.entity';
import { AllianceMember, AllianceRole } from './entities/alliance-member.entity';
import { AllianceWar, WarStatus } from './entities/alliance-war.entity';
import { AllianceStorage } from './entities/alliance-storage.entity';
import { CreateAllianceDto } from './dto/create-alliance.dto';
import { DeclareWarDto } from './dto/declare-war.dto';
import { DepositResourcesDto } from './dto/deposit-resources.dto';
import { applyAllianceXp } from './alliance-progression';

/**
 * Audit cycle 7 (REG-CYC6-ALLIANCE-FINDALL-MEMBER-LEAK + FINDONE-UNGUARDED):
 * Inline projection types kept here intentionally rather than under
 * dto/ — they describe the SHAPE of what findAll / findOne return on
 * the wire and are tightly coupled to the leak-fix invariant ("no
 * relations eager-loaded, no contribution data, no storage row").
 * Keeping them next to the service makes the contract obvious when the
 * next reviewer touches the SELECT list.
 */
export interface AllianceSummary {
  id: string;
  name: string;
  tag: string;
  leaderId: string | null;
  isOpen: boolean;
  xp: number;
  level: number;
  maxMembers: number;
  memberCount: number;
}

export interface AllianceDetail {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  leaderId: string;
  emblem: string | null;
  level: number;
  xp: number;
  maxMembers: number;
  isOpen: boolean;
  minElo: number;
  warWins: number;
  warLosses: number;
  memberCount: number;
  createdAt: Date;
  // NOTE: deliberately no `members[]`, no `storage`, no `wars[]` here.
  // Those live on the gated per-resource endpoints
  // (/:id/members, /:id/storage, /:id/wars), all membership-checked.
}

@Injectable()
export class AllianceService {
  constructor(
    @InjectRepository(Alliance)
    private readonly allianceRepo: Repository<Alliance>,
    @InjectRepository(AllianceMember)
    private readonly memberRepo: Repository<AllianceMember>,
    @InjectRepository(AllianceWar)
    private readonly warRepo: Repository<AllianceWar>,
    @InjectRepository(AllianceStorage)
    private readonly storageRepo: Repository<AllianceStorage>,
    @InjectDataSource()
    private readonly allianceDataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateAllianceDto): Promise<Alliance> {
    const existing = await this.memberRepo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Zaten bir ittifaka üyesiniz');
    }

    const alliance = this.allianceRepo.create({
      ...dto,
      leaderId: userId,
    });
    const saved = await this.allianceRepo.save(alliance);

    await this.memberRepo.save(
      this.memberRepo.create({
        allianceId: saved.id,
        userId,
        role: AllianceRole.LEADER,
      }),
    );

    return saved;
  }

  /**
   * Public alliance directory summary. Audit cycle 7: previously this
   * eager-loaded the `members` relation, which leaked the full roster
   * (userId/role/joinedAt/contribution) of every alliance to ANY caller
   * — the controller had no @UseGuards either. That let attackers build
   * a "who's in which guild + how active" map for targeted raids and
   * defection campaigns.
   *
   * New contract:
   *   - JWT-gated at the controller (logged-in players only).
   *   - Returns AllianceSummary[]: only the fields the discover UI
   *     actually renders (apps/web/src/hooks/useAlliances.ts:12-21
   *     consumes {id,name,tag,description?,memberCount?,leaderId?}).
   *   - No `members` array, no `storage` row, no war ledger.
   *   - memberCount is computed via a single LEFT JOIN + GROUP BY so we
   *     don't N+1 over 50 alliances and don't need a denormalized column
   *     (the Alliance entity has no memberCount field today; adding one
   *     would mean another consistency invariant to maintain on join/
   *     leave/kick — not worth it for a directory list).
   */
  async findAll(): Promise<AllianceSummary[]> {
    const rows = (await this.allianceRepo
      .createQueryBuilder('a')
      .leftJoin(AllianceMember, 'm', 'm.alliance_id = a.id')
      .select([
        'a.id AS id',
        'a.name AS name',
        'a.tag AS tag',
        'a.leader_id AS "leaderId"',
        'a.is_open AS "isOpen"',
        'a.xp AS xp',
        'a.level AS level',
        'a.max_members AS "maxMembers"',
        'COUNT(m.user_id) AS "memberCount"',
      ])
      .groupBy('a.id')
      .orderBy('a.xp', 'DESC')
      .limit(50)
      .getRawMany()) as Array<Record<string, unknown>>;

    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      tag: String(r.tag),
      leaderId: r.leaderId ? String(r.leaderId) : null,
      isOpen: Boolean(r.isOpen),
      xp: Number(r.xp ?? 0),
      level: Number(r.level ?? 1),
      maxMembers: Number(r.maxMembers ?? 0),
      // pg COUNT() returns bigint as string; coerce explicitly so the
      // FE doesn't have to defensively parse.
      memberCount: Number(r.memberCount ?? 0),
    }));
  }

  /**
   * Single alliance detail. Audit cycle 7: previously eager-loaded both
   * `members` AND `storage`, so an anonymous `curl /alliances/<uuid>`
   * returned the full member roster (contribution amounts, join order,
   * who the officers are) PLUS the storage row (mineral/gas/energy/
   * capacity) — i.e. the same BLOCKER cycle 6 closed on /:id/storage
   * was still wide open via this handler.
   *
   * New contract:
   *   - JWT-gated at the controller.
   *   - Storage is stripped entirely; callers who need it use the
   *     member-gated GET /alliances/:id/storage.
   *   - Members are stripped from this payload too; the discover/detail
   *     UI only needs the alliance card data, and roster reads go
   *     through the membership-checked GET /alliances/:id/members
   *     (see audit cycle 6 fix above).
   *   - memberCount is included so the UI can show "X / maxMembers"
   *     without an extra round-trip and without leaking identities.
   */
  async findOne(id: string): Promise<AllianceDetail> {
    const alliance = await this.allianceRepo.findOne({ where: { id } });
    if (!alliance) throw new NotFoundException('İttifak bulunamadı');

    const memberCount = await this.memberRepo.count({ where: { allianceId: id } });

    return {
      id: alliance.id,
      name: alliance.name,
      tag: alliance.tag,
      description: alliance.description,
      leaderId: alliance.leaderId,
      emblem: alliance.emblem,
      level: alliance.level,
      xp: alliance.xp,
      maxMembers: alliance.maxMembers,
      isOpen: alliance.isOpen,
      minElo: alliance.minElo,
      warWins: alliance.warWins,
      warLosses: alliance.warLosses,
      memberCount,
      createdAt: alliance.createdAt,
    };
  }

  async join(userId: string, allianceId: string): Promise<AllianceMember> {
    const existing = await this.memberRepo.findOne({ where: { userId } });
    if (existing) throw new ConflictException('Zaten bir ittifaka üyesiniz');

    const alliance = await this.allianceRepo.findOne({ where: { id: allianceId } });
    if (!alliance) throw new NotFoundException('İttifak bulunamadı');
    if (!alliance.isOpen) throw new ForbiddenException('Bu ittifak kapalı; davet gerekmektedir');

    const memberCount = await this.memberRepo.count({ where: { allianceId } });
    if (memberCount >= alliance.maxMembers) throw new BadRequestException('İttifak doldu');

    return this.memberRepo.save(
      this.memberRepo.create({ allianceId, userId, role: AllianceRole.RECRUIT }),
    );
  }

  async leave(userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { userId } });
    if (!member) throw new NotFoundException('İttifak üyeliğiniz bulunmuyor');

    if (member.role === AllianceRole.LEADER) {
      throw new BadRequestException('Lider ittifaktan ayrılamaz; önce liderliği devredin');
    }

    await this.memberRepo.remove(member);
  }

  /**
   * Roster lookup. Audit cycle 6: this used to be public (no requesterId
   * arg, no controller guard) and let anonymous callers enumerate every
   * alliance's member list. Now membership-gated.
   */
  async getMembers(requesterId: string, allianceId: string): Promise<AllianceMember[]> {
    await this.assertMembership(requesterId, allianceId);
    return this.memberRepo.find({
      where: { allianceId },
      order: { role: 'ASC', joinedAt: 'ASC' },
    });
  }

  /**
   * Membership guard shared by getMembers / getWars / getStorage. Throws
   * ForbiddenException if the requester isn't in the target alliance.
   * Kept private so the read-side handlers all funnel through one check.
   */
  private async assertMembership(userId: string, allianceId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { userId, allianceId } });
    if (!member) {
      throw new ForbiddenException('Bu alliance üyesi değilsin');
    }
  }

  async promoteMember(
    requesterId: string,
    allianceId: string,
    targetUserId: string,
    role: AllianceRole,
  ): Promise<AllianceMember> {
    const requester = await this.memberRepo.findOne({ where: { userId: requesterId, allianceId } });
    if (!requester || (requester.role !== AllianceRole.LEADER && requester.role !== AllianceRole.OFFICER)) {
      throw new ForbiddenException('Yeterli yetkiniz yok');
    }

    const target = await this.memberRepo.findOne({ where: { userId: targetUserId, allianceId } });
    if (!target) throw new NotFoundException('Üye bulunamadı');

    // Officer-to-Leader is a coup; only the current Leader can hand off
    // leadership.  Engine audit flagged this MEDIUM. The Leader→handoff
    // path should also demote the old Leader to Officer to maintain the
    // single-Leader invariant — but that's a multi-row write best done
    // as a separate "transferLeadership" endpoint; for now the guard
    // just rejects officer-initiated Leader promotions outright.
    if (role === AllianceRole.LEADER && requester.role !== AllianceRole.LEADER) {
      throw new ForbiddenException('Sadece lider yeni lider tayin edebilir');
    }
    // Officers can't reduce/promote other Officers or the Leader either —
    // only Leader can manage Officer ranks.  Members are fair game.
    if (
      requester.role === AllianceRole.OFFICER &&
      (target.role === AllianceRole.LEADER || target.role === AllianceRole.OFFICER)
    ) {
      throw new ForbiddenException('Officer rütbesini sadece lider değiştirebilir');
    }

    target.role = role;
    return this.memberRepo.save(target);
  }

  async kickMember(requesterId: string, allianceId: string, targetUserId: string): Promise<void> {
    const requester = await this.memberRepo.findOne({ where: { userId: requesterId, allianceId } });
    if (!requester || requester.role !== AllianceRole.LEADER && requester.role !== AllianceRole.OFFICER) {
      throw new ForbiddenException('Yeterli yetkiniz yok');
    }

    const target = await this.memberRepo.findOne({ where: { userId: targetUserId, allianceId } });
    if (!target) throw new NotFoundException('Üye bulunamadı');
    if (target.role === AllianceRole.LEADER) throw new ForbiddenException('Lider kovulamaz');

    await this.memberRepo.remove(target);
  }

  async declareWar(userId: string, dto: DeclareWarDto): Promise<AllianceWar> {
    const membership = await this.memberRepo.findOne({ where: { userId } });
    if (!membership) throw new ForbiddenException('Bir ittifaka üye değilsiniz');
    if (membership.role !== AllianceRole.LEADER && membership.role !== AllianceRole.OFFICER) {
      throw new ForbiddenException('Savaş ilan etmek için lider veya subay olmanız gerekir');
    }

    const { allianceId } = membership;
    if (allianceId === dto.targetAllianceId) {
      throw new BadRequestException('Kendi ittifakınıza savaş ilan edemezsiniz');
    }

    const targetAlliance = await this.allianceRepo.findOne({ where: { id: dto.targetAllianceId } });
    if (!targetAlliance) throw new NotFoundException('Hedef ittifak bulunamadı');

    const activeWar = await this.warRepo.findOne({
      where: [
        { attackerId: allianceId, defenderId: dto.targetAllianceId, status: WarStatus.ACTIVE },
        { attackerId: dto.targetAllianceId, defenderId: allianceId, status: WarStatus.ACTIVE },
      ],
    });
    if (activeWar) throw new ConflictException('Bu ittifakla zaten aktif bir savaş var');

    const war = this.warRepo.create({
      attackerId: allianceId,
      defenderId: dto.targetAllianceId,
      status: WarStatus.DECLARED,
    });

    return this.warRepo.save(war);
  }

  /**
   * War ledger. Audit cycle 6: previously public — any anonymous client
   * could pull every alliance's active and historical war list, which
   * leaks strategic state (who is distracted, who just lost a war, etc.).
   * Now requires that the caller is a member of the queried alliance.
   */
  async getWars(requesterId: string, allianceId: string): Promise<AllianceWar[]> {
    await this.assertMembership(requesterId, allianceId);
    return this.warRepo.find({
      where: [{ attackerId: allianceId }, { defenderId: allianceId }],
      relations: ['attacker', 'defender'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Alliance storage readout. Audit cycle 6 BLOCKER: previously this
   * had no controller guard and no membership check, so anonymous
   * attackers could `curl /api/v1/alliances/<uuid>/storage` and read
   * every alliance's mineral/energy balance + capacity. That's a direct
   * raid-target oracle. Now the controller requires JWT and this method
   * refuses non-members.
   */
  async getStorage(requesterId: string, allianceId: string): Promise<AllianceStorage> {
    await this.assertMembership(requesterId, allianceId);
    const storage = await this.storageRepo.findOne({ where: { allianceId } });
    if (!storage) throw new NotFoundException('İttifak deposu bulunamadı');
    return storage;
  }

  /**
   * Deposit player resources into the alliance vault.
   *
   * Audit cycle 6 HIGH (ECON-C6-07): previously the alliance_storage row
   * was read OUTSIDE the transaction (stale snapshot) and the
   * `totalAfter > capacity` check evaluated against that snapshot.
   * Concurrent depositors could each observe e.g. 800/1000, each deposit
   * 150, and both write — final storage 1100 (capacity blown), with the
   * second write clobbering the first (last-write-wins on in-memory
   * `storage.minerals` mutation).
   *
   * Fix:
   *  - The storage row is now fetched INSIDE the transaction with
   *    pessimistic_write, so concurrent deposit txns serialize.
   *  - Capacity is checked against the LOCKED snapshot.
   *  - Storage mutation goes through a SQL increment (UPDATE ... SET col
   *    = col + $n), so even within a single tx there is no read-modify-
   *    write lost-update window.
   *
   * Lock order (must match alliance-player.service.donate to avoid
   * deadlocks across the two donation paths):
   *   1. alliance_storage  (shared row — canonical first)
   *   2. player_resources  (caller-private row — second)
   */
  async deposit(userId: string, allianceId: string, dto: DepositResourcesDto): Promise<AllianceStorage> {
    const member = await this.memberRepo.findOne({ where: { userId, allianceId } });
    if (!member) throw new ForbiddenException('Bu ittifakın üyesi değilsiniz');

    const mineralsAmt = dto.minerals ?? 0;
    const energyAmt = dto.energy ?? 0;
    if (mineralsAmt < 0 || energyAmt < 0) {
      throw new BadRequestException('Negatif kaynak deposu reddedildi');
    }
    if (mineralsAmt === 0 && energyAmt === 0) {
      throw new BadRequestException('En az bir kaynak girilmeli');
    }

    // ── ECONOMY GUARD ───────────────────────────────────────────────────
    // Before this commit, deposit credited the alliance storage and bumped
    // member contribution but NEVER deducted from the player's own wallet
    // — free alliance funding. Engine audit flagged HIGH. player_resources
    // lives in game-server's schema, same DB — raw SQL with row-level lock
    // keeps the deduct atomic against trickle-tick contention.
    return this.allianceDataSource.transaction(async (manager) => {
      // 1) Lock alliance_storage FIRST — canonical shared-row order, mirrors
      //    alliance-player.service.ts donate (L296-302). Capacity check below
      //    runs against this locked snapshot.
      const lockedStorage = await manager
        .createQueryBuilder(AllianceStorage, 's')
        .setLock('pessimistic_write')
        .where('s.allianceId = :id', { id: allianceId })
        .getOne();
      if (!lockedStorage) throw new NotFoundException('İttifak deposu bulunamadı');

      const totalAfter =
        Number(lockedStorage.minerals) + mineralsAmt +
        Number(lockedStorage.gas) +
        Number(lockedStorage.energy) + energyAmt;
      if (totalAfter > Number(lockedStorage.capacity)) {
        throw new BadRequestException('Depo kapasitesi aşıldı');
      }

      // 2) Lock player_resources SECOND — caller-private row.
      const balRows = (await manager.query(
        `SELECT mineral, energy FROM player_resources
           WHERE player_id = $1::uuid FOR UPDATE`,
        [userId],
      )) as Array<{ mineral: number; energy: number }>;
      const bal = balRows[0];
      if (!bal) {
        throw new BadRequestException('Oyuncu cüzdanı bulunamadı');
      }
      if (Number(bal.mineral) < mineralsAmt || Number(bal.energy) < energyAmt) {
        throw new BadRequestException(
          `Yetersiz kaynak: mineral ${bal.mineral}/${mineralsAmt}, enerji ${bal.energy}/${energyAmt}`,
        );
      }

      await manager.query(
        `UPDATE player_resources
            SET mineral = mineral - $2, energy = energy - $3
          WHERE player_id = $1::uuid`,
        [userId, mineralsAmt, energyAmt],
      );

      // 3) SQL increment on the locked storage row — no in-memory
      //    read-modify-write; concurrent writes are now impossible because
      //    the row is held under pessimistic_write until commit.
      await manager.query(
        `UPDATE alliance_storage
            SET minerals = minerals + $2,
                energy   = energy   + $3,
                updated_at = NOW()
          WHERE alliance_id = $1::uuid`,
        [allianceId, mineralsAmt, energyAmt],
      );

      member.contribution += mineralsAmt + energyAmt;
      await manager.save(member);

      // Cycle-18 BAL-01 — grant alliance-wide XP (1:1 with deposited
      // resources) so alliance.level / leaderboard / maxMembers progress.
      const alliance = await manager.findOne(Alliance, { where: { id: allianceId } });
      if (alliance) {
        applyAllianceXp(alliance, mineralsAmt + energyAmt);
        await manager.save(alliance);
      }

      // Return the post-update snapshot for the caller.
      const fresh = await manager.findOne(AllianceStorage, { where: { allianceId } });
      return fresh ?? lockedStorage;
    });
  }
}
