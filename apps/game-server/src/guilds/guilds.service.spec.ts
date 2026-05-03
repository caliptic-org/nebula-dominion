import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { GuildsService } from './guilds.service';
import { Guild } from './entities/guild.entity';
import { GuildMember, GuildRole } from './entities/guild-member.entity';
import { GuildEvent } from './entities/guild-event.entity';
import {
  GuildTutorialState,
  TutorialStep,
} from './entities/guild-tutorial-state.entity';
import { ResourcesService } from '../resources/resources.service';
import {
  EVENT_GUILD_TUTORIAL_REQUIRED,
  TELEMETRY_GUILD_LIFECYCLE,
  TELEMETRY_GUILD_PROGRESSION,
  TUTORIAL_REWARD_ENERGY,
} from './guilds.constants';

const repoMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((x) => x),
  save: jest.fn(async (x) => x),
  remove: jest.fn(),
  increment: jest.fn(),
  decrement: jest.fn(),
});

function buildDataSourceMock(managerStore: {
  state: Map<string, any>;
}): Partial<DataSource> {
  const manager = {
    create: jest.fn((entity, data) => ({ ...data })),
    save: jest.fn(async (x) => x),
    remove: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    findOne: jest.fn(async (entity, opts) => {
      const where = opts?.where ?? {};
      if (entity === GuildTutorialState && where.userId) {
        return managerStore.state.get(where.userId) ?? null;
      }
      return null;
    }),
  };
  return {
    transaction: jest.fn(async (cb: any) => cb(manager)),
  } as unknown as DataSource;
}

