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
import { applyAllianceXp } from './alliance-progression';

/**
 * Enriched roster row (cycle-27 audit ALLIANCE-MEMBERS-STUB). The
 * alliance_members table only carries {userId, role, contribution}, which is
 * not enough to render a real roster — the FE was falling back to a hardcoded
 * 7-member demo list. We join `users` for the display name + race and
 * `player_levels` for a "might" proxy (total_xp) so the page shows the actual
 * alliance. `online` is deliberately omitted: there's no presence system, and
 * faking a green dot is exactly the dishonesty this fix removes.
 */
export interface AllianceMemberView {
  id: string;
  userId: string;
  name: string;
  race: string | null; // English BE enum (human/automaton/…); FE maps to Turkish
  role: AllianceRole;
  contribution: number;
  power: number;
}

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

  async getMembers(userId: string, search?: string): Promise<AllianceMemberView[]> {
    const member = await this.requireMembership(userId);
    // Raw SQL because we cross into users + player_levels (the latter is
    // game-server-owned on the shared DB — same join idiom as
    // leaderboard-stub.controller). users.id is uuid = alliance_members.user_id
    // (uuid); player_levels.user_id is varchar so it needs the ::text cast.
    const params: unknown[] = [member.allianceId];
    let searchClause = '';
    if (search) {
      params.push(`%${search}%`);
      searchClause = ` AND u.username ILIKE $${params.length}`;
    }
    const rows = (await this.dataSource.query(
      `SELECT
          am.id::text              AS id,
          am.user_id::text         AS "userId",
          u.username               AS name,
          u.race                   AS race,
          am.role                  AS role,
          am.contribution          AS contribution,
          COALESCE(pl.total_xp, 0) AS power
         FROM alliance_members am
         JOIN users u ON u.id::text = am.user_id::text
         LEFT JOIN player_levels pl ON pl.user_id = am.user_id::text
        WHERE am.alliance_id = $1${searchClause}
        ORDER BY
          CASE am.role
            WHEN 'leader'  THEN 0
            WHEN 'officer' THEN 1
            WHEN 'veteran' THEN 2
            WHEN 'member'  THEN 3
            ELSE 4
          END,
          am.contribution DESC`,
      params,
    )) as Array<{
      id: string;
      userId: string;
      name: string;
      race: string | null;
      role: AllianceRole;
      contribution: string | number;
      power: string | number;
    }>;
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      race: r.race,
      role: r.role,
      contribution: Number(r.contribution),
      power: Number(r.power),
    }));
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

  /**
   * Reaksiyon ekle — alliance chat mesajlarına emoji düşürür.
   *
   * ── IDOR GUARD (cycle 6 — HIGH IDOR-ALLIANCE-CHAT-REACTION-15) ───────────
   * Önceki sürümde sadece `requireMembership(userId)` çağrılıyordu; bu yalnız
   * caller'ın HERHANGİ bir loncada üye olduğunu doğruluyor, çağrıdaki
   * `messageId`'nin hangi loncaya ait olduğuna bakmıyordu. Lonca A üyesi,
   * Lonca B'nin private chat mesaj UUID'sini öğrenirse / tahmin ederse
   * `POST /alliance/chat/:messageId/reactions` ile B'nin thread'ini
   * kirletebiliyordu (cross-alliance reaction pollution).
   *
   * Yeni davranış: mesajı çek, `channelType === 'alliance'` ise mesajın
   * `channelId`'si (alliance UUID) üzerinden caller'ın aynı loncada üye
   * olduğunu `alliance_members` tablosuna ek sorguyla doğrula. Aksi halde
   * 403 ForbiddenException fırlat.
   */
  async addReaction(userId: string, messageId: string, dto: AddReactionDto): Promise<ChatReaction> {
    await this.requireMembership(userId);

    const message = await this.chatRepo.findOne({ where: { id: messageId } });
    if (!message || message.isDeleted) throw new NotFoundException('Mesaj bulunamadı');

    await this.assertCanAccessMessage(userId, message);

    const existing = await this.reactionRepo.findOne({
      where: { messageId, userId, emoji: dto.emoji },
    });
    if (existing) throw new ConflictException('Bu reaksiyonu zaten eklediniz');

    return this.reactionRepo.save(
      this.reactionRepo.create({ messageId, userId, emoji: dto.emoji }),
    );
  }

  /**
   * Reaksiyon kaldır — addReaction ile aynı IDOR yüzeyi.
   *
   * Önceden `reaction` lookup'u (messageId + userId + emoji) zaten caller'ın
   * kendi reaksiyonunu hedeflediği için "veri silme" tarafında doğrudan
   * cross-alliance abuse yoktu. Ama bir reaksiyonu önce yabancı bir mesaja
   * iliştirip sonra kaldırmak yine yabancı thread'i mutate ediyor; tutarlılık
   * için aynı message-scoped membership kontrolünü burada da uyguluyoruz.
   */
  async removeReaction(userId: string, messageId: string, emoji: string): Promise<void> {
    await this.requireMembership(userId);

    const message = await this.chatRepo.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Mesaj bulunamadı');

    await this.assertCanAccessMessage(userId, message);

    const reaction = await this.reactionRepo.findOne({
      where: { messageId, userId, emoji },
    });
    if (!reaction) throw new NotFoundException('Reaksiyon bulunamadı');

    await this.reactionRepo.remove(reaction);
  }

  /**
   * Mesaj kapsamlı erişim kontrolü.
   * Alliance kanalı için: caller'ın mesajın `channelId`'sine (alliance UUID)
   * karşılık gelen loncada üye olduğunu `alliance_members` tablosundan
   * doğrular. Üye değilse 403 atar.
   *
   * `requireMembership` sadece "bir loncada üye mi?" sorusuna cevap verir —
   * bu fonksiyon ise "BU mesajın loncasında üye mi?" sorusunu cevaplar.
   * IDOR-ALLIANCE-CHAT-REACTION-15 fix'inin merkezi.
   */
  private async assertCanAccessMessage(userId: string, message: ChatMessage): Promise<void> {
    if (message.channelType !== 'alliance') {
      // Şu an sadece alliance kanal destekleniyor; başka kanal tiplerinde
      // (örn. global / private) ayrı kontrol mantığı gerekir.
      return;
    }
    if (!message.channelId) {
      throw new ForbiddenException('Bu ittifak sohbetine reaksiyon ekleyemezsin');
    }
    const isMember = await this.memberRepo.findOne({
      where: { userId, allianceId: message.channelId },
    });
    if (!isMember) {
      throw new ForbiddenException('Bu ittifak sohbetine reaksiyon ekleyemezsin');
    }
  }

  // ─── Donations ────────────────────────────────────────────────────────────

  async getStorage(userId: string): Promise<AllianceStorage> {
    const member = await this.requireMembership(userId);
    const storage = await this.storageRepo.findOne({ where: { allianceId: member.allianceId } });
    if (!storage) throw new NotFoundException('Lonca deposu bulunamadı');
    return storage;
  }

  /**
   * Bağış akışı — /api/v1/alliance/donations bu metoda yönlenir.
   *
   * ── ECONOMY GUARD (cycle 6) ────────────────────────────────────────────
   * Cycle 5'te wallet-deduct yalnız `AllianceService.deposit`'e eklenmişti.
   * Bu metot ise storage + alliance_donations + member.contribution yazıp
   * `player_resources`'a hiç dokunmuyordu — bir oyuncu {mineral:1M, gas:1M,
   * energy:1M} POST'larıyla katkı leaderboard'unu ve lonca deposunu hiçbir
   * kaynak harcamadan şişirebiliyordu (HIGH ECON-C6-04).
   *
   * Düzeltme: aynı tx içinde önce `player_resources` üzerinde
   * pessimistic_write lock ile bakiye kontrolü + atomik düşüm yapılıyor,
   * sonra storage / contribution / donation yazımları devam ediyor.
   * `deposit` (alliance.service.ts L263-293) ile pattern bire bir uyumlu.
   */
  async donate(userId: string, dto: DonateDto): Promise<AllianceDonation> {
    const member = await this.requireMembership(userId);

    const mineral = dto.mineral ?? 0;
    const gas = dto.gas ?? 0;
    const energy = dto.energy ?? 0;

    if (mineral === 0 && gas === 0 && energy === 0) {
      throw new BadRequestException('En az bir kaynaktan bağış yapılmalı');
    }

    return this.dataSource.transaction(async (manager) => {
      // ── ECONOMY GUARD ───────────────────────────────────────────────
      // Önce oyuncunun kendi cüzdanından düş — yoksa free-mint.
      // player_resources game-server schema'sında yaşıyor, aynı DB; raw SQL
      // + FOR UPDATE trickle-tick contention'ına karşı atomik kalmasını
      // sağlıyor. alliance.service.ts deposit ile aynı pattern.
      const balRows = (await manager.query(
        `SELECT mineral, gas, energy FROM player_resources
           WHERE player_id = $1::uuid FOR UPDATE`,
        [userId],
      )) as Array<{ mineral: number; gas: number; energy: number }>;
      const bal = balRows[0];
      if (!bal) {
        throw new BadRequestException('Oyuncu cüzdanı bulunamadı');
      }
      if (Number(bal.mineral) < mineral) {
        throw new BadRequestException(`Yetersiz mineral kaynağın`);
      }
      if (Number(bal.gas) < gas) {
        throw new BadRequestException(`Yetersiz gas kaynağın`);
      }
      if (Number(bal.energy) < energy) {
        throw new BadRequestException(`Yetersiz energy kaynağın`);
      }

      await manager.query(
        `UPDATE player_resources
            SET mineral = mineral - $2,
                gas = gas - $3,
                energy = energy - $4
          WHERE player_id = $1::uuid`,
        [userId, mineral, gas, energy],
      );

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

      // Cycle-18 BAL-01 — grant alliance-wide XP (1:1 with donated resources)
      // so alliance.level, the public leaderboard (ordered by xp), and the
      // member cap actually progress. Without this, donating only bumped the
      // personal contribution counter and the alliance's own xp/level stayed
      // pinned at 0/1 forever.
      const alliance = await manager.findOne(Alliance, {
        where: { id: member.allianceId },
      });
      if (alliance) {
        applyAllianceXp(alliance, mineral + gas + energy);
        await manager.save(Alliance, alliance);
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
