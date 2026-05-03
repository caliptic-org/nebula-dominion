import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { GuildRaidsService } from './guild-raids.service';
import { Guild } from './entities/guild.entity';
import { GuildMember, GuildRole } from './entities/guild-member.entity';
import { GuildEvent } from './entities/guild-event.entity';
import {
  GuildRaid,
  GuildRaidStatus,
  GuildRaidTier,
} from './entities/guild-raid.entity';
import { GuildRaidContribution } from './entities/guild-raid-contribution.entity';
import {
  GuildRaidDrop,
  GuildRaidDropSource,
} from './entities/guild-raid-drop.entity';
import { MutationEssenceBalance } from './entities/mutation-essence-balance.entity';
import { MutationEssenceWeeklyGrant } from './entities/mutation-essence-weekly-grant.entity';
import {
  GuildResearchState,
  GuildResearchStatus,
} from './entities/guild-research-state.entity';
import {
  ESSENCE_WEEKLY_CAP_PER_PLAYER,
  RAID_BASE_HP,
  RAID_TIER_HP_MULTIPLIER,
} from './raid.config';
import { TELEMETRY_GUILD_ACTIVITY } from './guilds.constants';
import { isoWeekStartUtc } from './time.util';

/**
 * Mini in-memory store backing both the injected repos and the manager
 * passed into `dataSource.transaction(...)`. Each entity class maps to a
 * Map<key, row>; `findOne` honors the `where` filter on the configured key.
 */
type Store = {
  guilds: Map<string, Guild>;
  members: Map<string, GuildMember>; // key: `${guildId}|${userId}`
  raids: Map<string, GuildRaid>;
  contribs: Map<string, GuildRaidContribution>; // key: `${raidId}|${userId}`
  drops: GuildRaidDrop[];
  balances: Map<string, MutationEssenceBalance>;
  weekly: Map<string, MutationEssenceWeeklyGrant>; // key: `${userId}|${weekIso}`
  research: GuildResearchState[];
};

function memberKey(guildId: string, userId: string) {
  return `${guildId}|${userId}`;
}
function contribKey(raidId: string, userId: string) {
  return `${raidId}|${userId}`;
}
function weeklyKey(userId: string, week: Date) {
  return `${userId}|${week.toISOString()}`;
}

