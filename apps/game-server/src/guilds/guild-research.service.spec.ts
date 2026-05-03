import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import { GuildResearchService } from './guild-research.service';
import { Guild } from './entities/guild.entity';
import { GuildMember, GuildRole } from './entities/guild-member.entity';
import {
  GuildResearchState,
  GuildResearchBranch,
  GuildResearchStatus,
} from './entities/guild-research-state.entity';
import { GuildResearchContribution } from './entities/guild-research-contribution.entity';
import { TELEMETRY_GUILD_ACTIVITY } from './guilds.constants';
import {
  RESEARCH_WEEKLY_SLOTS,
  composeGuildBuffs,
  DEFAULT_MEMBER_CAPACITY,
} from './research.config';
import { isoWeekStartUtc } from './time.util';

type Store = {
  guilds: Map<string, Guild>;
  members: Map<string, GuildMember>;
  research: GuildResearchState[];
  contribs: Map<string, GuildResearchContribution>; // key: `${stateId}|${userId}`
};

function memberKey(g: string, u: string) {
  return `${g}|${u}`;
}
function contribKey(s: string, u: string) {
  return `${s}|${u}`;
}

function freshStore(): Store {
  return {
    guilds: new Map(),
    members: new Map(),
    research: [],
    contribs: new Map(),
  };
}

function whereMatches(row: any, where: any): boolean {
  return Object.entries(where).every(([k, v]) => {
    const rv = (row as any)[k];
    if (v && typeof v === 'object' && '_type' in (v as any)) return true; // typeorm operators
    if (v instanceof Date && rv instanceof Date) return v.getTime() === rv.getTime();
    return rv === v;
  });
}

function buildManager(store: Store): EntityManager {
  let nextId = 1;
  const fresh = () => `id-${nextId++}`;

  const m: Partial<EntityManager> = {
    create: jest.fn((_e: any, data: any) => ({ ...data })) as any,
    save: jest.fn(async (entity: any, maybeData?: any) => {
      const data = maybeData ?? entity;
      if ('researchId' in data && 'branch' in data && 'level' in data) {
        if (!data.id) data.id = fresh();
        const idx = store.research.findIndex((r) => r.id === data.id);
        if (idx >= 0) store.research[idx] = data;
        else store.research.push(data);
        return data;
      }
      if ('researchStateId' in data && 'xpContributed' in data) {
        store.contribs.set(contribKey(data.researchStateId, data.userId), data);
        return data;
      }
      if ('role' in data && 'guildId' in data && 'userId' in data) {
        store.members.set(memberKey(data.guildId, data.userId), data);
        return data;
      }
      if ('memberCount' in data && 'tag' in data) {
        store.guilds.set(data.id, data);
        return data;
      }
      // GuildEvent etc — ignore
      return data;
    }) as any,
    findOne: jest.fn(async (entity: any, opts: any) => {
      const where = opts?.where ?? {};
      if (entity === Guild) return store.guilds.get(where.id) ?? null;
      if (entity === GuildMember) {
        return store.members.get(memberKey(where.guildId, where.userId)) ?? null;
      }
      if (entity === GuildResearchState) {
        return store.research.find((r) => whereMatches(r, where)) ?? null;
      }
      if (entity === GuildResearchContribution) {
        return (
          store.contribs.get(contribKey(where.researchStateId, where.userId)) ?? null
        );
      }
      return null;
    }) as any,
    find: jest.fn(async (entity: any, opts: any) => {
      const where = opts?.where ?? {};
      if (entity === GuildResearchState) {
        return store.research.filter((r) => whereMatches(r, where));
      }
      return [];
    }) as any,
    count: jest.fn(async (entity: any, opts: any) => {
      const where = opts?.where ?? {};
      if (entity === GuildResearchState) {
        return store.research.filter((r) => whereMatches(r, where)).length;
      }
      return 0;
    }) as any,
  };
  return m as EntityManager;
}

