import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  GUILD_MAX_MEMBERS,
  GuildSuggestionService,
} from '../guild-suggestion.service';
import { Guild } from '../entities/guild.entity';
import { GuildMember } from '../entities/guild-member.entity';
import { GuildEvent } from '../entities/guild-event.entity';
import { PlayerProgression } from '../../progression/entities/player-progression.entity';
import { PlayerPower } from '../../stats/entities/player-power.entity';

const NOW = new Date('2026-05-03T00:00:00Z');

function makeGuild(overrides: Partial<Guild> = {}): Guild {
  return Object.assign(new Guild(), {
    id: overrides.id ?? 'g-1',
    name: 'Test Guild',
    tag: 'TST',
    leaderId: 'leader-1',
    ageUnlockedAt: 3,
    tierScore: 0,
    memberCount: 10,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: NOW,
    ...overrides,
  });
}

describe('GuildSuggestionService', () => {
  let service: GuildSuggestionService;

  // Build a query-builder mock we can chain off and override per-call.
  function makeQB<T>(result: T) {
    const qb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(result),
      getRawMany: jest.fn().mockResolvedValue(result),
    };
    return qb;
  }

  let guildQB: any;
  let eventQB: any;
  let raceQB: any;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);

    guildQB = makeQB([]);
    eventQB = makeQB([]);
    raceQB = makeQB([]);

    const guildRepo = {
      createQueryBuilder: jest.fn(() => guildQB),
      find: jest.fn(),
    };
    const memberRepo = {
      manager: { createQueryBuilder: jest.fn(() => raceQB) },
    };
    const eventRepo = {
      createQueryBuilder: jest.fn(() => eventQB),
    };
    const progressionRepo = {
      findOne: jest.fn().mockResolvedValue({ playerId: 'u-1', currentAge: 3 }),
    };
    const powerRepo = {
      findOne: jest.fn().mockResolvedValue({ playerId: 'u-1', race: 'zerg' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildSuggestionService,
        { provide: getRepositoryToken(Guild), useValue: guildRepo },
        { provide: getRepositoryToken(GuildMember), useValue: memberRepo },
        { provide: getRepositoryToken(GuildEvent), useValue: eventRepo },
        { provide: getRepositoryToken(PlayerProgression), useValue: progressionRepo },
        { provide: getRepositoryToken(PlayerPower), useValue: powerRepo },
      ],
    }).compile();

    service = module.get(GuildSuggestionService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns empty list when no candidate guilds', async () => {
    guildQB.getMany.mockResolvedValue([]);
    const result = await service.suggest('u-1');
    expect(result).toEqual([]);
  });

  it('filters out full guilds via the query (caller asserts member_count < max)', async () => {
    guildQB.getMany.mockResolvedValue([makeGuild()]);
    await service.suggest('u-1');
    expect(guildQB.where).toHaveBeenCalledWith('g.member_count < :max', { max: GUILD_MAX_MEMBERS });
  });

  it('ranks an active, age-matched, race-matched guild above a silent one', async () => {
    const matched = makeGuild({ id: 'g-match', ageUnlockedAt: 3, memberCount: 12, tierScore: 500 });
    const silent = makeGuild({ id: 'g-silent', ageUnlockedAt: 6, memberCount: 2, tierScore: 0 });
    guildQB.getMany.mockResolvedValue([matched, silent]);
    eventQB.getRawMany.mockResolvedValue([{ guild_id: 'g-match', count: '40' }]);
    raceQB.getRawMany.mockResolvedValue([
      { guild_id: 'g-match', race: 'zerg', count: '8' },
      { guild_id: 'g-match', race: 'human', count: '4' },
      { guild_id: 'g-silent', race: 'human', count: '2' },
    ]);

    const result = await service.suggest('u-1', 5);
    expect(result.map((r) => r.guildId)).toEqual(['g-match', 'g-silent']);
    expect(result[0].reasons).toEqual(
      expect.arrayContaining(['aktif_topluluk', 'cag_uyumu', 'irk_uyumu', 'uygun_buyukluk']),
    );
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('penalizes nearly-full guilds even with high activity', async () => {
    const nearFull = makeGuild({
      id: 'g-full',
      ageUnlockedAt: 3,
      memberCount: GUILD_MAX_MEMBERS - 1,
      tierScore: 500,
    });
    const mid = makeGuild({ id: 'g-mid', ageUnlockedAt: 3, memberCount: 12, tierScore: 100 });
    guildQB.getMany.mockResolvedValue([nearFull, mid]);
    eventQB.getRawMany.mockResolvedValue([
      { guild_id: 'g-full', count: '30' },
      { guild_id: 'g-mid', count: '10' },
    ]);

    const result = await service.suggest('u-1', 5);
    expect(result[0].guildId).toBe('g-mid');
  });

  it('pickBest returns the top suggestion or null', async () => {
    guildQB.getMany.mockResolvedValue([]);
    expect(await service.pickBest('u-1')).toBeNull();

    guildQB.getMany.mockResolvedValue([makeGuild({ id: 'g-only' })]);
    eventQB.getRawMany.mockResolvedValue([]);
    raceQB.getRawMany.mockResolvedValue([]);
    const top = await service.pickBest('u-1');
    expect(top?.guildId).toBe('g-only');
  });

  it('falls back to defaults when player progression/power are missing', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildSuggestionService,
        {
          provide: getRepositoryToken(Guild),
          useValue: { createQueryBuilder: jest.fn(() => guildQB) },
        },
        {
          provide: getRepositoryToken(GuildMember),
          useValue: { manager: { createQueryBuilder: jest.fn(() => raceQB) } },
        },
        {
          provide: getRepositoryToken(GuildEvent),
          useValue: { createQueryBuilder: jest.fn(() => eventQB) },
        },
        {
          provide: getRepositoryToken(PlayerProgression),
          useValue: { findOne: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: getRepositoryToken(PlayerPower),
          useValue: { findOne: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();
    const svc = module.get(GuildSuggestionService);

    guildQB.getMany.mockResolvedValue([makeGuild({ ageUnlockedAt: 1, memberCount: 12 })]);
    eventQB.getRawMany.mockResolvedValue([]);
    raceQB.getRawMany.mockResolvedValue([]);

    const result = await svc.suggest('u-2', 1);
    expect(result).toHaveLength(1);
    expect(result[0].reasons).toEqual(expect.arrayContaining(['cag_uyumu']));
  });
});
