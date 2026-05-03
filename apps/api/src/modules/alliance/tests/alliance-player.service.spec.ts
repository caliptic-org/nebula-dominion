import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AlliancePlayerService } from '../alliance-player.service';
import { Alliance } from '../entities/alliance.entity';
import { AllianceMember, AllianceRole } from '../entities/alliance-member.entity';
import { AllianceWar, WarStatus } from '../entities/alliance-war.entity';
import { AllianceStorage } from '../entities/alliance-storage.entity';
import { AllianceApplication, ApplicationStatus, ApplicationType } from '../entities/alliance-application.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { ChatReaction } from '../entities/chat-reaction.entity';
import { AllianceDonation } from '../entities/alliance-donation.entity';
import { ApplicationAction } from '../dto/process-application.dto';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  save: jest.fn(),
  create: jest.fn((x) => x),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockDataSource = () => ({
  transaction: jest.fn(),
});

const MEMBER_ID = 'member-uuid-1';
const ALLIANCE_ID = 'alliance-uuid-1';
const USER_ID = 'user-uuid-1';

const leaderMember = (): AllianceMember =>
  ({ id: MEMBER_ID, userId: USER_ID, allianceId: ALLIANCE_ID, role: AllianceRole.LEADER, contribution: 0, joinedAt: new Date() } as AllianceMember);

const recruitMember = (userId = 'user-uuid-2', id = 'member-uuid-2'): AllianceMember =>
  ({ id, userId, allianceId: ALLIANCE_ID, role: AllianceRole.RECRUIT, contribution: 0, joinedAt: new Date() } as AllianceMember);