const repoMock = (store: Store, kind: 'research' | 'contribs') => ({
  find: jest.fn(async (opts: any = {}) => {
    const where = opts.where ?? {};
    if (kind === 'research') {
      return store.research.filter((r) => whereMatches(r, where));
    }
    return [...store.contribs.values()].filter((c) =>
      whereMatches(c, where),
    );
  }),
  findOne: jest.fn(async (opts: any) => {
    const where = opts?.where ?? {};
    if (kind === 'research') {
      if (where.id) return store.research.find((r) => r.id === where.id) ?? null;
      return store.research.find((r) => whereMatches(r, where)) ?? null;
    }
    return null;
  }),
  save: jest.fn(async (x) => x),
  create: jest.fn((x) => x),
});

async function makeService(store: Store) {
  const dataSource: Partial<DataSource> = {
    transaction: jest.fn(async (cb: any) => cb(buildManager(store))),
  };
  const researchRepo = repoMock(store, 'research');
  const contribRepo = repoMock(store, 'contribs');
  const emitter = { emit: jest.fn() };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GuildResearchService,
      { provide: getRepositoryToken(GuildResearchState), useValue: researchRepo },
      { provide: getRepositoryToken(GuildResearchContribution), useValue: contribRepo },
      { provide: EventEmitter2, useValue: emitter },
      { provide: DataSource, useValue: dataSource },
    ],
  }).compile();

  return {
    service: module.get(GuildResearchService),
    emitter,
    repos: { researchRepo, contribRepo },
  };
}

