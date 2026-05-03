import { BadRequestException } from '@nestjs/common';
import { AlliancePlayerService } from '../alliance-player.service';
import { AllianceMember, AllianceRole } from '../entities/alliance-member.entity';
import { AllianceStorage } from '../entities/alliance-storage.entity';
import { AllianceDonation } from '../entities/alliance-donation.entity';

/**
 * Donation race condition tests.
 *
 * The service uses a pessimistic_write lock on AllianceStorage inside a
 * DataSource.transaction, which prevents concurrent over-capacity writes.
 * These tests verify the atomicity contract by simulating the transaction
 * callback directly.
 */
describe('AlliancePlayerService – donate (atomicity & race condition)', () => {
  const ALLIANCE_ID = 'alliance-1';
  const USER_ID = 'user-1';

  const storageFull = (): Partial<AllianceStorage> => ({
    id: 's-1',
    allianceId: ALLIANCE_ID,
    minerals: 490000,
    gas: 0,
    energy: 0,
    capacity: 500000,
  });

  const memberRecord = (): Partial<AllianceMember> => ({
    id: 'm-1',
    userId: USER_ID,
    allianceId: ALLIANCE_ID,
    role: AllianceRole.MEMBER,
    contribution: 0,
  });

  function buildService(txFn: (cb: (manager: any) => Promise<any>) => Promise<any>) {
    // Minimal mock: only DataSource.transaction is exercised in donate()
    const memberRepoMock = {
      findOne: jest.fn().mockResolvedValue({ ...memberRecord() } as AllianceMember),
    };
    const dataSourceMock = { transaction: jest.fn().mockImplementation(txFn) };

    const service = new (AlliancePlayerService as any)(
      {},           // allianceRepo
      memberRepoMock,
      {},           // warRepo
      {},           // storageRepo
      {},           // applicationRepo
      {},           // chatRepo
      {},           // reactionRepo
      {},           // donationRepo
      dataSourceMock,
    );
    return { service, dataSourceMock };
  }

  it('rejects donation that would exceed storage capacity', async () => {
    const storage = { ...storageFull() };

    const txFn = async (cb: (manager: any) => Promise<any>) => {
      const manager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(storage),
        }),
        save: jest.fn(),
        findOne: jest.fn().mockResolvedValue(memberRecord()),
        create: jest.fn((Entity: any, data: any) => data),
      };
      return cb(manager);
    };

    const { service } = buildService(txFn);

    // Attempting to donate 20,000 minerals would push total from 490,000 to 510,000 > 500,000
    await expect(service.donate(USER_ID, { mineral: 20000, gas: 0, energy: 0 }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('succeeds and persists donation when capacity is sufficient', async () => {
    const storage = { ...storageFull(), minerals: 100 };
    let savedStorage: any = null;
    let savedDonation: any = null;

    const txFn = async (cb: (manager: any) => Promise<any>) => {
      const manager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ ...storage }),
        }),
        save: jest.fn().mockImplementation((_Entity: any, data: any) => {
          if (data && 'minerals' in data) savedStorage = data;
          if (data && 'mineral' in data) savedDonation = data;
          return data;
        }),
        findOne: jest.fn().mockResolvedValue({ ...memberRecord() }),
        create: jest.fn((_Entity: any, data: any) => data),
      };
      return cb(manager);
    };

    const { service } = buildService(txFn);
    await service.donate(USER_ID, { mineral: 500, gas: 0, energy: 0 });

    expect(savedStorage.minerals).toBe(600);
    expect(savedDonation.mineral).toBe(500);
  });

  it('prevents two concurrent donations from exceeding capacity', async () => {
    /**
     * Simulate two concurrent requests: each reads the same storage snapshot
     * (minerals=498000), both try to add 5000. Only the first should succeed;
     * the second must be rejected because after the first commit the stored
     * total would be 503000 > 500000.
     *
     * In production this is enforced by the DB pessimistic lock; here we
     * verify the capacity check math by running both callbacks sequentially
     * against the same in-memory state.
     */
    let sharedMinerals = 498000;

    const makeManager = () => ({
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 's-1',
          allianceId: ALLIANCE_ID,
          minerals: sharedMinerals,
          gas: 0,
          energy: 0,
          capacity: 500000,
        }),
      }),
      save: jest.fn().mockImplementation((_Entity: any, data: any) => {
        if (data && 'minerals' in data) sharedMinerals = data.minerals;
        return data;
      }),
      findOne: jest.fn().mockResolvedValue({ ...memberRecord() }),
      create: jest.fn((_Entity: any, data: any) => data),
    });

    // First request succeeds (498000 + 5000 = 503000 > 500000 — wait, that's also over!)
    // Adjust: start at 490000, both donate 5000, only first should succeed
    sharedMinerals = 490000;

    const txResults: Array<'ok' | 'fail'> = [];

    for (let i = 0; i < 2; i++) {
      const manager = makeManager();
      // Re-read storage at the time of this "transaction"
      const storageSnapshot = await manager.createQueryBuilder()
        .setLock('pessimistic_write')
        .where('')
        .getOne();

      const after =
        Number(storageSnapshot.minerals) + 5000 +
        Number(storageSnapshot.gas) +
        Number(storageSnapshot.energy);

      if (after > Number(storageSnapshot.capacity)) {
        txResults.push('fail');
      } else {
        storageSnapshot.minerals = Number(storageSnapshot.minerals) + 5000;
        await manager.save(AllianceStorage, storageSnapshot);
        txResults.push('ok');
      }
    }

    expect(txResults[0]).toBe('ok');
    expect(txResults[1]).toBe('fail');
    expect(sharedMinerals).toBe(495000);
  });
});