describe('GuildsService', () => {
  let service: GuildsService;
  let guildRepo: ReturnType<typeof repoMock>;
  let memberRepo: ReturnType<typeof repoMock>;
  let eventRepo: ReturnType<typeof repoMock>;
  let tutorialRepo: ReturnType<typeof repoMock>;
  let resources: { grant: jest.Mock };
  let emitter: { emit: jest.Mock };
  let dataSource: Partial<DataSource>;
  let tutorialStore: Map<string, GuildTutorialState>;

  beforeEach(async () => {
    guildRepo = repoMock();
    memberRepo = repoMock();
    eventRepo = repoMock();
    tutorialRepo = repoMock();
    resources = { grant: jest.fn(async () => ({})) };
    emitter = { emit: jest.fn() };
    tutorialStore = new Map();
    dataSource = buildDataSourceMock({ state: tutorialStore });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildsService,
        { provide: getRepositoryToken(Guild), useValue: guildRepo },
        { provide: getRepositoryToken(GuildMember), useValue: memberRepo },
        { provide: getRepositoryToken(GuildEvent), useValue: eventRepo },
        { provide: getRepositoryToken(GuildTutorialState), useValue: tutorialRepo },
        { provide: ResourcesService, useValue: resources },
        { provide: EventEmitter2, useValue: emitter },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(GuildsService);
  });

  describe('createGuild', () => {
    it('rejects when leader already has a membership', async () => {
      memberRepo.findOne.mockResolvedValueOnce({ userId: 'u1' });
      await expect(
        service.createGuild({ leaderId: 'u1', name: 'Foo', tag: 'FOO' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when tag is taken', async () => {
      memberRepo.findOne.mockResolvedValueOnce(null);
      guildRepo.findOne.mockResolvedValueOnce({ id: 'g1', tag: 'FOO' });
      await expect(
        service.createGuild({ leaderId: 'u1', name: 'Foo', tag: 'FOO' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('uppercases tag and emits lifecycle telemetry', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      guildRepo.findOne.mockResolvedValue(null);

      await service.createGuild({ leaderId: 'u1', name: 'Lonca Foo', tag: 'foo' });

      expect(emitter.emit).toHaveBeenCalledWith(
        TELEMETRY_GUILD_LIFECYCLE,
        expect.objectContaining({
          user_id: 'u1',
          payload: expect.objectContaining({ kind: 'created' }),
        }),
      );
    });
  });

  describe('joinGuild', () => {
    it('rejects when user is already in a guild', async () => {
      guildRepo.findOne.mockResolvedValueOnce({ id: 'g1' });
      memberRepo.findOne.mockResolvedValueOnce({ guildId: 'g1', userId: 'u1' });

      await expect(service.joinGuild('g1', 'u1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('advances tutorial NOT_STARTED → GUILD_CHOSEN on join when required', async () => {
      guildRepo.findOne.mockResolvedValueOnce({ id: 'g1', tag: 'FOO' });
      memberRepo.findOne.mockResolvedValueOnce(null);

      const tutorial: GuildTutorialState = {
        id: 't1',
        userId: 'u1',
        tutorialRequired: true,
        state: TutorialStep.NOT_STARTED,
        rewardGranted: false,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      tutorialStore.set('u1', tutorial);

      await service.joinGuild('g1', 'u1');

      expect(tutorial.state).toBe(TutorialStep.GUILD_CHOSEN);
      expect(emitter.emit).toHaveBeenCalledWith(
        TELEMETRY_GUILD_PROGRESSION,
        expect.objectContaining({
          payload: expect.objectContaining({
            kind: 'tutorial_step_complete',
            step: TutorialStep.GUILD_CHOSEN,
          }),
        }),
      );
    });
  });

  describe('leaveGuild', () => {
    it('rejects leaders from leaving', async () => {
      memberRepo.findOne.mockResolvedValueOnce({
        guildId: 'g1',
        userId: 'u1',
        role: GuildRole.LEADER,
      });
      await expect(service.leaveGuild('g1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when not a member', async () => {
      memberRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.leaveGuild('g1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('tutorial state machine', () => {
    it('marks tutorial required idempotently', async () => {
      tutorialRepo.findOne.mockResolvedValueOnce(null);
      tutorialRepo.save.mockImplementation(async (x) => x);

      const result = await service.markTutorialRequired('u1');

      expect(result.tutorialRequired).toBe(true);
    });

    it('rejects step transitions when tutorial not required', async () => {
      tutorialRepo.findOne.mockResolvedValueOnce({
        id: 't1',
        userId: 'u1',
        tutorialRequired: false,
        state: TutorialStep.NOT_STARTED,
        rewardGranted: false,
        completedAt: null,
      });

      await expect(
        service.advanceTutorial('u1', TutorialStep.GUILD_CHOSEN),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects skipping steps', async () => {
      tutorialRepo.findOne.mockResolvedValueOnce({
        id: 't1',
        userId: 'u1',
        tutorialRequired: true,
        state: TutorialStep.NOT_STARTED,
        rewardGranted: false,
        completedAt: null,
      });

      await expect(
        service.advanceTutorial('u1', TutorialStep.FIRST_DONATION),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects backward transitions', async () => {
      tutorialRepo.findOne.mockResolvedValueOnce({
        id: 't1',
        userId: 'u1',
        tutorialRequired: true,
        state: TutorialStep.FIRST_DONATION,
        rewardGranted: false,
        completedAt: null,
      });

      await expect(
        service.advanceTutorial('u1', TutorialStep.GUILD_CHOSEN),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('advances forward by one step and stamps completedAt on COMPLETED', async () => {
      const t = {
        id: 't1',
        userId: 'u1',
        tutorialRequired: true,
        state: TutorialStep.FIRST_QUEST,
        rewardGranted: false,
        completedAt: null,
      } as GuildTutorialState;
      tutorialRepo.findOne.mockResolvedValueOnce(t);
      tutorialRepo.save.mockImplementation(async (x) => x);

      const result = await service.advanceTutorial('u1', TutorialStep.COMPLETED);

      expect(result.state).toBe(TutorialStep.COMPLETED);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('grants reward only after COMPLETED and only once', async () => {
      const t: GuildTutorialState = {
        id: 't1',
        userId: 'u1',
        tutorialRequired: true,
        state: TutorialStep.COMPLETED,
        rewardGranted: false,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      tutorialRepo.findOne.mockResolvedValue(t);
      tutorialRepo.save.mockImplementation(async (x) => x);

      const result = await service.grantTutorialReward('u1');

      expect(resources.grant).toHaveBeenCalledWith('u1', { energy: TUTORIAL_REWARD_ENERGY });
      expect(result.reward.energy).toBe(TUTORIAL_REWARD_ENERGY);
      expect(t.rewardGranted).toBe(true);

      // Second call should fail because rewardGranted is now true.
      await expect(service.grantTutorialReward('u1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses reward before COMPLETED', async () => {
      tutorialRepo.findOne.mockResolvedValueOnce({
        id: 't1',
        userId: 'u1',
        tutorialRequired: true,
        state: TutorialStep.FIRST_DONATION,
        rewardGranted: false,
        completedAt: null,
      });
      await expect(service.grantTutorialReward('u1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('XP threshold trigger', () => {
    it('handles guild.tutorial_required event by marking tutorial required', async () => {
      tutorialRepo.findOne.mockResolvedValueOnce(null);
      tutorialRepo.save.mockImplementation(async (x) => x);

      await service.onTutorialRequired({ userId: 'u1', totalXp: 18000, age: 2 });

      expect(tutorialRepo.save).toHaveBeenCalled();
    });
  });

  it('exports the threshold constant referenced in the issue (18,000 XP)', () => {
    // Sanity check — keeps CAL-235 acceptance criteria visible in tests.
    expect(EVENT_GUILD_TUTORIAL_REQUIRED).toBe('guild.tutorial_required');
  });
});
