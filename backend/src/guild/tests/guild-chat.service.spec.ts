import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { GuildChatService, ROLLING_WINDOW_SIZE, MESSAGE_COOLDOWN_SECONDS, MESSAGES_PER_MINUTE_LIMIT } from '../guild-chat.service';
import { ChatMessage } from '../entities/chat-message.entity';

// ── Factories ──────────────────────────────────────────────────────────────────

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  const m = new ChatMessage();
  m.id = `msg-${Math.random().toString(36).slice(2)}`;
  m.guildId = 'guild-1';
  m.userId = 'user-1';
  m.content = 'Hello guild!';
  m.filtered = false;
  m.createdAt = new Date('2026-05-03T10:00:00Z');
  return Object.assign(m, overrides);
}

function makeMuteQb(muteResult: any = null) {
  return {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(muteResult),
  };
}

function makeMessageRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((v) => ({ ...v, id: 'saved-msg-1', createdAt: new Date() })),
    save: jest.fn(async (v) => ({ ...v, id: v.id ?? 'saved-msg-1', createdAt: v.createdAt ?? new Date() })),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(() => ({
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    })),
    ...overrides,
  };
}

function makeMuteRepo(mute: any = null) {
  return {
    createQueryBuilder: jest.fn(() => makeMuteQb(mute)),
  };
}

