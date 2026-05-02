import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';
import { CreateUnitDto } from './dto/create-unit.dto';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
  ) {}

  async create(dto: CreateUnitDto): Promise<Unit> {
    const unit = this.unitRepo.create({
      playerId: dto.playerId,
      name: dto.name,
      race: dto.race,
      tierLevel: dto.tierLevel,
      attack: dto.attack,
      defense: dto.defense,
      hp: dto.hp,
      maxHp: dto.hp,
      speed: dto.speed,
      abilities: dto.abilities ?? [],
      mergeCount: 0,
      parentUnitIds: [],
      isActive: true,
    });
    return this.unitRepo.save(unit);
  }

  async findById(id: string): Promise<Unit> {
    const unit = await this.unitRepo.findOne({ where: { id } });
    if (!unit) throw new NotFoundException(`Unit ${id} not found`);
    return unit;
  }

  async findByPlayer(playerId: string): Promise<Unit[]> {
    return this.unitRepo.find({ where: { playerId, isActive: true }, order: { createdAt: 'DESC' } });
  }

  async findActiveById(id: string): Promise<Unit> {
    const unit = await this.unitRepo.findOne({ where: { id, isActive: true } });
    if (!unit) throw new NotFoundException(`Active unit ${id} not found`);
    return unit;
  }

  async deactivate(id: string): Promise<void> {
    await this.unitRepo.update(id, { isActive: false });
  }

  async save(unit: Unit): Promise<Unit> {
    return this.unitRepo.save(unit);
  }

  async assertOwnership(unitId: string, playerId: string): Promise<Unit> {
    const unit = await this.findActiveById(unitId);
    if (unit.playerId !== playerId) {
      throw new BadRequestException(`Unit ${unitId} does not belong to player ${playerId}`);
    }
    return unit;
  }
}
