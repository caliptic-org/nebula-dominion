import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Age } from '../age5-content/entities/age.entity';
import { Level } from '../age5-content/entities/level.entity';
import { Unit } from '../age5-content/entities/unit.entity';
import {
  AUTOMATA_MUTATION_TREE,
  AutomataMutationTier,
  getMutationsByTier,
} from './automata-mutation.config';

interface UnitFilter {
  race?: string;
  levelUnlock?: number;
}

@Injectable()
export class Age2ContentService {
  constructor(
    @InjectRepository(Age)
    private readonly ageRepository: Repository<Age>,
    @InjectRepository(Level)
    private readonly levelRepository: Repository<Level>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  async getAge2Info() {
    const age = await this.ageRepository.findOne({
      where: { number: 2 },
      relations: ['levels'],
    });
    if (!age) throw new NotFoundException('Çağ 2 bulunamadı');
    return age;
  }

  async getLevels() {
    return this.levelRepository
      .createQueryBuilder('level')
      .innerJoin('level.age', 'age', 'age.number = 2')
      .orderBy('level.number', 'ASC')
      .getMany();
  }

  async getLevel(number: number) {
    if (number < 10 || number > 18) {
      throw new NotFoundException('Çağ 2 seviyeleri 10-18 arasındadır');
    }
    const level = await this.levelRepository.findOne({
      where: { number },
      relations: ['age'],
    });
    if (!level) throw new NotFoundException(`Seviye ${number} bulunamadı`);
    return level;
  }

  async getUnits(filter: UnitFilter = {}) {
    const qb = this.unitRepository
      .createQueryBuilder('unit')
      .where('unit.ageId = (SELECT id FROM ages WHERE number = 2)');

    if (filter.race) {
      qb.andWhere('unit.race = :race', { race: filter.race });
    }
    if (filter.levelUnlock) {
      qb.andWhere('unit.levelUnlock <= :level', { level: filter.levelUnlock });
    }

    return qb.orderBy('unit.levelUnlock', 'ASC').getMany();
  }

  async getUnitByCode(code: string) {
    const unit = await this.unitRepository.findOne({ where: { code } });
    if (!unit) throw new NotFoundException(`Birim '${code}' bulunamadı`);
    return unit;
  }

  getAutomataMutationTree() {
    return AUTOMATA_MUTATION_TREE;
  }

  getAutomataMutationsByTier(tier: number) {
    if (![1, 2, 3].includes(tier)) {
      throw new NotFoundException(`Geçersiz mutasyon tier: ${tier}. 1, 2 veya 3 olmalıdır.`);
    }
    return getMutationsByTier(tier as AutomataMutationTier);
  }

  async getUserProgression(userId: string) {
    const levels = await this.getLevels();
    return {
      userId,
      age: 2,
      ageName: 'Çağ 2 - Automata Yükselişi',
      levelRange: { min: 10, max: 18 },
      totalLevels: levels.length,
      levels,
      message: 'Kullanıcı ilerlemesi users tablosunda takip edilmektedir',
    };
  }
}
