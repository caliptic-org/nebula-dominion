import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { Mail, MailReward, MailType } from './entities/mail.entity';
import { PlayerResource } from '../resources/entities/player-resource.entity';
import { ResourceType } from '../resources/entities/resource-config.entity';
import { CreateMailDto } from './dto/create-mail.dto';

export interface ListMailParams {
  userId: string;
  page?: number;
  limit?: number;
  type?: MailType;
  isRead?: boolean;
}

export interface ListMailResult {
  items: Mail[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const RESOURCE_TYPE_VALUES = new Set<string>(Object.values(ResourceType));

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectRepository(Mail)
    private readonly mailRepo: Repository<Mail>,
    private readonly dataSource: DataSource,
  ) {}

  async list(params: ListMailParams): Promise<ListMailResult> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));

    const qb = this.mailRepo
      .createQueryBuilder('m')
      .where('m.user_id = :userId', { userId: params.userId })
      .andWhere('m.deleted_at IS NULL');

    if (params.type !== undefined) {
      qb.andWhere('m.type = :type', { type: params.type });
    }
    if (params.isRead !== undefined) {
      qb.andWhere('m.is_read = :isRead', { isRead: params.isRead });
    }

    qb.orderBy('m.sent_at', 'DESC').take(limit).skip((page - 1) * limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async markRead(mailId: string, userId: string): Promise<Mail> {
    const mail = await this.findOwned(mailId, userId);
    if (mail.isRead) return mail;
    mail.isRead = true;
    return this.mailRepo.save(mail);
  }

  async claim(mailId: string, userId: string): Promise<Mail> {
    return this.dataSource.transaction(async (em) => {
      const mail = await em
        .createQueryBuilder(Mail, 'm')
        .setLock('pessimistic_write')
        .where('m.id = :id', { id: mailId })
        .getOne();

      if (!mail || mail.deletedAt) {
        throw new NotFoundException(`Mail ${mailId} not found`);
      }
      if (mail.userId !== userId) {
        throw new ForbiddenException('Mail does not belong to this user');
      }
      if (mail.expiresAt && mail.expiresAt.getTime() <= Date.now()) {
        throw new GoneException('Mail has expired');
      }
      if (!mail.rewards || mail.rewards.length === 0) {
        throw new ConflictException('Mail has no rewards to claim');
      }
      if (mail.rewardsClaimed) {
        throw new ConflictException('Rewards already claimed');
      }

      for (const reward of mail.rewards) {
        if (!reward || reward.amount <= 0) continue;
        if (RESOURCE_TYPE_VALUES.has(reward.type)) {
          await this.creditResource(em, userId, reward);
        } else {
          this.logger.warn(
            `Unsupported reward type "${reward.type}" on mail ${mail.id} — marked as claimed without transfer`,
          );
        }
      }

      mail.rewardsClaimed = true;
      mail.rewardsClaimedAt = new Date();
      mail.isRead = true;
      return em.save(mail);
    });
  }

  async softDelete(mailId: string, userId: string): Promise<void> {
    const mail = await this.findOwned(mailId, userId);
    if (mail.deletedAt) return;
    mail.deletedAt = new Date();
    await this.mailRepo.save(mail);
  }

  async create(dto: CreateMailDto): Promise<Mail> {
    const mail = this.mailRepo.create({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      sender: dto.sender,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      rewards: (dto.rewards as MailReward[] | undefined) ?? null,
      sentAt: new Date(),
    });
    return this.mailRepo.save(mail);
  }

  private async findOwned(mailId: string, userId: string): Promise<Mail> {
    const mail = await this.mailRepo.findOne({
      where: { id: mailId, deletedAt: IsNull() },
    });
    if (!mail) throw new NotFoundException(`Mail ${mailId} not found`);
    if (mail.userId !== userId) {
      throw new ForbiddenException('Mail does not belong to this user');
    }
    return mail;
  }

  private async creditResource(
    em: EntityManager,
    userId: string,
    reward: MailReward,
  ): Promise<void> {
    const resourceType = reward.type as ResourceType;
    const existing = await em
      .createQueryBuilder(PlayerResource, 'p')
      .setLock('pessimistic_write')
      .where('p.player_id = :playerId AND p.resource_type = :type', {
        playerId: userId,
        type: resourceType,
      })
      .getOne();

    if (existing) {
      existing.amount = Number(existing.amount) + reward.amount;
      await em.save(existing);
      return;
    }

    const created = em.create(PlayerResource, {
      playerId: userId,
      resourceType,
      amount: reward.amount,
    });
    await em.save(created);
  }
}
