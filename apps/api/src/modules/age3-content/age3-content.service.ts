import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Age } from '../age5-content/entities/age.entity';
import { Level } from '../age5-content/entities/level.entity';
import { Unit } from '../age5-content/entities/unit.entity';

interface UnitFilter {
  race?: string;
  levelUnlock?: number;
}

@Injectable()
export class Age3ContentService {
  constructor(
    @InjectRepository(Age)
    private readonly ageRepo: Repository<Age>,
    @InjectRepository(Level)
    private readonly levelRepo: Repository<Level>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
  ) {}

  async getAge3Info() {
    const age = await this.ageRepo.findOne({
      where: { number: 3 },
      relations: ['levels'],
    });
    if (!age) throw new NotFoundException('Çağ 3 bulunamadı');
    return age;
  }

  async getLevels() {
    return this.levelRepo
      .createQueryBuilder('level')
      .innerJoin('level.age', 'age', 'age.number = 3')
      .orderBy('level.number', 'ASC')
      .getMany();
  }

  async getLevel(number: number) {
    if (number < 19 || number > 27) {
      throw new NotFoundException('Çağ 3 seviyeleri 19-27 arasındadır');
    }
    const level = await this.levelRepo.findOne({ where: { number }, relations: ['age'] });
    if (!level) throw new NotFoundException(`Seviye ${number} bulunamadı`);
    return level;
  }

  async getUnits(filter: UnitFilter = {}) {
    const qb = this.unitRepo
      .createQueryBuilder('unit')
      .where('unit.ageId = (SELECT id FROM ages WHERE number = 3)');

    if (filter.race) {
      qb.andWhere('unit.race = :race', { race: filter.race });
    }
    if (filter.levelUnlock) {
      qb.andWhere('unit.levelUnlock <= :level', { level: filter.levelUnlock });
    }

    return qb.orderBy('unit.levelUnlock', 'ASC').getMany();
  }

  async getMonsterUnits() {
    return this.unitRepo
      .createQueryBuilder('unit')
      .where('unit.race = :race', { race: 'monster' })
      .andWhere('unit.ageId = (SELECT id FROM ages WHERE number = 3)')
      .orderBy('unit.levelUnlock', 'ASC')
      .getMany();
  }

  async getUnitByCode(code: string) {
    const unit = await this.unitRepo.findOne({ where: { code } });
    if (!unit) throw new NotFoundException(`Birim '${code}' bulunamadı`);
    return unit;
  }
}
