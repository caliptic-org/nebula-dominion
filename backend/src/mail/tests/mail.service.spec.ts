import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { MailService } from '../mail.service';
import { Mail, MailType, MailReward } from '../entities/mail.entity';
import { ResourceType } from '../../resources/entities/resource-config.entity';

// ── Factories ──────────────────────────────────────────────────────────────────

function makeMail(overrides: Partial<Mail> = {}): Mail {
  const m = new Mail();
  m.id = 'mail-1';
  m.userId = 'user-1';
  m.type = MailType.SYSTEM;
  m.title = 'Test Mail';
  m.body = 'Hello';
  m.sender = 'System';
  m.isRead = false;
  m.sentAt = new Date('2026-01-01T00:00:00Z');
  m.expiresAt = null;
  m.rewards = null;
  m.rewardsClaimed = false;
  m.rewardsClaimedAt = null;
  m.deletedAt = null;
  m.createdAt = new Date('2026-01-01T00:00:00Z');
  m.updatedAt = new Date('2026-01-01T00:00:00Z');
  return Object.assign(m, overrides);
}

function makeQb(getManyAndCountResult: [Mail[], number] = [[], 0]) {
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(getManyAndCountResult),
  };
  return qb;
}

function makeRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    findOne: jest.fn(),
    create: jest.fn((v) => ({ ...v })),
    save: jest.fn(async (v) => ({ ...v })),
    createQueryBuilder: jest.fn(() => makeQb()),
    ...overrides,
  };
}