function makeEventRepo() {
  return {
    create: jest.fn((v) => ({ ...v })),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function makeRedis(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    setnx: jest.fn().mockResolvedValue(true),
    incrWithExpire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(60),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeService(overrides: {
  messageRepo?: any;
  muteRepo?: any;
  eventRepo?: any;
  profanity?: any;
  contribution?: any;
  membership?: any;
  redis?: any;
  analytics?: any;
} = {}) {
  const messageRepo = overrides.messageRepo ?? makeMessageRepo();
  const muteRepo = overrides.muteRepo ?? makeMuteRepo();
  const eventRepo = overrides.eventRepo ?? makeEventRepo();
  const profanity = overrides.profanity ?? {
    filter: jest.fn(async (content: string) => ({ clean: content, filtered: false })),
  };
  const contribution = overrides.contribution ?? { addChatMessage: jest.fn().mockResolvedValue(undefined) };
  const membership = overrides.membership ?? { getMember: jest.fn().mockResolvedValue({ guildId: 'guild-1', userId: 'user-1' }) };
  const redis = overrides.redis ?? makeRedis();
  const analytics = overrides.analytics ?? { trackServer: jest.fn().mockResolvedValue(undefined) };

  return {
    service: new GuildChatService(
      messageRepo,
      muteRepo as any,
      eventRepo as any,
      profanity as any,
      contribution as any,
      membership as any,
      redis as any,
      analytics as any,
    ),
    messageRepo,
    muteRepo,
    eventRepo,
    profanity,
    contribution,
    membership,
    redis,
    analytics,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GuildChatService', () => {

  // ─── sendMessage — mesaj gönderme ─────────────────────────────────────────

  describe('sendMessage — mesaj gönderme', () => {
    it('başarılı mesaj gönderiminde ChatMessageView döner', async () => {
      const { service } = makeService();

      const result = await service.sendMessage('user-1', 'Hello guild!');

      expect(result.guildId).toBe('guild-1');
      expect(result.userId).toBe('user-1');
      expect(result.content).toBe('Hello guild!');
      expect(typeof result.createdAt).toBe('string');
    });

    it('mesaj kaydedilip katkı servisi çağrılıyor', async () => {
      const { service, contribution } = makeService();

      await service.sendMessage('user-1', 'Test message');

      expect(contribution.addChatMessage).toHaveBeenCalledWith('guild-1', 'user-1');
    });

    it('profanity filtresi tetiklenmiş içerik filtered=true olarak kaydediliyor', async () => {
      const messageRepo = makeMessageRepo();
      const profanity = {
        filter: jest.fn().mockResolvedValue({ clean: '*** word', filtered: true }),
      };
      const { service } = makeService({ messageRepo, profanity });

      const result = await service.sendMessage('user-1', 'bad word');

      expect(result.filtered).toBe(true);
      expect(result.content).toBe('*** word');
    });

    it('boş içerik ile mesaj gönderilince BAD_REQUEST fırlatıyor', async () => {
      const { service } = makeService();

      await expect(service.sendMessage('user-1', '   ')).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST }),
      );
    });

    it('susturulmuş kullanıcı mesaj gönderemez — ForbiddenException', async () => {
      const muteRepo = makeMuteRepo({
        expiresAt: new Date(Date.now() + 60_000),
      });
      const { service } = makeService({ muteRepo });

      await expect(service.sendMessage('user-1', 'Hello')).rejects.toThrow(ForbiddenException);
    });

    it('cooldown aktifken rate_limited hatası fırlatılıyor', async () => {
      const redis = makeRedis({ setnx: jest.fn().mockResolvedValue(false) });
      const { service } = makeService({ redis });

      await expect(service.sendMessage('user-1', 'Spam')).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.TOO_MANY_REQUESTS }),
      );
    });

    it('dakika kotası aşıldığında rate_limited hatası fırlatılıyor', async () => {
      const redis = makeRedis({
        setnx: jest.fn().mockResolvedValue(true),
        incrWithExpire: jest.fn().mockResolvedValue(MESSAGES_PER_MINUTE_LIMIT + 1),
        ttl: jest.fn().mockResolvedValue(45),
      });
      const { service } = makeService({ redis });

      await expect(service.sendMessage('user-1', 'Over quota')).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.TOO_MANY_REQUESTS }),
      );
    });

    it('guild olayı (guild_event) kaydediliyor', async () => {
      const { service, eventRepo } = makeService();

      await service.sendMessage('user-1', 'Test event');

      expect(eventRepo.save).toHaveBeenCalled();
    });

    it('analitik servisi çağrılıyor', async () => {
      const { service, analytics } = makeService();

      await service.sendMessage('user-1', 'Track me');

      expect(analytics.trackServer).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'guild_activity',
          user_id: 'user-1',
        }),
      );
    });
  });

  // ─── getHistory — mesaj geçmişi ────────────────────────────────────────────

  describe('getHistory — mesaj alma', () => {
    it('before parametresi olmadan son 50 mesaj döner', async () => {
      const messages = Array.from({ length: 50 }, (_, i) => makeMessage({ id: `msg-${i}`, guildId: 'guild-1' }));
      const messageRepo = makeMessageRepo({ find: jest.fn().mockResolvedValue(messages) });
      const { service } = makeService({ messageRepo });

      const result = await service.getHistory('guild-1');

      expect(result).toHaveLength(50);
    });

    it('mesajlar kronolojik sırada (en eskiden en yeniye) döner', async () => {
      const msg1 = makeMessage({ id: 'msg-1', createdAt: new Date('2026-05-03T09:00:00Z') });
      const msg2 = makeMessage({ id: 'msg-2', createdAt: new Date('2026-05-03T10:00:00Z') });
      // find returns DESC, service reverses them
      const messageRepo = makeMessageRepo({ find: jest.fn().mockResolvedValue([msg2, msg1]) });
      const { service } = makeService({ messageRepo });

      const result = await service.getHistory('guild-1');

      expect(result[0].id).toBe('msg-1');
      expect(result[1].id).toBe('msg-2');
    });

    it('before parametresiyle belirli mesaj öncesindeki geçmiş döner', async () => {
      const refMsg = makeMessage({ id: 'msg-ref', createdAt: new Date('2026-05-03T10:00:00Z') });
      const messageRepo = makeMessageRepo({
        findOne: jest.fn().mockResolvedValue(refMsg),
        find: jest.fn().mockResolvedValue([]),
      });
      const { service } = makeService({ messageRepo });

      await service.getHistory('guild-1', 'msg-ref');

      expect(messageRepo.findOne).toHaveBeenCalledWith({ where: { id: 'msg-ref' } });
    });

    it('bilinmeyen before id ile fallback olarak tüm geçmişi döner', async () => {
      const messages = [makeMessage()];
      const messageRepo = makeMessageRepo({
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockResolvedValue(messages),
      });
      const { service } = makeService({ messageRepo });

      const result = await service.getHistory('guild-1', 'unknown-id');

      expect(result).toHaveLength(1);
    });

    it('boş lonca geçmişi boş dizi döner', async () => {
      const { service } = makeService();

      const result = await service.getHistory('empty-guild');

      expect(result).toEqual([]);
    });
  });

  // ─── getRollingWindow — kayan pencere ─────────────────────────────────────

  describe('getRollingWindow — son mesajlar', () => {
    it('en fazla 200 mesaj döner', async () => {
      const messages = Array.from({ length: 200 }, (_, i) =>
        makeMessage({ id: `msg-${i}`, guildId: 'guild-1' }),
      );
      const messageRepo = makeMessageRepo({ find: jest.fn().mockResolvedValue(messages) });
      const { service } = makeService({ messageRepo });

      const result = await service.getRollingWindow('guild-1');

      expect(result).toHaveLength(200);
    });

    it('mesajlar kronolojik sırada (en eskiden en yeniye) döner', async () => {
      const msg1 = makeMessage({ id: 'msg-old', createdAt: new Date('2026-05-03T08:00:00Z') });
      const msg2 = makeMessage({ id: 'msg-new', createdAt: new Date('2026-05-03T09:00:00Z') });
      // find returns DESC, service reverses
      const messageRepo = makeMessageRepo({ find: jest.fn().mockResolvedValue([msg2, msg1]) });
      const { service } = makeService({ messageRepo });

      const result = await service.getRollingWindow('guild-1');

      expect(result[0].id).toBe('msg-old');
      expect(result[1].id).toBe('msg-new');
    });

    it('boş lonca için boş dizi döner', async () => {
      const { service } = makeService();

      const result = await service.getRollingWindow('empty-guild');

      expect(result).toEqual([]);
    });

    it('ROLLING_WINDOW_SIZE değeri 200 olarak tanımlanmış', () => {
      expect(ROLLING_WINDOW_SIZE).toBe(200);
    });
  });

  // ─── assertNotMuted ────────────────────────────────────────────────────────

  describe('assertNotMuted', () => {
    it('aktif mute varsa ForbiddenException fırlatıyor', async () => {
      const mute = {
        expiresAt: new Date(Date.now() + 60_000),
      };
      const muteRepo = makeMuteRepo(mute);
      const { service } = makeService({ muteRepo });

      await expect((service as any).assertNotMuted('guild-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('aktif mute yoksa fırlatmıyor', async () => {
      const { service } = makeService();

      await expect((service as any).assertNotMuted('guild-1', 'user-1')).resolves.toBeUndefined();
    });
  });

  // ─── Sabitler ve sınır değerleri ───────────────────────────────────────────

  describe('Rate limit sabitleri', () => {
    it('MESSAGE_COOLDOWN_SECONDS 1 saniye', () => {
      expect(MESSAGE_COOLDOWN_SECONDS).toBe(1);
    });

    it('MESSAGES_PER_MINUTE_LIMIT 20 mesaj', () => {
      expect(MESSAGES_PER_MINUTE_LIMIT).toBe(20);
    });
  });
});
