import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, MoreThan, Repository } from 'typeorm';
import { ResourceType, ResourceConfig } from '../resources/entities/resource-config.entity';
import { PlayerResource } from '../resources/entities/player-resource.entity';
import { ResourcesService } from '../resources/resources.service';
import { DonateRequest, DonateRequestStatus } from './entities/donate-request.entity';
import { DonateFulfillment } from './entities/donate-fulfillment.entity';
import { GuildEvent } from './entities/guild-event.entity';
import { GuildMembershipService } from './guild-membership.service';
import { ContributionService } from './contribution.service';
import { AnalyticsService } from '../analytics/analytics.service';

export const DAILY_REQUEST_LIMIT = 5;
export const DAILY_DONATE_LIMIT = 10;
export const REQUEST_TTL_SECONDS = 4 * 60 * 60;
export const SPAM_GUARD_SECONDS = 4 * 60 * 60;
export const STORAGE_CAP_PERCENT = 0.02;
export const ABSOLUTE_AMOUNT_CAP = 500;

const DONATABLE_RESOURCES: ResourceType[] = [ResourceType.MINERAL, ResourceType.GAS];

@Injectable()
export class GuildDonateService {
  private readonly logger = new Logger(GuildDonateService.name);

  constructor(
    @InjectRepository(DonateRequest)
    private readonly requestRepo: Repository<DonateRequest>,
    @InjectRepository(DonateFulfillment)
    private readonly fulfillmentRepo: Repository<DonateFulfillment>,
    @InjectRepository(GuildEvent)
    private readonly eventRepo: Repository<GuildEvent>,
    @InjectRepository(PlayerResource)
    private readonly playerResourceRepo: Repository<PlayerResource>,
    @InjectRepository(ResourceConfig)
    private readonly resourceConfigRepo: Repository<ResourceConfig>,
    private readonly resources: ResourcesService,
    private readonly membership: GuildMembershipService,
    private readonly contribution: ContributionService,
    private readonly analytics: AnalyticsService,
    private readonly dataSource: DataSource,
  ) {}

