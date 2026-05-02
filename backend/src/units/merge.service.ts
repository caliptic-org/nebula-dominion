import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Unit } from './entities/unit.entity';
import { UnitsService } from './units.service';
import { MutationService } from './mutation.service';
import { RedisService } from '../redis/redis.service';
import { MergeUnitsDto } from './dto/merge-units.dto';
import { MergeConfirmDto } from './dto/merge-confirm.dto';
import { MergePreview, MergeSession, MergeSessionStatus } from './types/units.types';
import { MutationRule } from './entities/mutation-rule.entity';

const MAX_TIER = 54;
const SAME_RACE_TIER_GAP = 3;
const CROSS_RACE_TIER_GAP = 3;

@Injectable()
export class MergeService {
  private readonly logger = new Logger(MergeService.name);
  private readonly sessionTtl: number;

  constructor(
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    private readonly unitsService: UnitsService,
    private readonly mutationService: MutationService,
    private readonly redis: RedisService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.sessionTtl = this.config.get<number>('MERGE_SESSION_TTL_SECONDS', 600);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  async initiateMerge(dto: MergeUnitsDto): Promise<{ sessionId: string; preview: MergePreview; expiresAt: string }> {
    if (dto.unit1Id === dto.unit2Id) {
      throw new BadRequestException('Cannot merge a unit with itself');
    }

    const [unit1, unit2] = await Promise.all([
      this.unitsService.assertOwnership(dto.unit1Id, dto.playerId),
      this.unitsService.assertOwnership(dto.unit2Id, dto.playerId),
    ]);

    await this.assertNotInActiveSessions(unit1.id, unit2.id);
    this.validateMergeConstraints(unit1, unit2);

    const rule = await this.mutationService.findRuleForPair(
      unit1.race,
      unit2.race,
      Math.min(unit1.tierLevel, unit2.tierLevel),
    );

    if (!rule) {
      throw new BadRequestException(
        `No merge rule found for ${unit1.race} + ${unit2.race} at tier ${Math.min(unit1.tierLevel, unit2.tierLevel)}`,
      );
    }

    const preview = this.calculatePreview(unit1, unit2, rule);
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTtl * 1000);

    const session: MergeSession = {
      sessionId,
      playerId: dto.playerId,
      unit1Id: unit1.id,
      unit2Id: unit2.id,
      preview,
      status: MergeSessionStatus.PENDING,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    };

    await this.redis.set(this.sessionKey(sessionId), JSON.stringify(session), this.sessionTtl);
    this.logger.log(`Merge session ${sessionId} created for player ${dto.playerId}`);

    return { sessionId, preview, expiresAt: expiresAt.toISOString() };
  }

  async confirmMerge(dto: MergeConfirmDto): Promise<Unit> {
    const session = await this.getSession(dto.sessionId);

    if (session.playerId !== dto.playerId) {
      throw new BadRequestException('Merge session does not belong to this player');
    }

    // Re-validate units are still active (could have changed since session creation)
    const [unit1, unit2] = await Promise.all([
      this.unitsService.assertOwnership(session.unit1Id, dto.playerId),
      this.unitsService.assertOwnership(session.unit2Id, dto.playerId),
    ]);

    const rule = session.preview.mutationRuleId
      ? await this.mutationService.findRuleById(session.preview.mutationRuleId)
      : null;

    if (!rule) throw new NotFoundException('Mutation rule referenced by session no longer exists');

    const newUnit = await this.executeMerge(unit1, unit2, session.preview);

    await this.redis.del(this.sessionKey(dto.sessionId));
    this.logger.log(`Merge confirmed: ${unit1.id} + ${unit2.id} → ${newUnit.id}`);

    return newUnit;
  }

