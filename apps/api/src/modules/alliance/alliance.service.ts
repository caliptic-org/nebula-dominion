import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    if (!requester || requester.role !== AllianceRole.LEADER && requester.role !== AllianceRole.OFFICER) {
      throw new ForbiddenException('Yeterli yetkiniz yok');
    }

    const target = await this.memberRepo.findOne({ where: { userId: targetUserId, allianceId } });
    if (!target) throw new NotFoundException('Üye bulunamadı');

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

    const totalAfter = Number(storage.minerals) + (dto.minerals ?? 0) + Number(storage.energy) + (dto.energy ?? 0);
    if (totalAfter > Number(storage.capacity)) {
      throw new BadRequestException('Depo kapasitesi aşıldı');
    }

    storage.minerals = Number(storage.minerals) + (dto.minerals ?? 0);
    storage.energy = Number(storage.energy) + (dto.energy ?? 0);
    storage.updatedAt = new Date();

    member.contribution += (dto.minerals ?? 0) + (dto.energy ?? 0);
    await this.memberRepo.save(member);

    return this.storageRepo.save(storage);
  }
}