function buildManager(store: Store): EntityManager {
  let nextId = 1;
  const fresh = () => `id-${nextId++}`;

  function whereMatch(row: any, where: any): boolean {
    return Object.entries(where).every(([k, v]) => {
      const rowVal = (row as any)[k];
      if (v && typeof v === 'object' && '_type' in (v as any)) {
        // typeorm operators (LessThanOrEqual etc) — not used in this spec path
        return true;
      }
      if (v instanceof Date && rowVal instanceof Date) {
        return v.getTime() === rowVal.getTime();
      }
      return rowVal === v;
    });
  }

  const m: Partial<EntityManager> = {
    create: jest.fn((_entity: any, data: any) => ({ ...data })) as any,
    save: jest.fn(async (entity: any, maybeData?: any) => {
      // Support both `save(entity, data)` and `save(data)` forms TypeORM accepts.
      const data = maybeData ?? entity;
      const target = maybeData ? entity : data?.constructor;
      const cls = target ?? data;
      // We don't have hard runtime classes for entities in test, so we
      // discriminate by the *shape* of the data.
      if ('bossMaxHp' in data) {
        if (!data.id) data.id = fresh();
        store.raids.set(data.id, data as GuildRaid);
        return data;
      }
      if ('damageDealt' in data && 'raidId' in data) {
        store.contribs.set(contribKey(data.raidId, data.userId), data);
        return data;
      }
      if ('source' in data && 'essenceAmount' in data) {
        if (!data.id) data.id = fresh();
        store.drops.push(data as GuildRaidDrop);
        return data;
      }
      if ('balance' in data && 'userId' in data) {
        store.balances.set(data.userId, data as MutationEssenceBalance);
        return data;
      }
      if ('grantedCount' in data) {
        store.weekly.set(weeklyKey(data.userId, data.isoWeekStart), data);
        return data;
      }
      if ('memberCount' in data && 'tag' in data) {
        store.guilds.set(data.id, data);
        return data;
      }
      if ('role' in data && 'guildId' in data && 'userId' in data) {
        store.members.set(memberKey(data.guildId, data.userId), data);
        return data;
      }
      if ('type' in data && 'payload' in data && 'guildId' in data) {
        // GuildEvent — append-only; we ignore for assertions in this spec
        return data;
      }
      return data;
    }) as any,
    findOne: jest.fn(async (entity: any, opts: any) => {
      const where = opts?.where ?? {};
      if (entity === GuildRaid) {
        return where.id ? store.raids.get(where.id) ?? null : null;
      }
      if (entity === GuildMember) {
        return store.members.get(memberKey(where.guildId, where.userId)) ?? null;
      }
      if (entity === Guild) {
        return store.guilds.get(where.id) ?? null;
      }
      if (entity === GuildRaidContribution) {
        return store.contribs.get(contribKey(where.raidId, where.userId)) ?? null;
      }
      if (entity === MutationEssenceBalance) {
        return store.balances.get(where.userId) ?? null;
      }
      if (entity === MutationEssenceWeeklyGrant) {
        return store.weekly.get(weeklyKey(where.userId, where.isoWeekStart)) ?? null;
      }
      return null;
    }) as any,
    find: jest.fn(async (entity: any, opts: any) => {
      const where = opts?.where ?? {};
      if (entity === GuildRaidContribution) {
        const rows = [...store.contribs.values()].filter((c) => c.raidId === where.raidId);
        rows.sort((a, b) => Number(b.damageDealt) - Number(a.damageDealt));
        return rows;
      }
      if (entity === GuildRaidDrop) {
        return store.drops.filter((d) => d.raidId === where.raidId);
      }
      if (entity === GuildResearchState) {
        return store.research.filter((r) => whereMatch(r, where));
      }
      return [];
    }) as any,
    increment: jest.fn(async (entity: any, where: any, field: string, by: number) => {
      if (entity === Guild) {
        const g = store.guilds.get(where.id);
        if (g) (g as any)[field] = ((g as any)[field] ?? 0) + by;
      }
    }) as any,
  };
  return m as EntityManager;
}

function freshStore(): Store {
  return {
    guilds: new Map(),
    members: new Map(),
    raids: new Map(),
    contribs: new Map(),
    drops: [],
    balances: new Map(),
    weekly: new Map(),
    research: [],
  };
}

const repoMock = (store: Store, kind: keyof Store) => ({
  find: jest.fn(async (opts: any = {}) => {
    const where = opts.where ?? {};
    switch (kind) {
      case 'raids':
        return [...store.raids.values()].filter((r: any) =>
          Object.entries(where).every(([k, v]) => {
            if (v && typeof v === 'object' && '_type' in (v as any)) return true;
            return (r as any)[k] === v;
          }),
        );
      case 'contribs':
        return [...store.contribs.values()].filter((c) => c.raidId === where.raidId);
      case 'drops':
        return store.drops.filter((d) => d.raidId === where.raidId);
      case 'guilds':
        return [...store.guilds.values()];
      default:
        return [];
    }
  }),
  findOne: jest.fn(async (opts: any) => {
    const where = opts?.where ?? {};
    switch (kind) {
      case 'raids':
        if (where.id) return store.raids.get(where.id) ?? null;
        return [...store.raids.values()].find((r: any) =>
          Object.entries(where).every(([k, v]) => (r as any)[k] === v),
        ) ?? null;
      case 'balances':
        return store.balances.get(where.userId) ?? null;
      case 'weekly':
        return store.weekly.get(weeklyKey(where.userId, where.isoWeekStart)) ?? null;
      default:
        return null;
    }
  }),
  save: jest.fn(async (x) => x),
  create: jest.fn((x) => x),
});

