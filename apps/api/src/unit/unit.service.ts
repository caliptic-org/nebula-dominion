import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit, UnitType, UnitStatus } from './entities/unit.entity';
import { Game } from '../game/entities/game.entity';

export class CreateUnitDto {
  gameId: string;
  type: UnitType;
  count?: number;
}

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
  ) {}

  private async assertGameOwner(gameId: string, ownerId: string): Promise<void> {
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (game.ownerId !== ownerId) throw new ForbiddenException();
  }

  async create(ownerId: string, dto: CreateUnitDto): Promise<Unit> {
    await this.assertGameOwner(dto.gameId, ownerId);
    const unit = this.unitRepo.create({ ...dto, count: dto.count ?? 1, status: UnitStatus.IDLE });
    return this.unitRepo.save(unit);
  }

  async findByGame(gameId: string, ownerId: string): Promise<Unit[]> {
    await this.assertGameOwner(gameId, ownerId);
    return this.unitRepo.find({ where: { gameId }, order: { type: 'ASC' } });
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const unit = await this.unitRepo.findOne({ where: { id }, relations: ['game'] });
    if (!unit) throw new NotFoundException(`Unit ${id} not found`);
    if (unit.game.ownerId !== ownerId) throw new ForbiddenException();
    await this.unitRepo.remove(unit);
  }
}