function makeEntityManager(mailResult: Mail | null, resourceResult: any = null) {
  const mailQb = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(mailResult),
  };
  const resourceQb = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(resourceResult),
  };
  let callCount = 0;
  return {
    createQueryBuilder: jest.fn(() => (callCount++ === 0 ? mailQb : resourceQb)),
    create: jest.fn((_entity: unknown, data: object) => ({ ...data })),
    save: jest.fn(async (v) => ({ ...v })),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('MailService', () => {
  let service: MailService;
  let mailRepo: ReturnType<typeof makeRepo>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(() => {
    mailRepo = makeRepo();
    dataSource = { transaction: jest.fn() };
    service = new MailService(mailRepo as any, dataSource as any);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list — posta listesi yükleniyor', () => {
    it('döndürülen liste doğru sayfalama alanları içeriyor', async () => {
      const mails = [makeMail(), makeMail({ id: 'mail-2' })];
      const qb = makeQb([mails, 2]);
      mailRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.list({ userId: 'user-1', page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('boş posta kutusu için totalPages 0 döner', async () => {
      const qb = makeQb([[], 0]);
      mailRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.list({ userId: 'user-1' });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('varsayılan sayfa 1 ve limit 20 olarak uygulanıyor', async () => {
      const qb = makeQb([[], 0]);
      mailRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.list({ userId: 'user-1' });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('limit 100 ile sınırlandırılıyor', async () => {
      const qb = makeQb([[], 0]);
      mailRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.list({ userId: 'user-1', limit: 999 });

      expect(result.limit).toBe(100);
    });

    it('tip filtresiyle andWhere çağrılıyor', async () => {
      const qb = makeQb([[], 0]);
      mailRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list({ userId: 'user-1', type: MailType.GUILD });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('type'),
        expect.objectContaining({ type: MailType.GUILD }),
      );
    });

    it('isRead filtresi false olarak uygulanıyor', async () => {
      const qb = makeQb([[], 0]);
      mailRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list({ userId: 'user-1', isRead: false });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('is_read'),
        expect.objectContaining({ isRead: false }),
      );
    });

    it('ikinci sayfada skip (page-1)*limit kadar atlanıyor', async () => {
      const qb = makeQb([[], 0]);
      mailRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list({ userId: 'user-1', page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20);
    });
  });

  // ─── markRead ──────────────────────────────────────────────────────────────

  describe('markRead — okundu işaretleme', () => {
    it('okunmamış posta okundu olarak işaretleniyor', async () => {
      const mail = makeMail({ isRead: false });
      mailRepo.findOne.mockResolvedValue(mail);
      mailRepo.save.mockResolvedValue({ ...mail, isRead: true });

      const result = await service.markRead('mail-1', 'user-1');

      expect(mailRepo.save).toHaveBeenCalled();
      expect(result.isRead).toBe(true);
    });

    it('zaten okunmuş postada save çağrılmıyor (idempotent)', async () => {
      const mail = makeMail({ isRead: true });
      mailRepo.findOne.mockResolvedValue(mail);

      const result = await service.markRead('mail-1', 'user-1');

      expect(mailRepo.save).not.toHaveBeenCalled();
      expect(result.isRead).toBe(true);
    });

    it('posta bulunamazsa NotFoundException fırlatıyor', async () => {
      mailRepo.findOne.mockResolvedValue(null);

      await expect(service.markRead('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it("başka kullanıcının postası için ForbiddenException fırlatıyor", async () => {
      mailRepo.findOne.mockResolvedValue(makeMail({ userId: 'other-user' }));

      await expect(service.markRead('mail-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── claim ─────────────────────────────────────────────────────────────────

  describe('claim — ödüllü posta talep etme', () => {
    it('geçerli ödüllü postada kaynaklar güncelleniyor', async () => {
      const rewards: MailReward[] = [
        { type: ResourceType.MINERAL, label: '100 Mineral', amount: 100, icon: '' },
      ];
      const mail = makeMail({ rewards, rewardsClaimed: false });
      const em = makeEntityManager(mail);

      dataSource.transaction.mockImplementation(async (cb: Function) => cb(em));

      const result = await service.claim('mail-1', 'user-1');

      expect(em.save).toHaveBeenCalled();
      expect(result.rewardsClaimed).toBe(true);
    });

    it('süresi dolmuş postada GoneException fırlatıyor', async () => {
      const mail = makeMail({
        rewards: [{ type: ResourceType.GAS, label: '50 Gas', amount: 50, icon: '' }],
        expiresAt: new Date(Date.now() - 1000),
      });
      const em = makeEntityManager(mail);
      dataSource.transaction.mockImplementation(async (cb: Function) => cb(em));

      await expect(service.claim('mail-1', 'user-1')).rejects.toThrow(GoneException);
    });

    it('ödül zaten talep edilmişse ConflictException fırlatıyor', async () => {
      const mail = makeMail({
        rewards: [{ type: ResourceType.ENERGY, label: '200 Energy', amount: 200, icon: '' }],
        rewardsClaimed: true,
      });
      const em = makeEntityManager(mail);
      dataSource.transaction.mockImplementation(async (cb: Function) => cb(em));

      await expect(service.claim('mail-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('ödülsüz postada ConflictException fırlatıyor', async () => {
      const mail = makeMail({ rewards: null });
      const em = makeEntityManager(mail);
      dataSource.transaction.mockImplementation(async (cb: Function) => cb(em));

      await expect(service.claim('mail-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('posta bulunamazsa NotFoundException fırlatıyor', async () => {
      const em = makeEntityManager(null);
      dataSource.transaction.mockImplementation(async (cb: Function) => cb(em));

      await expect(service.claim('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it("başka kullanıcının postasında ForbiddenException fırlatıyor", async () => {
      const mail = makeMail({
        userId: 'other-user',
        rewards: [{ type: ResourceType.MINERAL, label: '50 Mineral', amount: 50, icon: '' }],
      });
      const em = makeEntityManager(mail);
      dataSource.transaction.mockImplementation(async (cb: Function) => cb(em));

      await expect(service.claim('mail-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('mevcut kaynağa ekleme yapılıyor', async () => {
      const rewards: MailReward[] = [
        { type: ResourceType.MINERAL, label: '100 Mineral', amount: 100, icon: '' },
      ];
      const mail = makeMail({ rewards, rewardsClaimed: false });
      const existingResource = { playerId: 'user-1', resourceType: ResourceType.MINERAL, amount: 500 };
      const em = makeEntityManager(mail, existingResource);
      dataSource.transaction.mockImplementation(async (cb: Function) => cb(em));

      await service.claim('mail-1', 'user-1');

      expect(em.save).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 600 }),
      );
    });

    it('sıfır miktarlı ödül atlanıyor', async () => {
      const rewards: MailReward[] = [
        { type: ResourceType.MINERAL, label: '0 Mineral', amount: 0, icon: '' },
        { type: ResourceType.GAS, label: '50 Gas', amount: 50, icon: '' },
      ];
      const mail = makeMail({ rewards, rewardsClaimed: false });
      const em = makeEntityManager(mail);
      dataSource.transaction.mockImplementation(async (cb: Function) => cb(em));

      await service.claim('mail-1', 'user-1');

      // createQueryBuilder called only once for mail + once for gas (mineral skipped)
      expect(em.createQueryBuilder).toHaveBeenCalledTimes(2);
    });

    it('silinmiş postada NotFoundException fırlatıyor', async () => {
      const mail = makeMail({ deletedAt: new Date() });
      const em = makeEntityManager(mail);
      dataSource.transaction.mockImplementation(async (cb: Function) => cb(em));

      await expect(service.claim('mail-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