  async cancelSession(sessionId: string, playerId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session.playerId !== playerId) {
      throw new BadRequestException('Merge session does not belong to this player');
    }
    await this.redis.del(this.sessionKey(sessionId));
    this.logger.log(`Merge session ${sessionId} cancelled by player ${playerId}`);
  }

  async getSession(sessionId: string): Promise<MergeSession> {
    const raw = await this.redis.get(this.sessionKey(sessionId));
    if (!raw) throw new NotFoundException(`Merge session ${sessionId} not found or expired`);
    return JSON.parse(raw) as MergeSession;
  }

  // ─── Preview (no session) ─────────────────────────────────────────────────

  async previewMerge(unit1Id: string, unit2Id: string, playerId: string): Promise<MergePreview> {
    const [unit1, unit2] = await Promise.all([
      this.unitsService.assertOwnership(unit1Id, playerId),
      this.unitsService.assertOwnership(unit2Id, playerId),
    ]);
    this.validateMergeConstraints(unit1, unit2);

    const rule = await this.mutationService.findRuleForPair(
      unit1.race,
      unit2.race,
      Math.min(unit1.tierLevel, unit2.tierLevel),
    );
    if (!rule) {
      throw new BadRequestException(
        `No merge rule found for ${unit1.race} + ${unit2.race} at tier ${Math.min(unit1.tierLevel, unit2.tierLevel)}`,
      );
    }
    return this.calculatePreview(unit1, unit2, rule);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private validateMergeConstraints(unit1: Unit, unit2: Unit): void {
    const tierDiff = Math.abs(unit1.tierLevel - unit2.tierLevel);

    if (unit1.race === unit2.race) {
      if (tierDiff > SAME_RACE_TIER_GAP) {
        throw new BadRequestException(
          `Same-race merge requires units within ${SAME_RACE_TIER_GAP} tier levels of each other (difference: ${tierDiff})`,
        );
      }
      const maxTier = Math.max(unit1.tierLevel, unit2.tierLevel);
      if (maxTier >= MAX_TIER) {
        throw new BadRequestException(`Unit is already at maximum tier (${MAX_TIER})`);
      }
    } else {
      if (tierDiff > CROSS_RACE_TIER_GAP) {
        throw new BadRequestException(
          `Cross-race merge requires units within ${CROSS_RACE_TIER_GAP} tier levels of each other (difference: ${tierDiff})`,
        );
      }
    }
  }

  private calculatePreview(unit1: Unit, unit2: Unit, rule: MutationRule): MergePreview {
    const isSameRace = unit1.race === unit2.race;

    const resultTier = isSameRace
      ? Math.min(MAX_TIER, Math.max(unit1.tierLevel, unit2.tierLevel) + 1)
      : Math.floor((unit1.tierLevel + unit2.tierLevel) / 2);

    const baseAttack = Math.max(unit1.attack, unit2.attack);
    const baseDefense = Math.max(unit1.defense, unit2.defense);
    const baseHp = Math.max(unit1.hp, unit2.hp);
    const baseSpeed = Math.max(unit1.speed, unit2.speed);

    const attack = Math.round(baseAttack * Number(rule.attackMultiplier));
    const defense = Math.round(baseDefense * Number(rule.defenseMultiplier));
    const hp = Math.round(baseHp * Number(rule.hpMultiplier));
    const speed = Math.round(baseSpeed * Number(rule.speedMultiplier));

    const abilities = [...new Set([...unit1.abilities, ...unit2.abilities, ...rule.bonusAbilities])];

    // Use the higher-tier unit's name as the template base, or unit1 if equal
    const baseName = unit1.tierLevel >= unit2.tierLevel ? unit1.name : unit2.name;
    const resultName = rule.resultNameTemplate.replace('[name]', baseName);

    return {
      resultRace: rule.resultRace,
      resultName,
      resultTierLevel: resultTier,
      attack,
      defense,
      hp,
      maxHp: hp,
      speed,
      abilities,
      mutationRuleId: rule.id,
      mutationRuleName: rule.resultNameTemplate,
      isEvolvedSameRace: isSameRace,
    };
  }

  private async executeMerge(unit1: Unit, unit2: Unit, preview: MergePreview): Promise<Unit> {
    return this.dataSource.transaction(async (manager) => {
      // Deactivate source units
      await manager.update(Unit, unit1.id, { isActive: false });
      await manager.update(Unit, unit2.id, { isActive: false });

      // Create merged unit
      const merged = manager.create(Unit, {
        playerId: unit1.playerId,
        name: preview.resultName,
        race: preview.resultRace,
        tierLevel: preview.resultTierLevel,
        attack: preview.attack,
        defense: preview.defense,
        hp: preview.hp,
        maxHp: preview.maxHp,
        speed: preview.speed,
        abilities: preview.abilities,
        mergeCount: Math.max(unit1.mergeCount, unit2.mergeCount) + 1,
        parentUnitIds: [unit1.id, unit2.id],
        isActive: true,
      });

      return manager.save(Unit, merged);
    });
  }

  private async assertNotInActiveSessions(...unitIds: string[]): Promise<void> {
    const allKeys = await this.redis.keys('merge:session:*');

    for (const key of allKeys) {
      const raw = await this.redis.get(key);
      if (!raw) continue;
      const session: MergeSession = JSON.parse(raw);
      if (unitIds.includes(session.unit1Id) || unitIds.includes(session.unit2Id)) {
        throw new ConflictException(
          `One or more units already have an active merge session. Cancel it or wait for it to expire.`,
        );
      }
    }
  }

  private sessionKey(sessionId: string): string {
    return `merge:session:${sessionId}`;
  }
}