  private startOfDayUtc(): Date {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private endOfDayUtc(): Date {
    const start = this.startOfDayUtc();
    return new Date(start.getTime() + 24 * 3600 * 1000 - 1);
  }

  async computeMaxAmount(playerId: string, resourceType: ResourceType): Promise<number> {
    const playerResource = await this.playerResourceRepo.findOne({
      where: { playerId, resourceType },
    });
    if (!playerResource) return ABSOLUTE_AMOUNT_CAP;
    const config = await this.resourceConfigRepo.findOne({ where: { resourceType } });
    if (!config) return ABSOLUTE_AMOUNT_CAP;
    const cap = this.resources.computeCap(config, playerResource.currentAge);
    const percentBased = Math.floor(cap * STORAGE_CAP_PERCENT);
    return Math.max(1, Math.min(percentBased, ABSOLUTE_AMOUNT_CAP));
  }

  async createRequest(
    requesterId: string,
    resourceType: ResourceType,
    explicitAmount?: number,
  ): Promise<DonateRequest> {
    if (!DONATABLE_RESOURCES.includes(resourceType)) {
      throw new BadRequestException(`Resource ${resourceType} is not donatable`);
    }
    const member = await this.membership.getMember(requesterId);

    const todayRequests = await this.requestRepo.count({
      where: {
        requesterId,
        createdAt: Between(this.startOfDayUtc(), this.endOfDayUtc()),
      },
    });
    if (todayRequests >= DAILY_REQUEST_LIMIT) {
      throw new ForbiddenException(`Daily request limit reached (${DAILY_REQUEST_LIMIT})`);
    }

    const maxAmount = await this.computeMaxAmount(requesterId, resourceType);
    const amount = Math.min(explicitAmount ?? maxAmount, maxAmount);
    if (amount <= 0) {
      throw new BadRequestException('Computed donate amount is zero');
    }

    const request = await this.requestRepo.save(
      this.requestRepo.create({
        guildId: member.guildId,
        requesterId,
        resourceType,
        amountRequested: amount,
        amountFulfilled: 0,
        status: DonateRequestStatus.OPEN,
        expiresAt: new Date(Date.now() + REQUEST_TTL_SECONDS * 1000),
      }),
    );

    await this.eventRepo.save(
      this.eventRepo.create({
        guildId: member.guildId,
        userId: requesterId,
        eventType: 'donate_request',
        payload: { requestId: request.id, resourceType, amount },
      }),
    );

    await this.analytics.trackServer({
      event_type: 'guild_activity',
      user_id: requesterId,
      session_id: 'system',
      properties: {
        kind: 'donate_request',
        guild_id: member.guildId,
        request_id: request.id,
        resource_type: resourceType,
        amount,
      },
    });

    return request;
  }

  async cancelRequest(requesterId: string, requestId: string): Promise<void> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.requesterId !== requesterId) {
      throw new ForbiddenException('Only requester can cancel');
    }
    if (request.status !== DonateRequestStatus.OPEN) {
      throw new ConflictException('Request is not open');
    }
    request.status = DonateRequestStatus.CANCELLED;
    await this.requestRepo.save(request);
  }

  async listOpenRequests(guildId: string): Promise<DonateRequest[]> {
    await this.expireStaleRequests(guildId);
    return this.requestRepo.find({
      where: {
        guildId,
        status: DonateRequestStatus.OPEN,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  private async expireStaleRequests(guildId: string): Promise<void> {
    await this.requestRepo
      .createQueryBuilder()
      .update()
      .set({ status: DonateRequestStatus.EXPIRED })
      .where('guild_id = :guildId AND status = :status AND expires_at <= NOW()', {
        guildId,
        status: DonateRequestStatus.OPEN,
      })
      .execute();
  }

  async fulfill(donorId: string, requestId: string, amount: number): Promise<DonateFulfillment> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const member = await this.membership.getMember(donorId);

    return this.dataSource.transaction(async (em) => {
      const request = await em
        .createQueryBuilder(DonateRequest, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id', { id: requestId })
        .getOne();
      if (!request) throw new NotFoundException('Request not found');
      if (request.guildId !== member.guildId) {
        throw new ForbiddenException('Cross-guild donate not allowed');
      }
      if (request.requesterId === donorId) {
        throw new ConflictException('Cannot donate to your own request');
      }
      if (request.status !== DonateRequestStatus.OPEN) {
        throw new ConflictException('Request is not open');
      }
      if (request.expiresAt.getTime() <= Date.now()) {
        request.status = DonateRequestStatus.EXPIRED;
        await em.save(request);
        throw new ConflictException('Request expired');
      }

      // Daily donate cap
      const todayDonates = await em.count(DonateFulfillment, {
        where: {
          donorId,
          createdAt: Between(this.startOfDayUtc(), this.endOfDayUtc()),
        },
      });
      if (todayDonates >= DAILY_DONATE_LIMIT) {
        throw new ForbiddenException(`Daily donate limit reached (${DAILY_DONATE_LIMIT})`);
      }

      // Spam guard: same donor → same recipient within window
      const since = new Date(Date.now() - SPAM_GUARD_SECONDS * 1000);
      const recent = await em
        .createQueryBuilder(DonateFulfillment, 'f')
        .where('f.donor_id = :donorId AND f.recipient_id = :recipientId AND f.created_at > :since', {
          donorId,
          recipientId: request.requesterId,
          since,
        })
        .getCount();
      if (recent > 0) {
        throw new ForbiddenException(
          `Spam guard: must wait ${SPAM_GUARD_SECONDS / 3600}h between donations to same recipient`,
        );
      }

      const remaining = request.amountRequested - request.amountFulfilled;
      const actual = Math.min(amount, remaining);
      if (actual <= 0) {
        throw new ConflictException('Request already fully fulfilled');
      }

      // Deduct from donor
      const donorResource = await em
        .createQueryBuilder(PlayerResource, 'p')
        .setLock('pessimistic_write')
        .where('p.player_id = :playerId AND p.resource_type = :type', {
          playerId: donorId,
          type: request.resourceType,
        })
        .getOne();
      if (!donorResource || Number(donorResource.amount) < actual) {
        throw new BadRequestException(
          `Insufficient ${request.resourceType}: need ${actual}, have ${donorResource ? donorResource.amount : 0}`,
        );
      }
      donorResource.amount = Number(donorResource.amount) - actual;
      await em.save(donorResource);

      // Credit recipient (cap-aware)
      const recipientResource = await em
        .createQueryBuilder(PlayerResource, 'p')
        .setLock('pessimistic_write')
        .where('p.player_id = :playerId AND p.resource_type = :type', {
          playerId: request.requesterId,
          type: request.resourceType,
        })
        .getOne();
      if (recipientResource) {
        const config = await em.findOne(ResourceConfig, { where: { resourceType: request.resourceType } });
        const cap = config ? this.resources.computeCap(config, recipientResource.currentAge) : Number.MAX_SAFE_INTEGER;
        const credited = Math.min(Number(recipientResource.amount) + actual, cap);
        recipientResource.amount = credited;
        await em.save(recipientResource);
      }

      const fulfillment = await em.save(
        em.create(DonateFulfillment, {
          requestId: request.id,
          guildId: request.guildId,
          donorId,
          recipientId: request.requesterId,
          resourceType: request.resourceType,
          amount: actual,
        }),
      );

      request.amountFulfilled += actual;
      if (request.amountFulfilled >= request.amountRequested) {
        request.status = DonateRequestStatus.FULFILLED;
      }
      await em.save(request);

      await em.save(
        em.create(GuildEvent, {
          guildId: request.guildId,
          userId: donorId,
          eventType: 'donate_send',
          payload: {
            requestId: request.id,
            recipientId: request.requesterId,
            resourceType: request.resourceType,
            amount: actual,
          },
        }),
      );
      await em.save(
        em.create(GuildEvent, {
          guildId: request.guildId,
          userId: request.requesterId,
          eventType: 'donate_received',
          payload: {
            requestId: request.id,
            donorId,
            resourceType: request.resourceType,
            amount: actual,
          },
        }),
      );

      // Contribution (outside the txn batch but safe — separate writes)
      await this.contribution.addDonateMade(request.guildId, donorId);
      await this.contribution.addDonateReceived(request.guildId, request.requesterId);

      await this.analytics.trackServer({
        event_type: 'guild_activity',
        user_id: donorId,
        session_id: 'system',
        properties: {
          kind: 'donate_send',
          guild_id: request.guildId,
          request_id: request.id,
          recipient_id: request.requesterId,
          resource_type: request.resourceType,
          amount: actual,
        },
      });

      return fulfillment;
    });
  }
}
