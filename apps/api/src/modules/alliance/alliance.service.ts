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

  async findAll(): Promise<Alliance[]> {
    return this.allianceRepo.find({
      relations: ['members'],
      order: { xp: 'DESC' },
      take: 50,
    });
  }

  async findOne(id: string): Promise<Alliance> {
    const alliance = await this.allianceRepo.findOne({
      where: { id },
      relations: ['members', 'storage'],
    });
    if (!alliance) throw new NotFoundException('İttifak bulunamadı');
    return alliance;
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

  async getMembers(allianceId: string): Promise<AllianceMember[]> {
    return this.memberRepo.find({
      where: { allianceId },
      order: { role: 'ASC', joinedAt: 'ASC' },
    });
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

  async getWars(allianceId: string): Promise<AllianceWar[]> {
    return this.warRepo.find({
      where: [{ attackerId: allianceId }, { defenderId: allianceId }],
      relations: ['attacker', 'defender'],
      order: { createdAt: 'DESC' },
    });
  }

  async getStorage(allianceId: string): Promise<AllianceStorage> {
    const storage = await this.storageRepo.findOne({ where: { allianceId } });
    if (!storage) throw new NotFoundException('İttifak deposu bulunamadı');
    return storage;
  }

  async deposit(userId: string, allianceId: string, dto: DepositResourcesDto): Promise<AllianceStorage> {
    const member = await this.memberRepo.findOne({ where: { userId, allianceId } });
    if (!member) throw new ForbiddenException('Bu ittifakın üyesi değilsiniz');

    const storage = await this.storageRepo.findOne({ where: { allianceId } });
    if (!storage) throw new NotFoundException('İttifak deposu bulunamadı');

    const mineralsAmt = dto.minerals ?? 0;
    const energyAmt = dto.energy ?? 0;
    if (mineralsAmt < 0 || energyAmt < 0) {
      throw new BadRequestException('Negatif kaynak deposu reddedildi');
    }
    if (mineralsAmt === 0 && energyAmt === 0) {
      throw new BadRequestException('En az bir kaynak girilmeli');
    }

    const totalAfter = Number(storage.minerals) + mineralsAmt + Number(storage.energy) + energyAmt;
    if (totalAfter > Number(storage.capacity)) {
      throw new BadRequestException('Depo kapasitesi aşıldı');
    }

    // ── ECONOMY GUARD ───────────────────────────────────────────────────
    // Before this commit, deposit credited the alliance storage and bumped
    // member contribution but NEVER deducted from the player's own wallet
    // — free alliance funding. Engine audit flagged HIGH. player_resources
    // lives in game-server's schema, same DB — raw SQL with row-level lock
    // keeps the deduct atomic against trickle-tick contention.
    return this.allianceDataSource.transaction(async (manager) => {
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

      storage.minerals = Number(storage.minerals) + mineralsAmt;
      storage.energy = Number(storage.energy) + energyAmt;
      storage.updatedAt = new Date();

      member.contribution += mineralsAmt + energyAmt;
      await manager.save(member);
      return manager.save(storage);
    });
  }
}