function makeService(store: Store) {
  const dataSource: Partial<DataSource> = {
    transaction: jest.fn(async (cb: any) => cb(buildManager(store))),
  };

  const guildRepo = repoMock(store, 'guilds');
  const raidRepo = repoMock(store, 'raids');
  const contribRepo = repoMock(store, 'contribs');
  const dropRepo = repoMock(store, 'drops');
  const essenceRepo = repoMock(store, 'balances');
  const weeklyGrantRepo = repoMock(store, 'weekly');
  const emitter = { emit: jest.fn() };

  return Test.createTestingModule({
    providers: [
      GuildRaidsService,
      { provide: getRepositoryToken(Guild), useValue: guildRepo },
      { provide: getRepositoryToken(GuildRaid), useValue: raidRepo },
      { provide: getRepositoryToken(GuildRaidContribution), useValue: contribRepo },
      { provide: getRepositoryToken(GuildRaidDrop), useValue: dropRepo },
      { provide: getRepositoryToken(MutationEssenceBalance), useValue: essenceRepo },
      { provide: getRepositoryToken(MutationEssenceWeeklyGrant), useValue: weeklyGrantRepo },
      { provide: EventEmitter2, useValue: emitter },
      { provide: DataSource, useValue: dataSource },
    ],
  })
    .compile()
    .then((module: TestingModule) => ({
      service: module.get(GuildRaidsService),
      repos: {
        guildRepo,
        raidRepo,
        contribRepo,
        dropRepo,
        essenceRepo,
        weeklyGrantRepo,
      },
      emitter,
    }));
}

