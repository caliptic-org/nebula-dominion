import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Alliance } from './entities/alliance.entity';
import { AllianceMember, AllianceRole } from './entities/alliance-member.entity';
import { AllianceWar, WarStatus } from './entities/alliance-war.entity';
import { AllianceStorage } from './entities/alliance-storage.entity';
import { AllianceApplication, ApplicationStatus, ApplicationType } from './entities/alliance-application.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatReaction } from './entities/chat-reaction.entity';
import { AllianceDonation } from './entities/alliance-donation.entity';
import { InviteMemberDto } from './dto/invite-member.dto';
import { ProcessApplicationDto, ApplicationAction } from './dto/process-application.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { DonateDto } from './dto/donate.dto';
import { DeclareWarByTagDto } from './dto/declare-war-by-tag.dto';
import { ChatQueryDto } from './dto/chat-query.dto';
import { DonationQueryDto } from './dto/donation-query.dto';

@Injectable()
export class AlliancePlayerService {
  constructor(
    @InjectRepository(Alliance)
    private readonly allianceRepo: Repository<Alliance>,
    @InjectRepository(AllianceMember)
    private readonly memberRepo: Repository<AllianceMember>,
    @InjectRepository(AllianceWar)
    private readonly warRepo: Repository<AllianceWar>,
    @InjectRepository(AllianceStorage)
    private readonly storageRepo: Repository<AllianceStorage>,
    @InjectRepository(AllianceApplication)
    private readonly applicationRepo: Repository<AllianceApplication>,
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
    @InjectRepository(ChatReaction)
    private readonly reactionRepo: Repository<ChatReaction>,
    @InjectRepository(AllianceDonation)
    private readonly donationRepo: Repository<AllianceDonation>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async requireMembership(userId: string): Promise<AllianceMember> {
    const member = await this.memberRepo.findOne({ where: { userId } });
    if (!member) throw new ForbiddenException('Bir loncaya üye değilsiniz');
    return member;
  }

  private requireRole(member: AllianceMember, ...roles: AllianceRole[]): void {
    if (!roles.includes(member.role)) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }
  }

  // ─── Alliance Core ────────────────────────────────────────────────────────

