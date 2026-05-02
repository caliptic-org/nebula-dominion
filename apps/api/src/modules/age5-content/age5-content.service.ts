import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Age } from './entities/age.entity';
import { Level } from './entities/level.entity';
import { Unit } from './entities/unit.entity';

interface UnitFilter {
  race?: string;
  levelUnlock?: number;
}

@Injectable()
export class Age5ContentService {
  constructor(
    @InjectRepository(Age)
    private readonly ageRepository: Repository<Age>,
    @InjectRepository(Level)
    private readonly levelRepository: Repository<Level>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  async getAge5Info() {
    const age = await this.ageRepository.findOne({
      where: { number: 5 },
      relations: ['levels'],
    });
    if (!age) throw new NotFoundException('Çağ 5 bulunamadı');
    return age;
  }

  async getLevels() {
    return this.levelRepository
      .createQueryBuilder('level')
      .innerJoin('level.age', 'age', 'age.number = 5')
      .orderBy('level.number', 'ASC')
      .getMany();
  }

  async getLevel(number: number) {
    if (number < 37 || number > 45) {
      throw new NotFoundException('Çağ 5 seviyeleri 37-45 arasındadır');
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
      .where('unit.ageId = (SELECT id FROM ages WHERE number = 5)');

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

  async getUserProgression(userId: string) {
    const levels = await this.getLevels();
    return {
      userId,
      age: 5,
      ageName: 'Çağ 5 - Boyutlar Arası',
      levelRange: { min: 37, max: 45 },
      totalLevels: levels.length,
      levels,
      message: 'Kullanıcı ilerlemesi users tablosunda takip edilmektedir',
    };
  }
}
