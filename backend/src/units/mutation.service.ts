import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MutationRule } from './entities/mutation-rule.entity';
import { UnitRace, MutationTreeEntry } from './types/units.types';

@Injectable()
export class MutationService {
  constructor(
    @InjectRepository(MutationRule)
    private readonly ruleRepo: Repository<MutationRule>,
  ) {}

  async findAll(filters?: { race1?: UnitRace; race2?: UnitRace; minTier?: number }): Promise<MutationRule[]> {
    const qb = this.ruleRepo.createQueryBuilder('r').where('r.is_active = true');

    if (filters?.race1 && filters?.race2) {
      qb.andWhere(
        '((r.source_race_1 = :r1 AND r.source_race_2 = :r2) OR (r.source_race_1 = :r2 AND r.source_race_2 = :r1))',
        { r1: filters.race1, r2: filters.race2 },
      );
    } else if (filters?.race1) {
      qb.andWhere('(r.source_race_1 = :r1 OR r.source_race_2 = :r1)', { r1: filters.race1 });
    }

    if (filters?.minTier) {
      qb.andWhere('r.min_tier_level <= :tier', { tier: filters.minTier });
    }

    return qb.orderBy('r.source_race_1').addOrderBy('r.source_race_2').getMany();
  }

  async findRuleForPair(race1: UnitRace, race2: UnitRace, tierLevel: number): Promise<MutationRule | null> {
    const rule = await this.ruleRepo
      .createQueryBuilder('r')
      .where('r.is_active = true')
      .andWhere(
        '((r.source_race_1 = :r1 AND r.source_race_2 = :r2) OR (r.source_race_1 = :r2 AND r.source_race_2 = :r1))',
        { r1: race1, r2: race2 },
      )
      .andWhere('r.min_tier_level <= :tier', { tier: tierLevel })
      .orderBy('r.min_tier_level', 'DESC')
      .getOne();

    return rule ?? null;
  }

  async findRuleById(id: string): Promise<MutationRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Mutation rule ${id} not found`);
    return rule;
  }

  toTreeEntry(rule: MutationRule): MutationTreeEntry {
    return {
      ruleId: rule.id,
      sourceRace1: rule.sourceRace1,
      sourceRace2: rule.sourceRace2,
      minTierLevel: rule.minTierLevel,
      resultRace: rule.resultRace,
      resultNameTemplate: rule.resultNameTemplate,
      attackMultiplier: Number(rule.attackMultiplier),
      defenseMultiplier: Number(rule.defenseMultiplier),
      hpMultiplier: Number(rule.hpMultiplier),
      speedMultiplier: Number(rule.speedMultiplier),
      bonusAbilities: rule.bonusAbilities,
      description: rule.description ?? '',
    };
  }
}
