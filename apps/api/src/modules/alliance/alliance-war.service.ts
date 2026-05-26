import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alliance } from './entities/alliance.entity';
import { AllianceMember, AllianceRole } from './entities/alliance-member.entity';
import { AllianceWar, WarStatus } from './entities/alliance-war.entity';

/**
 * Dedicated war service for the Alliance War MVP.
 *
 * Scope: declare + list. No battle matchmaking, no negotiation, no truce
 * flow — these arrive in follow-up phases. The existing AlliancePlayerService
 * has a tag-based declareWar that powers the legacy /api/alliance/wars path;
 * this service backs the new clean /api/v1/alliance-wars surface that the
 * web client (alliance/page.tsx) consumes.
 *
 * "Active war" = status DECLARED or ACTIVE. A pair of alliances can only
 * have ONE such war live at a time — duplicate declaration in either
 * direction yields HTTP 409 Conflict. Same-alliance self-declaration is
 * HTTP 400 Bad Request.
 */
@Injectable()
export class AllianceWarService {
  constructor(
    @InjectRepository(Alliance)
    private readonly allianceRepo: Repository<Alliance>,
    @InjectRepository(AllianceMember)
    private readonly memberRepo: Repository<AllianceMember>,
    @InjectRepository(AllianceWar)
    private readonly warRepo: Repository<AllianceWar>,
  ) {}

  /** Caller must be the leader or an officer of the initiator alliance. */
  async declareWar(userId: string, targetAllianceId: string): Promise<AllianceWar> {
    const membership = await this.memberRepo.findOne({ where: { userId } });
    if (!membership) {
      throw new ForbiddenException('Bir ittifaka üye değilsiniz');
    }
    if (
      membership.role !== AllianceRole.LEADER &&
      membership.role !== AllianceRole.OFFICER
    ) {
      throw new ForbiddenException(
        'Savaş ilan etmek için lider veya subay yetkisi gerekir',
      );
    }

    const initiatorAllianceId = membership.allianceId;
    if (initiatorAllianceId === targetAllianceId) {
      throw new BadRequestException('Kendi ittifakınıza savaş ilan edemezsiniz');
    }

    const targetAlliance = await this.allianceRepo.findOne({
      where: { id: targetAllianceId },
    });
    if (!targetAlliance) {
      throw new NotFoundException('Hedef ittifak bulunamadı');
    }

    // Duplicate prevention — active = DECLARED or ACTIVE. Either direction
    // counts; a "they declared on us, now we declare back" needs to wait
    // until the first war ends.
    const existing = await this.warRepo.findOne({
      where: [
        { attackerId: initiatorAllianceId, defenderId: targetAllianceId, status: WarStatus.DECLARED },
        { attackerId: initiatorAllianceId, defenderId: targetAllianceId, status: WarStatus.ACTIVE },
        { attackerId: targetAllianceId, defenderId: initiatorAllianceId, status: WarStatus.DECLARED },
        { attackerId: targetAllianceId, defenderId: initiatorAllianceId, status: WarStatus.ACTIVE },
      ],
    });
    if (existing) {
      throw new ConflictException(
        'Bu ittifakla halihazırda aktif veya ilan edilmiş bir savaş var',
      );
    }

    const war = this.warRepo.create({
      attackerId: initiatorAllianceId,
      defenderId: targetAllianceId,
      status: WarStatus.DECLARED,
    });
    return this.warRepo.save(war);
  }

  /** Returns every war this alliance has ever been a part of, newest first. */
  async listWars(allianceId: string): Promise<AllianceWar[]> {
    return this.warRepo.find({
      where: [{ attackerId: allianceId }, { defenderId: allianceId }],
      relations: ['attacker', 'defender'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Active = DECLARED or ACTIVE. Ended/truce are excluded. */
  async getActive(allianceId: string): Promise<AllianceWar[]> {
    return this.warRepo.find({
      where: [
        { attackerId: allianceId, status: WarStatus.DECLARED },
        { attackerId: allianceId, status: WarStatus.ACTIVE },
        { defenderId: allianceId, status: WarStatus.DECLARED },
        { defenderId: allianceId, status: WarStatus.ACTIVE },
      ],
      relations: ['attacker', 'defender'],
      order: { createdAt: 'DESC' },
    });
  }
}
