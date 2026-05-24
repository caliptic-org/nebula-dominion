import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MergePreviewService } from './merge-preview.service';
import { Unit } from './entities/unit.entity';
import { NDRaceKey, ND_RACE_KEYS } from './data/nd-races';

type MockRepo = Pick<Repository<Unit>, 'findOne'>;

function placeholderSlots(race: NDRaceKey, tier: number) {
  return [0, 1, 2].map((i) => ({
    slotIndex: i,
    unitId: `${race}-${tier}-${i}`,
  }));
}

describe('MergePreviewService', () => {
  let service: MergePreviewService;
  let unitRepo: jest.Mocked<MockRepo>;
  const userId = 'user-1';

  beforeEach(async () => {
    unitRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MergePreviewService,
        { provide: getRepositoryToken(Unit), useValue: unitRepo },
      ],
    }).compile();

    service = module.get<MergePreviewService>(MergePreviewService);
  });

  it.each(ND_RACE_KEYS as ReadonlyArray<NDRaceKey>)(
    'returns canMerge=true for a legal 3×T3 → T4 recipe for %s',
    async (race) => {
      const slots = placeholderSlots(race, 3);
      const res = await service.preview(userId, { race, slots });

      expect(res.canMerge).toBe(true);
      expect(res.resultTier).toBe(4);
      expect(res.resultUnitId).toMatch(new RegExp(`^${race}-4-merge-`));
      expect(res.consumed).toEqual(slots.map((s) => s.unitId));
      expect(res.costs.resourceA).toBe(300);
      expect(res.costs.resourceB).toBe(600);
      expect(res.costs.crystal).toBeUndefined();
      expect(res.reasons).toBeUndefined();
    },
  );

  it('attaches crystal cost when source tier >= 4', async () => {
    const slots = placeholderSlots('insan', 4);
    const res = await service.preview(userId, { race: 'insan', slots });

    expect(res.canMerge).toBe(true);
    expect(res.resultTier).toBe(5);
    expect(res.costs.crystal).toBe(1);
  });

  it('returns canMerge=false with maxTier reason at tier 5', async () => {
    const slots = placeholderSlots('insan', 5);
    const res = await service.preview(userId, { race: 'insan', slots });

    expect(res.canMerge).toBe(false);
    expect(res.resultTier).toBeNull();
    expect(res.resultUnitId).toBeNull();
    expect(res.reasons).toContain('merge.error.maxTier');
    expect(res.consumed).toEqual([]);
  });

  it('returns canMerge=false with mixedTier reason when slot tiers differ', async () => {
    const slots = [
      { slotIndex: 0, unitId: 'insan-3-a' },
      { slotIndex: 1, unitId: 'insan-3-b' },
      { slotIndex: 2, unitId: 'insan-2-c' },
    ];
    const res = await service.preview(userId, { race: 'insan', slots });

    expect(res.canMerge).toBe(false);
    expect(res.reasons).toContain('merge.error.mixedTier');
  });

  it('returns canMerge=false with duplicateUnit reason for repeated unitIds', async () => {
    const slots = [
      { slotIndex: 0, unitId: 'insan-3-a' },
      { slotIndex: 1, unitId: 'insan-3-a' },
      { slotIndex: 2, unitId: 'insan-3-b' },
    ];
    const res = await service.preview(userId, { race: 'insan', slots });

    expect(res.canMerge).toBe(false);
    expect(res.reasons).toContain('merge.error.duplicateUnit');
  });

  it('throws 403 when a placeholder unitId belongs to a different race than the request', async () => {
    const slots = [
      { slotIndex: 0, unitId: 'zerg-3-a' },
      { slotIndex: 1, unitId: 'insan-3-b' },
      { slotIndex: 2, unitId: 'insan-3-c' },
    ];
    await expect(
      service.preview(userId, { race: 'insan', slots }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws 404 for an unparseable unitId', async () => {
    const slots = [
      { slotIndex: 0, unitId: 'garbage_token' },
      { slotIndex: 1, unitId: 'insan-3-b' },
      { slotIndex: 2, unitId: 'insan-3-c' },
    ];
    await expect(
      service.preview(userId, { race: 'insan', slots }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws 403 when a UUID-shaped unitId resolves to a unit owned by another player', async () => {
    const otherUserUnitId = '11111111-2222-3333-4444-555555555555';
    unitRepo.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.id === otherUserUnitId) {
        return {
          id: otherUserUnitId,
          level: 3,
          game: { ownerId: 'someone-else' },
        } as unknown as Unit;
      }
      return null;
    });
    const slots = [
      { slotIndex: 0, unitId: otherUserUnitId },
      { slotIndex: 1, unitId: 'insan-3-b' },
      { slotIndex: 2, unitId: 'insan-3-c' },
    ];
    await expect(
      service.preview(userId, { race: 'insan', slots }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