describe('AlliancePlayerService', () => {
  let service: AlliancePlayerService;
  let memberRepo: ReturnType<typeof mockRepo>;
  let allianceRepo: ReturnType<typeof mockRepo>;
  let warRepo: ReturnType<typeof mockRepo>;
  let storageRepo: ReturnType<typeof mockRepo>;
  let applicationRepo: ReturnType<typeof mockRepo>;
  let chatRepo: ReturnType<typeof mockRepo>;
  let reactionRepo: ReturnType<typeof mockRepo>;
  let donationRepo: ReturnType<typeof mockRepo>;
  let dataSource: ReturnType<typeof mockDataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlliancePlayerService,
        { provide: getRepositoryToken(Alliance), useFactory: mockRepo },
        { provide: getRepositoryToken(AllianceMember), useFactory: mockRepo },
        { provide: getRepositoryToken(AllianceWar), useFactory: mockRepo },
        { provide: getRepositoryToken(AllianceStorage), useFactory: mockRepo },
        { provide: getRepositoryToken(AllianceApplication), useFactory: mockRepo },
        { provide: getRepositoryToken(ChatMessage), useFactory: mockRepo },
        { provide: getRepositoryToken(ChatReaction), useFactory: mockRepo },
        { provide: getRepositoryToken(AllianceDonation), useFactory: mockRepo },
        { provide: getDataSourceToken(), useFactory: mockDataSource },
      ],
    }).compile();

    service = module.get(AlliancePlayerService);
    memberRepo = module.get(getRepositoryToken(AllianceMember));
    allianceRepo = module.get(getRepositoryToken(Alliance));
    warRepo = module.get(getRepositoryToken(AllianceWar));
    storageRepo = module.get(getRepositoryToken(AllianceStorage));
    applicationRepo = module.get(getRepositoryToken(AllianceApplication));
    chatRepo = module.get(getRepositoryToken(ChatMessage));
    reactionRepo = module.get(getRepositoryToken(ChatReaction));
    donationRepo = module.get(getRepositoryToken(AllianceDonation));
    dataSource = module.get(getDataSourceToken());
  });

  // ─── requireMembership ───────────────────────────────────────────────────

  describe('requireMembership guard', () => {
    it('throws ForbiddenException when user has no membership', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.getMyAlliance(USER_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ─── getMyAlliance ───────────────────────────────────────────────────────

  describe('getMyAlliance', () => {
    it('returns alliance summary with computed rank', async () => {
      const alliance = { id: ALLIANCE_ID, name: 'Test', tag: 'TST', level: 1, xp: 500, maxMembers: 20, isOpen: true, warWins: 2, warLosses: 1, members: [leaderMember()], storage: {} };
      memberRepo.findOne.mockResolvedValue(leaderMember());
      allianceRepo.findOne.mockResolvedValue(alliance);
      const qb = { where: jest.fn().mockReturnThis(), getCount: jest.fn().mockResolvedValue(4) };
      allianceRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMyAlliance(USER_ID);
      expect(result.name).toBe('Test');
      expect(result.globalRank).toBe(5);
      expect(result.memberCount).toBe(1);
    });
  });

  // ─── kickMember ──────────────────────────────────────────────────────────

  describe('kickMember', () => {
    it('throws ForbiddenException when requester is not leader/officer', async () => {
      memberRepo.findOne.mockResolvedValue(recruitMember(USER_ID, MEMBER_ID));
      await expect(service.kickMember(USER_ID, 'other-member')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when target member not found', async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(leaderMember())
        .mockResolvedValueOnce(null);
      await expect(service.kickMember(USER_ID, 'nonexistent')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when trying to kick the leader', async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(leaderMember())
        .mockResolvedValueOnce(leaderMember());
      await expect(service.kickMember(USER_ID, MEMBER_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('removes member when valid kick request', async () => {
      const target = recruitMember();
      memberRepo.findOne
        .mockResolvedValueOnce(leaderMember())
        .mockResolvedValueOnce(target);
      memberRepo.remove.mockResolvedValue(undefined);
      await service.kickMember(USER_ID, target.id);
      expect(memberRepo.remove).toHaveBeenCalledWith(target);
    });
  });

  // ─── inviteMember ────────────────────────────────────────────────────────

  describe('inviteMember', () => {
    it('throws ForbiddenException when requester is recruit', async () => {
      memberRepo.findOne.mockResolvedValue(recruitMember(USER_ID));
      await expect(service.inviteMember(USER_ID, { playerId: 'other' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ConflictException when target already in an alliance', async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(leaderMember())
        .mockResolvedValueOnce({ id: 'existing' });
      await expect(service.inviteMember(USER_ID, { playerId: 'other' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates invitation application', async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(leaderMember())
        .mockResolvedValueOnce(null);
      applicationRepo.findOne.mockResolvedValue(null);
      allianceRepo.findOne.mockResolvedValue({ maxMembers: 20 });
      memberRepo.count.mockResolvedValue(5);
      const invite = { id: 'app-1', type: ApplicationType.INVITE };
      applicationRepo.save.mockResolvedValue(invite);

      const result = await service.inviteMember(USER_ID, { playerId: 'player-2' });
      expect(result.type).toBe(ApplicationType.INVITE);
    });
  });

  // ─── processApplication ──────────────────────────────────────────────────

  describe('processApplication', () => {
    it('rejects application when action is reject', async () => {
      memberRepo.findOne.mockResolvedValue(leaderMember());
      const app = { id: 'app-1', allianceId: ALLIANCE_ID, userId: 'applicant', status: ApplicationStatus.PENDING };
      applicationRepo.findOne.mockResolvedValue(app);
      applicationRepo.save.mockResolvedValue({ ...app, status: ApplicationStatus.REJECTED });

      const result = await service.processApplication(USER_ID, 'app-1', { action: ApplicationAction.REJECT });
      expect(result.status).toBe(ApplicationStatus.REJECTED);
    });

    it('throws BadRequestException when alliance is full on accept', async () => {
      memberRepo.findOne.mockResolvedValue(leaderMember());
      applicationRepo.findOne.mockResolvedValue({ id: 'app-1', allianceId: ALLIANCE_ID, userId: 'applicant', status: ApplicationStatus.PENDING });
      allianceRepo.findOne.mockResolvedValue({ maxMembers: 5 });
      memberRepo.count.mockResolvedValue(5);

      await expect(
        service.processApplication(USER_ID, 'app-1', { action: ApplicationAction.ACCEPT }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── declareWarByTag ─────────────────────────────────────────────────────

  describe('declareWarByTag', () => {
    it('throws ForbiddenException when requester is officer (only leader allowed)', async () => {
      memberRepo.findOne.mockResolvedValue({ ...leaderMember(), role: AllianceRole.OFFICER });
      await expect(service.declareWarByTag(USER_ID, { targetTag: 'ENM' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when target tag not found', async () => {
      memberRepo.findOne.mockResolvedValue(leaderMember());
      allianceRepo.findOne.mockResolvedValue(null);
      await expect(service.declareWarByTag(USER_ID, { targetTag: 'NOPE' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException (409) when active war exists', async () => {
      memberRepo.findOne.mockResolvedValue(leaderMember());
      allianceRepo.findOne.mockResolvedValue({ id: 'enemy-id', tag: 'ENM' });
      warRepo.findOne.mockResolvedValue({ id: 'war-1', status: WarStatus.ACTIVE });
      await expect(service.declareWarByTag(USER_ID, { targetTag: 'ENM' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates war when conditions are met', async () => {
      memberRepo.findOne.mockResolvedValue(leaderMember());
      allianceRepo.findOne.mockResolvedValue({ id: 'enemy-id', tag: 'ENM' });
      warRepo.findOne.mockResolvedValue(null);
      const war = { id: 'war-new', attackerId: ALLIANCE_ID, defenderId: 'enemy-id', status: WarStatus.DECLARED };
      warRepo.save.mockResolvedValue(war);

      const result = await service.declareWarByTag(USER_ID, { targetTag: 'ENM' });
      expect(result.status).toBe(WarStatus.DECLARED);
    });
  });

  // ─── Chat ────────────────────────────────────────────────────────────────

  describe('sendChatMessage', () => {
    it('saves message with alliance channel id', async () => {
      memberRepo.findOne.mockResolvedValue(leaderMember());
      const msg = { id: 'msg-1', channelId: ALLIANCE_ID, content: 'hello' };
      chatRepo.save.mockResolvedValue(msg);

      const result = await service.sendChatMessage(USER_ID, { content: 'hello' });
      expect(result.channelId).toBe(ALLIANCE_ID);
    });
  });

  describe('addReaction', () => {
    it('throws ConflictException on duplicate reaction', async () => {
      memberRepo.findOne.mockResolvedValue(leaderMember());
      chatRepo.findOne.mockResolvedValue({ id: 'msg-1', isDeleted: false });
      reactionRepo.findOne.mockResolvedValue({ id: 'r-1' });
      await expect(service.addReaction(USER_ID, 'msg-1', { emoji: '👍' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when message not found', async () => {
      memberRepo.findOne.mockResolvedValue(leaderMember());
      chatRepo.findOne.mockResolvedValue(null);
      await expect(service.addReaction(USER_ID, 'msg-1', { emoji: '👍' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── getStorage ──────────────────────────────────────────────────────────

  describe('getStorage', () => {
    it('returns storage for the player alliance', async () => {
      memberRepo.findOne.mockResolvedValue(leaderMember());
      const storage = { id: 's-1', allianceId: ALLIANCE_ID, minerals: 100, gas: 50, energy: 200 };
      storageRepo.findOne.mockResolvedValue(storage);

      const result = await service.getStorage(USER_ID);
      expect(result.allianceId).toBe(ALLIANCE_ID);
    });
  });
});
