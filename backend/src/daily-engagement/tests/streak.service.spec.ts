import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StreakService } from '../streak.service';
import { PlayerWalletService } from '../player-wallet.service';
import { LoginStreak } from '../entities/login-streak.entity';
import { StreakRewardType } from '../types/daily-engagement.types';

const TODAY = '2026-05-03';
const YESTERDAY = '2026-05-02';
const TWO_DAYS_AGO = '2026-05-01';
const THREE_DAYS_AGO = '2026-04-30';

const makeStreak = (overrides: Partial<LoginStreak> = {}): LoginStreak =>
  Object.assign(new LoginStreak(), {
    id: 'streak-1',
    playerId: 'player-1',
    currentStreak: 0,
    longestStreak: 0,
    lastLoginDate: null,
    streakStartDate: null,
    gracePeriodUsed: false,
    pendingRewards: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('StreakService', () => {
  let service: StreakService;
  let streakRepo: jest.Mocked<{
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  }>;
  let walletService: jest.Mocked<PlayerWalletService>;

  beforeEach(async () => {
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(`${TODAY}T00:00:00.000Z`);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreakService,
        {
          provide: getRepositoryToken(LoginStreak),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: PlayerWalletService,
          useValue: {
            creditReward: jest.fn().mockResolvedValue({}),
            creditBundle: jest.fn().mockResolvedValue({}),
            getOrCreate: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get(StreakService);
    streakRepo = module.get(getRepositoryToken(LoginStreak));
    walletService = module.get(PlayerWalletService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── recordLogin ──────────────────────────────────────────────────────────

  describe('recordLogin', () => {
    it('1. first login ever sets streak to 1 and schedules a day-1 reward', async () => {
      const blank = makeStreak({ lastLoginDate: null });
      streakRepo.findOne.mockResolvedValue(blank);
      streakRepo.save.mockImplementation(async (s) => s as LoginStreak);

      const result = await service.recordLogin('player-1');

      expect(result.newStreakDay).toBe(true);
      expect(result.streakBroken).toBe(false);
      expect(result.currentDay).toBe(1);
      expect(result.streak.pendingRewards).toHaveLength(1);
      expect(result.streak.pendingRewards[0].claimed).toBe(false);
    });

    it('2. consecutive day increments streak', async () => {
      const streak = makeStreak({ currentStreak: 3, lastLoginDate: YESTERDAY, longestStreak: 3 });
      streakRepo.findOne.mockResolvedValue(streak);
      streakRepo.save.mockImplementation(async (s) => s as LoginStreak);

      const result = await service.recordLogin('player-1');

      expect(result.newStreakDay).toBe(true);
      expect(result.currentDay).toBe(4);
      expect(result.streakBroken).toBe(false);
    });

    it('3. missed exactly 1 day with unused grace continues streak and marks grace used', async () => {
      const streak = makeStreak({ currentStreak: 2, lastLoginDate: TWO_DAYS_AGO, gracePeriodUsed: false });
      streakRepo.findOne.mockResolvedValue(streak);
      streakRepo.save.mockImplementation(async (s) => s as LoginStreak);

      const result = await service.recordLogin('player-1');

      expect(result.newStreakDay).toBe(true);
      expect(result.currentDay).toBe(3);
      expect(result.streak.gracePeriodUsed).toBe(true);
    });

    it('4. missed exactly 1 day with grace already used breaks streak', async () => {
      const streak = makeStreak({ currentStreak: 5, lastLoginDate: TWO_DAYS_AGO, gracePeriodUsed: true });
      streakRepo.findOne.mockResolvedValue(streak);
      streakRepo.save.mockImplementation(async (s) => s as LoginStreak);

      const result = await service.recordLogin('player-1');

      expect(result.streakBroken).toBe(true);
      expect(result.currentDay).toBe(1);
    });

    it('5. missed 2+ days breaks streak and resets to 1', async () => {
      const streak = makeStreak({ currentStreak: 7, lastLoginDate: THREE_DAYS_AGO, gracePeriodUsed: false });
      streakRepo.findOne.mockResolvedValue(streak);
      streakRepo.save.mockImplementation(async (s) => s as LoginStreak);

      const result = await service.recordLogin('player-1');

      expect(result.streakBroken).toBe(true);
      expect(result.currentDay).toBe(1);
    });

    it('6. same-day login is idempotent — returns newStreakDay=false without saving', async () => {
      const streak = makeStreak({ currentStreak: 3, lastLoginDate: TODAY });
      streakRepo.findOne.mockResolvedValue(streak);

      const result = await service.recordLogin('player-1');

      expect(result.newStreakDay).toBe(false);
      expect(streakRepo.save).not.toHaveBeenCalled();
    });

    it('7. pending reward is added for each new streak day', async () => {
      const streak = makeStreak({ currentStreak: 0, lastLoginDate: null, pendingRewards: [] });
      streakRepo.findOne.mockResolvedValue(streak);
      streakRepo.save.mockImplementation(async (s) => s as LoginStreak);

      const result = await service.recordLogin('player-1');

      expect(result.streak.pendingRewards).toHaveLength(1);
      expect(result.streak.pendingRewards[0].day).toBe(1);
    });

    it('8. 7-day cycle wraps: day 8 reward equals day-1 reward type', async () => {
      const streak = makeStreak({ currentStreak: 7, lastLoginDate: YESTERDAY, longestStreak: 7 });
      streakRepo.findOne.mockResolvedValue(streak);
      streakRepo.save.mockImplementation(async (s) => s as LoginStreak);

      const result = await service.recordLogin('player-1');

      // day 8 → cycle day = ((8-1) % 7) + 1 = 1 → RESOURCES 100
      const reward = result.streak.pendingRewards.find((r) => r.day === 8);
      expect(reward).toBeDefined();
      expect(reward!.type).toBe(StreakRewardType.RESOURCES);
      expect(reward!.amount).toBe(100);
    });

    it('9. longestStreak is updated when current exceeds it', async () => {
      const streak = makeStreak({ currentStreak: 5, longestStreak: 5, lastLoginDate: YESTERDAY });
      streakRepo.findOne.mockResolvedValue(streak);
      streakRepo.save.mockImplementation(async (s) => s as LoginStreak);

      const result = await service.recordLogin('player-1');

      expect(result.streak.longestStreak).toBe(6);
    });
  });

  // ─── claimReward ──────────────────────────────────────────────────────────

  describe('claimReward', () => {
    it('10. successfully claims an unclaimed reward and credits the wallet', async () => {
      const pendingReward = {
        day: 3,
        type: StreakRewardType.RARE_UNIT_SHARD,
        amount: 1,
        claimed: false,
      };
      const streak = makeStreak({ pendingRewards: [pendingReward] });
      streakRepo.findOne.mockResolvedValue(streak);
      streakRepo.save.mockImplementation(async (s) => s as LoginStreak);

      const result = await service.claimReward('player-1', 3);

      expect(walletService.creditReward).toHaveBeenCalledWith(
        'player-1',
        StreakRewardType.RARE_UNIT_SHARD,
        1,
      );
      expect(result.claimed).toBe(true);
      expect(result.claimedAt).toBeDefined();
    });

    it('11. wallet is credited BEFORE claim status is persisted', async () => {
      const callOrder: string[] = [];
      const pendingReward = { day: 1, type: StreakRewardType.RESOURCES, amount: 100, claimed: false };
      const streak = makeStreak({ pendingRewards: [pendingReward] });
      streakRepo.findOne.mockResolvedValue(streak);
      walletService.creditReward.mockImplementation(async () => {
        callOrder.push('wallet');
        return {} as any;
      });
      streakRepo.save.mockImplementation(async (s) => {
        callOrder.push('db');
        return s as LoginStreak;
      });

      await service.claimReward('player-1', 1);

      expect(callOrder[0]).toBe('wallet');
      expect(callOrder[1]).toBe('db');
    });

    it('12. throws BadRequestException when reward already claimed', async () => {
      const claimedReward = { day: 2, type: StreakRewardType.RESOURCES, amount: 150, claimed: true };
      const streak = makeStreak({ pendingRewards: [claimedReward] });
      streakRepo.findOne.mockResolvedValue(streak);

      await expect(service.claimReward('player-1', 2)).rejects.toThrow(BadRequestException);
      expect(walletService.creditReward).not.toHaveBeenCalled();
    });

    it('13. throws NotFoundException when player has no streak record', async () => {
      streakRepo.findOne.mockResolvedValue(null);

      await expect(service.claimReward('unknown-player', 1)).rejects.toThrow(NotFoundException);
    });
  });
});