function seedGuild(store: Store, id: string, members: number, tag = 'TST'): Guild {
  const g = {
    id,
    name: `Guild-${id}`,
    tag,
    leaderId: 'leader-' + id,
    memberCount: members,
    tierScore: 0,
    ageUnlockedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Guild;
  store.guilds.set(id, g);
  return g;
}

function seedMember(store: Store, guildId: string, userId: string, role = GuildRole.MEMBER) {
  const m = {
    guildId,
    userId,
    role,
    contributionPts: 0,
    joinedAt: new Date(),
    lastActiveAt: new Date(),
  } as unknown as GuildMember;
  store.members.set(memberKey(guildId, userId), m);
  return m;
}

describe('GuildRaidsService', () => {
  describe('computeBossHp', () => {
    it('floors member count at 3 (small guild floor)', async () => {
      const store = freshStore();
      const { service } = await makeService(store);
      const tiny = service.computeBossHp(1, GuildRaidTier.NORMAL);
      const min = service.computeBossHp(3, GuildRaidTier.NORMAL);
      expect(tiny).toBe(min);
    });

    it('scales with √(member_count) and tier multiplier', async () => {
      const store = freshStore();
      const { service } = await makeService(store);
      const m25 = service.computeBossHp(25, GuildRaidTier.HARD);
      const expected = Math.round(
        RAID_BASE_HP * RAID_TIER_HP_MULTIPLIER[GuildRaidTier.HARD] * Math.sqrt(25),
      );
      expect(m25).toBe(expected);
    });

    it('elite tier produces strictly higher HP than hard', async () => {
      const store = freshStore();
      const { service } = await makeService(store);
      const hard = service.computeBossHp(20, GuildRaidTier.HARD);
      const elite = service.computeBossHp(20, GuildRaidTier.ELITE);
      expect(elite).toBeGreaterThan(hard);
    });
  });

  describe('attack flow', () => {
    it('rejects damage when raid is not active', async () => {
      const store = freshStore();
      seedGuild(store, 'g1', 5);
      seedMember(store, 'g1', 'u1');
      const raid: GuildRaid = {
        id: 'r1',
        guildId: 'g1',
        weekStart: new Date('2026-05-04T00:00:00Z'),
        weekEnd: new Date('2026-05-10T23:59:59Z'),
        tier: GuildRaidTier.NORMAL,
        bossMaxHp: 1000,
        bossCurrentHp: 1000,
        memberCountSnapshot: 5,
        status: GuildRaidStatus.EXPIRED,
        completedAt: null,
        dropsResolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.raids.set('r1', raid);

      const { service } = await makeService(store);
      await expect(service.attack('r1', 'u1', 100)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects non-members', async () => {
      const store = freshStore();
      seedGuild(store, 'g1', 5);
      const raid: GuildRaid = {
        id: 'r1',
        guildId: 'g1',
        weekStart: new Date(),
        weekEnd: new Date(Date.now() + 86_400_000),
        tier: GuildRaidTier.NORMAL,
        bossMaxHp: 1000,
        bossCurrentHp: 1000,
        memberCountSnapshot: 5,
        status: GuildRaidStatus.ACTIVE,
        completedAt: null,
        dropsResolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.raids.set('r1', raid);

      const { service } = await makeService(store);
      await expect(service.attack('r1', 'stranger', 100)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('applies damage, accumulates contribution, and completes raid on kill', async () => {
      const store = freshStore();
      seedGuild(store, 'g1', 5);
      seedMember(store, 'g1', 'u1');
      const raid: GuildRaid = {
        id: 'r1',
        guildId: 'g1',
        weekStart: new Date(),
        weekEnd: new Date(Date.now() + 86_400_000),
        tier: GuildRaidTier.NORMAL,
        bossMaxHp: 500,
        bossCurrentHp: 500,
        memberCountSnapshot: 5,
        status: GuildRaidStatus.ACTIVE,
        completedAt: null,
        dropsResolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.raids.set('r1', raid);

      const { service, emitter } = await makeService(store);
      const partial = await service.attack('r1', 'u1', 200);
      expect(partial.bossCurrentHp).toBe(300);
      expect(partial.killedThisAttack).toBe(false);
      expect(partial.totalUserDamage).toBe(200);

      const final = await service.attack('r1', 'u1', 1_000);
      expect(final.bossCurrentHp).toBe(0);
      expect(final.killedThisAttack).toBe(true);
      expect(final.status).toBe(GuildRaidStatus.COMPLETED);

      const raidFinishEvents = emitter.emit.mock.calls.filter(
        ([ch, env]: [string, any]) =>
          ch === TELEMETRY_GUILD_ACTIVITY && env.payload?.kind === 'raid_finish',
      );
      expect(raidFinishEvents.length).toBe(1);
    });
  });

  describe('drop resolution', () => {
    it('awards base + top5 bonus, enforces 4 essence/week cap', async () => {
      const store = freshStore();
      seedGuild(store, 'g1', 8);
      // 6 contributors total, top-5 get the bonus.
      const damageOrder = [600, 500, 400, 300, 200, 100];
      const raid: GuildRaid = {
        id: 'r1',
        guildId: 'g1',
        weekStart: isoWeekStartUtc(new Date()),
        weekEnd: new Date(Date.now() + 86_400_000),
        tier: GuildRaidTier.HARD, // base 2 essence
        bossMaxHp: 2_100,
        bossCurrentHp: 0,
        memberCountSnapshot: 8,
        status: GuildRaidStatus.COMPLETED,
        completedAt: new Date(),
        dropsResolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.raids.set('r1', raid);
      damageOrder.forEach((dmg, idx) => {
        const userId = `u${idx}`;
        seedMember(store, 'g1', userId);
        store.contribs.set(contribKey('r1', userId), {
          raidId: 'r1',
          userId,
          damageDealt: dmg,
          joinedAt: new Date(),
          lastAttackAt: new Date(),
        } as unknown as GuildRaidContribution);
      });

      const { service } = await makeService(store);
      const awards = await service.resolveDrops('r1');

      expect(awards).toHaveLength(6);
      // Top-5 expect base(2) + bonus(1) = 3, but cap is 4/week → 3 fits
      const top1 = awards.find((a) => a.userId === 'u0')!;
      expect(top1.baseAmount).toBe(2);
      expect(top1.bonusAmount).toBe(1);
      expect(top1.totalGranted).toBe(3);
      expect(top1.cappedExcess).toBe(0);

      // 6th place: base(2), no bonus
      const last = awards.find((a) => a.userId === 'u5')!;
      expect(last.baseAmount).toBe(2);
      expect(last.bonusAmount).toBe(0);
      expect(last.totalGranted).toBe(2);

      // Balances reflect grants
      const u0 = store.balances.get('u0');
      expect(u0?.balance).toBe(3);

      // Weekly grant rows enforce the cap
      const weekStart = isoWeekStartUtc(new Date());
      const u0Weekly = store.weekly.get(weeklyKey('u0', weekStart));
      expect(u0Weekly?.grantedCount).toBe(3);
      expect(u0Weekly?.grantedCount).toBeLessThanOrEqual(ESSENCE_WEEKLY_CAP_PER_PLAYER);
    });

    it('caps at 4 essence/week even if elite drop + bonus exceeds it', async () => {
      const store = freshStore();
      seedGuild(store, 'g1', 5);
      seedMember(store, 'g1', 'u1');
      const raid: GuildRaid = {
        id: 'r1',
        guildId: 'g1',
        weekStart: isoWeekStartUtc(new Date()),
        weekEnd: new Date(Date.now() + 86_400_000),
        tier: GuildRaidTier.ELITE, // base 3-4 essence
        bossMaxHp: 1000,
        bossCurrentHp: 0,
        memberCountSnapshot: 5,
        status: GuildRaidStatus.COMPLETED,
        completedAt: new Date(),
        dropsResolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.raids.set('r1', raid);
      store.contribs.set(contribKey('r1', 'u1'), {
        raidId: 'r1',
        userId: 'u1',
        damageDealt: 1000,
        joinedAt: new Date(),
        lastAttackAt: new Date(),
      } as unknown as GuildRaidContribution);

      // Pre-seed: u1 already received 2 essence this week from a daily event.
      const weekStart = isoWeekStartUtc(new Date());
      store.weekly.set(weeklyKey('u1', weekStart), {
        userId: 'u1',
        isoWeekStart: weekStart,
        grantedCount: 2,
        updatedAt: new Date(),
      } as unknown as MutationEssenceWeeklyGrant);

      const { service } = await makeService(store);
      const awards = await service.resolveDrops('r1');
      const a = awards[0];
      expect(a.totalGranted).toBe(2); // remaining cap = 4 - 2
      expect(a.cappedExcess).toBeGreaterThan(0);

      const weekly = store.weekly.get(weeklyKey('u1', weekStart));
      expect(weekly?.grantedCount).toBe(ESSENCE_WEEKLY_CAP_PER_PLAYER);
    });

    it('is idempotent — re-resolving a raid yields the same totals', async () => {
      const store = freshStore();
      seedGuild(store, 'g1', 5);
      seedMember(store, 'g1', 'u1');
      const raid: GuildRaid = {
        id: 'r1',
        guildId: 'g1',
        weekStart: isoWeekStartUtc(new Date()),
        weekEnd: new Date(Date.now() + 86_400_000),
        tier: GuildRaidTier.NORMAL,
        bossMaxHp: 1000,
        bossCurrentHp: 0,
        memberCountSnapshot: 5,
        status: GuildRaidStatus.COMPLETED,
        completedAt: new Date(),
        dropsResolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.raids.set('r1', raid);
      store.contribs.set(contribKey('r1', 'u1'), {
        raidId: 'r1',
        userId: 'u1',
        damageDealt: 1000,
        joinedAt: new Date(),
        lastAttackAt: new Date(),
      } as unknown as GuildRaidContribution);

      const { service } = await makeService(store);
      const first = await service.resolveDrops('r1');
      const after = store.balances.get('u1')!.balance;

      const second = await service.resolveDrops('r1');
      expect(store.balances.get('u1')!.balance).toBe(after);
      expect(second[0].totalGranted).toBe(first[0].totalGranted);
    });

    it('rejects drop resolution on non-completed raids', async () => {
      const store = freshStore();
      seedGuild(store, 'g1', 5);
      const raid: GuildRaid = {
        id: 'r1',
        guildId: 'g1',
        weekStart: new Date(),
        weekEnd: new Date(Date.now() + 86_400_000),
        tier: GuildRaidTier.NORMAL,
        bossMaxHp: 1000,
        bossCurrentHp: 500,
        memberCountSnapshot: 5,
        status: GuildRaidStatus.ACTIVE,
        completedAt: null,
        dropsResolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.raids.set('r1', raid);

      const { service } = await makeService(store);
      await expect(service.resolveDrops('r1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFound for unknown raid id', async () => {
      const store = freshStore();
      const { service } = await makeService(store);
      await expect(service.resolveDrops('does-not-exist')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('weekly essence usage helper', () => {
    it('returns the configured weekly cap when no grants have been made', async () => {
      const store = freshStore();
      const { service } = await makeService(store);
      const usage = await service.getWeeklyEssenceUsage('u1');
      expect(usage.granted).toBe(0);
      expect(usage.remaining).toBe(ESSENCE_WEEKLY_CAP_PER_PLAYER);
    });
  });
});