  async getMyAlliance(userId: string) {
    const member = await this.requireMembership(userId);
    const alliance = await this.allianceRepo.findOne({
      where: { id: member.allianceId },
      relations: ['members', 'storage'],
    });
    if (!alliance) throw new NotFoundException('Lonca bulunamadı');

    const higherCount = await this.allianceRepo
      .createQueryBuilder('a')
      .where('a.xp > :xp', { xp: alliance.xp })
      .getCount();
    const globalRank = higherCount + 1;

    const totalPower = alliance.members.reduce((sum, m) => sum + m.contribution, 0);

    return {
      id: alliance.id,
      name: alliance.name,
      tag: alliance.tag,
      level: alliance.level,
      xp: alliance.xp,
      memberCount: alliance.members.length,
      maxMembers: alliance.maxMembers,
      totalPower,
      globalRank,
      territory: null,
      warWins: alliance.warWins,
      warLosses: alliance.warLosses,
      isOpen: alliance.isOpen,
      storage: alliance.storage,
    };
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  async getMembers(userId: string, search?: string): Promise<AllianceMember[]> {
    const member = await this.requireMembership(userId);
    const qb = this.memberRepo
      .createQueryBuilder('m')
      .where('m.allianceId = :id', { id: member.allianceId })
      .orderBy('m.role', 'ASC')
      .addOrderBy('m.joinedAt', 'ASC');

    if (search) {
      qb.andWhere('m.userId::text ILIKE :search', { search: `%${search}%` });
    }

    return qb.getMany();
  }

  async inviteMember(userId: string, dto: InviteMemberDto): Promise<AllianceApplication> {
    const requester = await this.requireMembership(userId);
    this.requireRole(requester, AllianceRole.LEADER, AllianceRole.OFFICER);

    const alreadyMember = await this.memberRepo.findOne({ where: { userId: dto.playerId } });
    if (alreadyMember) throw new ConflictException('Oyuncu zaten bir loncaya üye');

    const existing = await this.applicationRepo.findOne({
      where: { userId: dto.playerId, allianceId: requester.allianceId, status: ApplicationStatus.PENDING },
    });
    if (existing) throw new ConflictException('Bu oyuncuya zaten bekleyen bir davet var');

    const alliance = await this.allianceRepo.findOne({ where: { id: requester.allianceId } });
    const memberCount = await this.memberRepo.count({ where: { allianceId: requester.allianceId } });
    if (memberCount >= alliance!.maxMembers) throw new BadRequestException('Lonca doldu');

    return this.applicationRepo.save(
      this.applicationRepo.create({
        allianceId: requester.allianceId,
        userId: dto.playerId,
        type: ApplicationType.INVITE,
        status: ApplicationStatus.PENDING,
      }),
    );
  }

  async kickMember(userId: string, memberId: string): Promise<void> {
    const requester = await this.requireMembership(userId);
    this.requireRole(requester, AllianceRole.LEADER, AllianceRole.OFFICER);

    const target = await this.memberRepo.findOne({
      where: { id: memberId, allianceId: requester.allianceId },
    });
    if (!target) throw new NotFoundException('Üye bulunamadı');
    if (target.role === AllianceRole.LEADER) throw new ForbiddenException('Lider kovulamaz');

    await this.memberRepo.remove(target);
  }

  // ─── Applications ─────────────────────────────────────────────────────────

  async getApplications(userId: string): Promise<AllianceApplication[]> {
    const member = await this.requireMembership(userId);
    this.requireRole(member, AllianceRole.LEADER, AllianceRole.OFFICER);

    return this.applicationRepo.find({
      where: { allianceId: member.allianceId, status: ApplicationStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async processApplication(
    userId: string,
    applicationId: string,
    dto: ProcessApplicationDto,
  ): Promise<AllianceApplication> {
    const member = await this.requireMembership(userId);
    this.requireRole(member, AllianceRole.LEADER, AllianceRole.OFFICER);

    const application = await this.applicationRepo.findOne({
      where: { id: applicationId, allianceId: member.allianceId, status: ApplicationStatus.PENDING },
    });
    if (!application) throw new NotFoundException('Başvuru bulunamadı');

    if (dto.action === ApplicationAction.REJECT) {
      application.status = ApplicationStatus.REJECTED;
      return this.applicationRepo.save(application);
    }

    // Accept
    const alliance = await this.allianceRepo.findOne({ where: { id: member.allianceId } });
    const memberCount = await this.memberRepo.count({ where: { allianceId: member.allianceId } });
    if (memberCount >= alliance!.maxMembers) {
      throw new BadRequestException('Lonca doldu; başvuru kabul edilemiyor');
    }

    const alreadyMember = await this.memberRepo.findOne({ where: { userId: application.userId } });
    if (alreadyMember) {
      application.status = ApplicationStatus.REJECTED;
      await this.applicationRepo.save(application);
      throw new ConflictException('Oyuncu zaten başka bir loncaya üye');
    }

    await this.memberRepo.save(
      this.memberRepo.create({
        allianceId: member.allianceId,
        userId: application.userId,
        role: AllianceRole.RECRUIT,
      }),
    );

    application.status = ApplicationStatus.ACCEPTED;
    return this.applicationRepo.save(application);
  }

  // ─── Chat ─────────────────────────────────────────────────────────────────

  async getChatMessages(userId: string, query: ChatQueryDto): Promise<ChatMessage[]> {
    const member = await this.requireMembership(userId);
    const limit = query.limit ?? 50;

    const qb = this.chatRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.reactions', 'r')
      .where('m.channelType = :type', { type: 'alliance' })
      .andWhere('m.channelId = :channelId', { channelId: member.allianceId })
      .andWhere('m.isDeleted = false')
      .orderBy('m.createdAt', 'DESC')
      .take(limit);

    if (query.before) {
      const cursor = await this.chatRepo.findOne({ where: { id: query.before } });
      if (cursor) {
        qb.andWhere('m.createdAt < :before', { before: cursor.createdAt });
      }
    }

    return qb.getMany();
  }

  async sendChatMessage(userId: string, dto: SendChatMessageDto): Promise<ChatMessage> {
    const member = await this.requireMembership(userId);

    const message = this.chatRepo.create({
      senderId: userId,
      channelType: 'alliance',
      channelId: member.allianceId,
      content: dto.content,
    });

    return this.chatRepo.save(message);
  }

  async addReaction(userId: string, messageId: string, dto: AddReactionDto): Promise<ChatReaction> {
    await this.requireMembership(userId);

    const message = await this.chatRepo.findOne({ where: { id: messageId } });
    if (!message || message.isDeleted) throw new NotFoundException('Mesaj bulunamadı');

    const existing = await this.reactionRepo.findOne({
      where: { messageId, userId, emoji: dto.emoji },
    });
    if (existing) throw new ConflictException('Bu reaksiyonu zaten eklediniz');

    return this.reactionRepo.save(
      this.reactionRepo.create({ messageId, userId, emoji: dto.emoji }),
    );
  }

  async removeReaction(userId: string, messageId: string, emoji: string): Promise<void> {
    await this.requireMembership(userId);

    const reaction = await this.reactionRepo.findOne({
      where: { messageId, userId, emoji },
    });
    if (!reaction) throw new NotFoundException('Reaksiyon bulunamadı');

    await this.reactionRepo.remove(reaction);
  }

  // ─── Donations ────────────────────────────────────────────────────────────

  async getStorage(userId: string): Promise<AllianceStorage> {
    const member = await this.requireMembership(userId);
    const storage = await this.storageRepo.findOne({ where: { allianceId: member.allianceId } });
    if (!storage) throw new NotFoundException('Lonca deposu bulunamadı');
    return storage;
  }

  async donate(userId: string, dto: DonateDto): Promise<AllianceDonation> {
    const member = await this.requireMembership(userId);

    const mineral = dto.mineral ?? 0;
    const gas = dto.gas ?? 0;
    const energy = dto.energy ?? 0;

    if (mineral === 0 && gas === 0 && energy === 0) {
      throw new BadRequestException('En az bir kaynaktan bağış yapılmalı');
    }

    return this.dataSource.transaction(async (manager) => {
      // Pessimistic lock to prevent race conditions
      const storage = await manager
        .createQueryBuilder(AllianceStorage, 's')
        .setLock('pessimistic_write')
        .where('s.allianceId = :id', { id: member.allianceId })
        .getOne();

      if (!storage) throw new NotFoundException('Lonca deposu bulunamadı');

      const totalAfter =
        Number(storage.minerals) + mineral +
        Number(storage.gas) + gas +
        Number(storage.energy) + energy;

      if (totalAfter > Number(storage.capacity)) {
        throw new BadRequestException('Depo kapasitesi aşılıyor');
      }

      storage.minerals = Number(storage.minerals) + mineral;
      storage.gas = Number(storage.gas) + gas;
      storage.energy = Number(storage.energy) + energy;
      await manager.save(AllianceStorage, storage);

      const memberRecord = await manager.findOne(AllianceMember, {
        where: { userId, allianceId: member.allianceId },
      });
      if (memberRecord) {
        memberRecord.contribution += mineral + gas + energy;
        await manager.save(AllianceMember, memberRecord);
      }

      const donation = manager.create(AllianceDonation, {
        allianceId: member.allianceId,
        userId,
        mineral,
        gas,
        energy,
      });
      return manager.save(AllianceDonation, donation);
    });
  }

  async getDonations(userId: string, query: DonationQueryDto): Promise<AllianceDonation[]> {
    const member = await this.requireMembership(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return this.donationRepo.find({
      where: { allianceId: member.allianceId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // ─── Wars ─────────────────────────────────────────────────────────────────

  async getWars(userId: string): Promise<AllianceWar[]> {
    const member = await this.requireMembership(userId);
    return this.warRepo.find({
      where: [{ attackerId: member.allianceId }, { defenderId: member.allianceId }],
      relations: ['attacker', 'defender'],
      order: { createdAt: 'DESC' },
    });
  }

  async declareWarByTag(userId: string, dto: DeclareWarByTagDto): Promise<AllianceWar> {
    const member = await this.requireMembership(userId);
    this.requireRole(member, AllianceRole.LEADER);

    const targetAlliance = await this.allianceRepo.findOne({ where: { tag: dto.targetTag } });
    if (!targetAlliance) throw new NotFoundException('Hedef lonca bulunamadı');
    if (targetAlliance.id === member.allianceId) {
      throw new BadRequestException('Kendi loncana savaş ilan edemezsin');
    }

    // War lock: any active or declared war blocks a new declaration
    const activeWar = await this.warRepo.findOne({
      where: [
        { attackerId: member.allianceId, status: WarStatus.ACTIVE },
        { attackerId: member.allianceId, status: WarStatus.DECLARED },
        { defenderId: member.allianceId, status: WarStatus.ACTIVE },
        { defenderId: member.allianceId, status: WarStatus.DECLARED },
      ],
    });
    if (activeWar) {
      throw new ConflictException('Aktif savaş varken yeni savaş ilan edilemez');
    }

    const war = this.warRepo.create({
      attackerId: member.allianceId,
      defenderId: targetAlliance.id,
      status: WarStatus.DECLARED,
    });

    return this.warRepo.save(war);
  }
}
