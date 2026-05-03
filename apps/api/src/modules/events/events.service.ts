import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Event, EventStatus } from './entities/event.entity';
import { EventParticipant } from './entities/event-participant.entity';
import { EventReward } from './entities/event-reward.entity';
import { QueryEventsDto } from './dto/query-events.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(EventParticipant)
    private readonly participantRepo: Repository<EventParticipant>,
    @InjectRepository(EventReward)
    private readonly rewardRepo: Repository<EventReward>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QueryEventsDto): Promise<{ events: Event[]; total: number }> {
    const qb = this.eventRepo
      .createQueryBuilder('event')
      .loadRelationCountAndMap('event.participantCount', 'event.participants')
      .orderBy('event.featured', 'DESC')
      .addOrderBy('event.endDate', 'ASC');

    if (query.status) {
      qb.where('event.status = :status', { status: query.status });
    }

    const [events, total] = await qb.getManyAndCount();
    return { events, total };
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepo.findOne({
      where: { id },
      relations: ['rules', 'rewards'],
      order: {
        rules: { sortOrder: 'ASC' },
        rewards: { rank: 'ASC' },
      },
    });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');
    return event;
  }

  async getLeaderboard(
    id: string,
    query: LeaderboardQueryDto,
  ): Promise<{ entries: LeaderboardEntry[]; total: number; limit: number; offset: number }> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const [rows, total] = await this.dataSource
      .createQueryBuilder()
      .select('ep.user_id', 'userId')
      .addSelect('ep.score', 'score')
      .addSelect('ep.joined_at', 'joinedAt')
      .addSelect('u.username', 'username')
      .from('event_participants', 'ep')
      .innerJoin('users', 'u', 'u.id = ep.user_id')
      .where('ep.event_id = :id', { id })
      .orderBy('ep.score', 'DESC')
      .addOrderBy('ep.joined_at', 'ASC')
      .limit(limit)
      .offset(offset)
      .getRawMany()
      .then(async (rows) => {
        const count = await this.participantRepo.count({ where: { eventId: id } });
        return [rows, count] as const;
      });

    const entries: LeaderboardEntry[] = rows.map((row, i) => ({
      rank: offset + i + 1,
      name: row.username,
      score: Number(row.score),
      race: event.raceLabel,
      raceColor: event.raceColor,
    }));

    return { entries, total, limit, offset };
  }

  async join(eventId: string, userId: string): Promise<EventParticipant> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');

    if (event.status !== EventStatus.ACTIVE) {
      throw new BadRequestException('Bu etkinlik aktif değil');
    }

    const existing = await this.participantRepo.findOne({
      where: { eventId, userId },
    });
    if (existing) {
      throw new ConflictException('Bu etkinliğe zaten katıldınız');
    }

    if (event.maxParticipants) {
      const count = await this.participantRepo.count({ where: { eventId } });
      if (count >= event.maxParticipants) {
        throw new BadRequestException('Etkinlik katılımcı kapasitesi doldu');
      }
    }

    return this.participantRepo.save(
      this.participantRepo.create({ eventId, userId }),
    );
  }

  async getRewards(id: string): Promise<EventReward[]> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');

    return this.rewardRepo.find({
      where: { eventId: id },
      order: { rank: 'ASC' },
    });
  }
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  race: string;
  raceColor: string;
}