function seedGuild(store: Store, id = 'g1') {
  store.guilds.set(id, {
    id,
    name: 'Test',
    tag: 'TST',
    leaderId: 'leader',
    memberCount: 10,
    tierScore: 0,
    ageUnlockedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Guild);
}

function seedMember(store: Store, userId: string, role = GuildRole.MEMBER, guildId = 'g1') {
  store.members.set(memberKey(guildId, userId), {
    guildId,
    userId,
    role,
    contributionPts: 0,
    joinedAt: new Date(),
    lastActiveAt: new Date(),
  } as unknown as GuildMember);
}

describe('GuildResearchService', () => {
  describe('startResearch', () => {
    it('rejects unknown research id', async () => {
      const store = freshStore();
      seedGuild(store);
      seedMember(store, 'leader', GuildRole.LEADER);
      const { service } = await makeService(store);
      await expect(
        service.startResearch({
          guildId: 'g1',
          researchId: 'unknown',
          level: 1,
          selectedBy: 'leader',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects non-leader/officer selectors', async () => {
      const store = freshStore();
      seedGuild(store);
      seedMember(store, 'random', GuildRole.MEMBER);
      const { service } = await makeService(store);
      await expect(
        service.startResearch({
          guildId: 'g1',
          researchId: 'production_boost',
          level: 1,
          selectedBy: 'random',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects starting level 2 before level 1 completes', async () => {
      const store = freshStore();
      seedGuild(store);
      seedMember(store, 'leader', GuildRole.LEADER);
      const { service } = await makeService(store);
      await expect(
        service.startResearch({
          guildId: 'g1',
          researchId: 'production_boost',
          level: 2,
          selectedBy: 'leader',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('starts research, sets 7-day deadline, occupies a weekly slot', async () => {
      const store = freshStore();
      seedGuild(store);
      seedMember(store, 'leader', GuildRole.LEADER);
      const { service, emitter } = await makeService(store);

      const before = Date.now();
      const state = await service.startResearch({
        guildId: 'g1',
        researchId: 'production_boost',
        level: 1,
        selectedBy: 'leader',
      });

      expect(state.status).toBe(GuildResearchStatus.RESEARCHING);
      expect(state.branch).toBe(GuildResearchBranch.PRODUCTION);
      expect(state.xpRequired).toBe(100_000);
      expect(state.deadlineAt.getTime() - before).toBeGreaterThanOrEqual(
        7 * 24 * 60 * 60 * 1000 - 1000,
      );
      expect(emitter.emit).toHaveBeenCalledWith(
        TELEMETRY_GUILD_ACTIVITY,
        expect.objectContaining({
          payload: expect.objectContaining({ kind: 'research_started' }),
        }),
      );
    });

    it('enforces 3 weekly research slots', async () => {
      const store = freshStore();
      seedGuild(store);
      seedMember(store, 'leader', GuildRole.LEADER);
      const week = isoWeekStartUtc(new Date());
      // Fill all 3 slots with active research rows
      for (let i = 0; i < RESEARCH_WEEKLY_SLOTS; i++) {
        store.research.push({
          id: `s${i}`,
          guildId: 'g1',
          researchId: `filler_${i}`,
          branch: GuildResearchBranch.PRODUCTION,
          level: 1,
          status: GuildResearchStatus.RESEARCHING,
          xpRequired: 100_000,
          xpContributed: 0,
          slotWeekStart: week,
          startedAt: new Date(),
          deadlineAt: new Date(Date.now() + 7 * 86_400_000),
          completedAt: null,
          selectedBy: 'leader',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as GuildResearchState);
      }
      const { service } = await makeService(store);

      await expect(
        service.startResearch({
          guildId: 'g1',
          researchId: 'production_boost',
          level: 1,
          selectedBy: 'leader',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('contribute', () => {
    it('accepts xp, accumulates contribution, completes when full', async () => {
      const store = freshStore();
      seedGuild(store);
      seedMember(store, 'leader', GuildRole.LEADER);
      seedMember(store, 'u1');

      const state: GuildResearchState = {
        id: 's1',
        guildId: 'g1',
        researchId: 'production_boost',
        branch: GuildResearchBranch.PRODUCTION,
        level: 1,
        status: GuildResearchStatus.RESEARCHING,
        xpRequired: 100_000,
        xpContributed: 0,
        slotWeekStart: isoWeekStartUtc(new Date()),
        startedAt: new Date(),
        deadlineAt: new Date(Date.now() + 86_400_000 * 7),
        completedAt: null,
        selectedBy: 'leader',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as GuildResearchState;
      store.research.push(state);

      const { service, emitter } = await makeService(store);

      const r1 = await service.contribute({
        researchStateId: 's1',
        userId: 'u1',
        xp: 60_000,
      });
      expect(r1.completed).toBe(false);
      expect(r1.state.xpContributed).toBe(60_000);

      const r2 = await service.contribute({
        researchStateId: 's1',
        userId: 'u1',
        xp: 50_000, // overshoots — should clamp to remaining 40_000
      });
      expect(r2.completed).toBe(true);
      expect(r2.state.xpContributed).toBe(100_000);

      const completeEvent = emitter.emit.mock.calls.find(
        ([ch, env]: [string, any]) =>
          ch === TELEMETRY_GUILD_ACTIVITY && env.payload?.kind === 'research_complete',
      );
      expect(completeEvent).toBeDefined();
    });

    it('rejects contributors that are not in the guild', async () => {
      const store = freshStore();
      seedGuild(store);
      const state: GuildResearchState = {
        id: 's1',
        guildId: 'g1',
        researchId: 'raid_damage',
        branch: GuildResearchBranch.RAID,
        level: 1,
        status: GuildResearchStatus.RESEARCHING,
        xpRequired: 150_000,
        xpContributed: 0,
        slotWeekStart: isoWeekStartUtc(new Date()),
        startedAt: new Date(),
        deadlineAt: new Date(Date.now() + 86_400_000 * 7),
        completedAt: null,
        selectedBy: 'leader',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as GuildResearchState;
      store.research.push(state);
      const { service } = await makeService(store);

      await expect(
        service.contribute({ researchStateId: 's1', userId: 'stranger', xp: 1000 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects contributing to a completed research', async () => {
      const store = freshStore();
      seedGuild(store);
      seedMember(store, 'u1');
      const state: GuildResearchState = {
        id: 's1',
        guildId: 'g1',
        researchId: 'raid_damage',
        branch: GuildResearchBranch.RAID,
        level: 1,
        status: GuildResearchStatus.COMPLETED,
        xpRequired: 150_000,
        xpContributed: 150_000,
        slotWeekStart: isoWeekStartUtc(new Date()),
        startedAt: new Date(),
        deadlineAt: new Date(),
        completedAt: new Date(),
        selectedBy: 'leader',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as GuildResearchState;
      store.research.push(state);
      const { service } = await makeService(store);

      await expect(
        service.contribute({ researchStateId: 's1', userId: 'u1', xp: 1000 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getGuildBuffs', () => {
    it('composes production_pct, raid_damage_pct, member_capacity from completed research', async () => {
      const store = freshStore();
      seedGuild(store);
      const completed = (researchId: string, level: number, branch: GuildResearchBranch) =>
        ({
          id: `${researchId}-${level}`,
          guildId: 'g1',
          researchId,
          branch,
          level,
          status: GuildResearchStatus.COMPLETED,
          xpRequired: 100_000,
          xpContributed: 100_000,
          slotWeekStart: new Date(),
          startedAt: new Date(),
          deadlineAt: new Date(),
          completedAt: new Date(),
          selectedBy: 'leader',
          createdAt: new Date(),
          updatedAt: new Date(),
        }) as unknown as GuildResearchState;

      store.research.push(
        completed('production_boost', 1, GuildResearchBranch.PRODUCTION),
        completed('production_boost', 2, GuildResearchBranch.PRODUCTION),
        completed('raid_damage', 1, GuildResearchBranch.RAID),
        completed('member_capacity', 2, GuildResearchBranch.EXPANSION),
      );

      const { service } = await makeService(store);
      const buffs = await service.getGuildBuffs('g1');

      expect(buffs.productionPct).toBe(5 + 10); // L1 + L2
      expect(buffs.raidDamagePct).toBe(10);
      expect(buffs.memberCapacity).toBe(50); // L2
      expect(buffs.completedResearchIds).toContain('production_boost@1');
      expect(buffs.completedResearchIds).toContain('member_capacity@2');
    });

    it('returns the default member capacity when no expansion research is done', async () => {
      const store = freshStore();
      seedGuild(store);
      const { service } = await makeService(store);
      const buffs = await service.getGuildBuffs('g1');
      expect(buffs.memberCapacity).toBe(DEFAULT_MEMBER_CAPACITY);
      expect(buffs.productionPct).toBe(0);
      expect(buffs.raidDamagePct).toBe(0);
    });
  });

  describe('catalog', () => {
    it('exposes 3 branches, each with at least one level config', async () => {
      const store = freshStore();
      const { service } = await makeService(store);
      const catalog = service.catalog();
      const branches = new Set(catalog.map((c) => c.branch));
      expect(branches.size).toBe(3);
      catalog.forEach((c) => {
        expect(c.levels.length).toBeGreaterThanOrEqual(1);
        c.levels.forEach((l) => {
          expect(l.xpRequired).toBeGreaterThanOrEqual(100_000);
          expect(l.xpRequired).toBeLessThanOrEqual(500_000);
        });
      });
    });
  });

  describe('composeGuildBuffs (pure)', () => {
    it('member_capacity uses the highest tier, not additive', () => {
      const buffs = composeGuildBuffs([
        { researchId: 'member_capacity', level: 1 },
        { researchId: 'member_capacity', level: 3 },
      ]);
      expect(buffs.memberCapacity).toBe(70);
    });

    it('ignores unknown research entries gracefully', () => {
      const buffs = composeGuildBuffs([{ researchId: 'ghost', level: 99 }]);
      expect(buffs.memberCapacity).toBe(DEFAULT_MEMBER_CAPACITY);
      expect(buffs.completedResearchIds).toHaveLength(0);
    });
  });
});
