import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GuildMembershipService } from '../guild-membership.service';
import { Guild } from '../entities/guild.entity';
import { GuildMember, GuildRole } from '../entities/guild-member.entity';
import { GUILD_MAX_MEMBERS, GuildSuggestionService } from '../guild-suggestion.service';
import { AnalyticsService } from '../../analytics/analytics.service';

describe('GuildMembershipService — join flows', () => {
  let service: GuildMembershipService;
  let memberRepo: { findOne: jest.Mock };
  let guildRepo: any;
  let suggestion: { pickBest: jest.Mock };
  let analytics: { trackServer: jest.Mock };
  let txState: { existingMember: GuildMember | null; guild: Guild | null };

  const fakeManager = {
    findOne: jest.fn(async (_entity: unknown, _opts: unknown) => txState.existingMember),
    createQueryBuilder: jest.fn(() => ({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => txState.guild),
    })),
    create: jest.fn((_entity: unknown, data: object) => ({ ...data })),
    save: jest.fn(async (entity: any) => ({ ...entity, joinedAt: new Date('2026-05-03'), role: entity.role ?? GuildRole.MEMBER })),
  };

  const dataSource = {
    transaction: jest.fn(async (cb: (em: typeof fakeManager) => Promise<unknown>) => cb(fakeManager)),
  } as unknown as DataSource;

  beforeEach(async () => {
    txState = { existingMember: null, guild: null };
    memberRepo = { findOne: jest.fn() };
    guildRepo = {};
    suggestion = { pickBest: jest.fn() };
    analytics = { trackServer: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildMembershipService,
        { provide: getRepositoryToken(GuildMember), useValue: memberRepo },
        { provide: getRepositoryToken(Guild), useValue: guildRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: GuildSuggestionService, useValue: suggestion },
        { provide: AnalyticsService, useValue: analytics },
      ],
    }).compile();

    service = module.get(GuildMembershipService);
    fakeManager.findOne.mockClear();
    fakeManager.create.mockClear();
    fakeManager.save.mockClear();
    fakeManager.createQueryBuilder.mockClear();
  });

  function makeGuild(overrides: Partial<Guild> = {}): Guild {
    return Object.assign(new Guild(), {
      id: 'g-1',
      name: 'Aurora',
      tag: 'AUR',
      leaderId: 'leader-1',
      ageUnlockedAt: 3,
      tierScore: 0,
      memberCount: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  }

  it('joinGuild rejects users that already belong to a guild', async () => {
    txState.existingMember = Object.assign(new GuildMember(), { id: 'm-1', userId: 'u-1', guildId: 'g-99' });
    await expect(service.joinGuild('u-1', 'g-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('joinGuild rejects when guild is missing', async () => {
    txState.existingMember = null;
    txState.guild = null;
    await expect(service.joinGuild('u-1', 'g-missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('joinGuild rejects when guild is at capacity', async () => {
    txState.existingMember = null;
    txState.guild = makeGuild({ memberCount: GUILD_MAX_MEMBERS });
    await expect(service.joinGuild('u-1', 'g-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('joinGuild inserts member, increments member_count, and tracks analytics', async () => {
    txState.existingMember = null;
    txState.guild = makeGuild({ memberCount: 5 });

    const result = await service.joinGuild('u-1', 'g-1');

    expect(result.guildId).toBe('g-1');
    expect(result.memberCount).toBe(6);
    expect(result.role).toBe(GuildRole.MEMBER);
    expect(txState.guild.memberCount).toBe(6);
    expect(analytics.trackServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'guild_join',
        user_id: 'u-1',
        properties: expect.objectContaining({ guild_id: 'g-1', source: 'auto_suggest' }),
      }),
    );
  });

  it('quickJoin uses the top suggestion and includes it in the response', async () => {
    memberRepo.findOne.mockResolvedValue(null);
    suggestion.pickBest.mockResolvedValue({
      guildId: 'g-pick',
      name: 'Best',
      tag: 'BST',
      memberCount: 7,
      capacity: GUILD_MAX_MEMBERS,
      ageUnlockedAt: 3,
      tierScore: 100,
      activity7d: 30,
      score: 250,
      reasons: ['aktif_topluluk'],
    });
    txState.existingMember = null;
    txState.guild = makeGuild({ id: 'g-pick', memberCount: 7 });

    const result = await service.quickJoin('u-2');

    expect(result.guildId).toBe('g-pick');
    expect(result.suggestion?.guildId).toBe('g-pick');
    expect(result.memberCount).toBe(8);
  });

  it('quickJoin throws ConflictException when user already in a guild', async () => {
    memberRepo.findOne.mockResolvedValue(Object.assign(new GuildMember(), { userId: 'u-3', guildId: 'g-x' }));
    await expect(service.quickJoin('u-3')).rejects.toBeInstanceOf(ConflictException);
    expect(suggestion.pickBest).not.toHaveBeenCalled();
  });

  it('quickJoin throws NotFoundException when no suggestion is available', async () => {
    memberRepo.findOne.mockResolvedValue(null);
    suggestion.pickBest.mockResolvedValue(null);
    await expect(service.quickJoin('u-4')).rejects.toBeInstanceOf(NotFoundException);
  });
});
