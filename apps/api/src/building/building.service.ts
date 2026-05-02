import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building, BuildingType } from './entities/building.entity';
import { Game } from '../game/entities/game.entity';

export class CreateBuildingDto {
  gameId: string;
  type: BuildingType;
  position?: { x: number; y: number };
}

@Injectable()
export class BuildingService {
  constructor(
    @InjectRepository(Building)
    private readonly buildingRepo: Repository<Building>,
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
  ) {}

  private async assertGameOwner(gameId: string, ownerId: string): Promise<void> {
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (game.ownerId !== ownerId) throw new ForbiddenException();
  }

  async create(ownerId: string, dto: CreateBuildingDto): Promise<Building> {
    await this.assertGameOwner(dto.gameId, ownerId);
    const building = this.buildingRepo.create(dto);
    return this.buildingRepo.save(building);
  }

  async findByGame(gameId: string, ownerId: string): Promise<Building[]> {
    await this.assertGameOwner(gameId, ownerId);
    return this.buildingRepo.find({ where: { gameId }, order: { createdAt: 'ASC' } });
  }

  async upgrade(id: string, ownerId: string): Promise<Building> {
    const building = await this.buildingRepo.findOne({ where: { id }, relations: ['game'] });
    if (!building) throw new NotFoundException(`Building ${id} not found`);
    if (building.game.ownerId !== ownerId) throw new ForbiddenException();
    building.level += 1;
    return this.buildingRepo.save(building);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const building = await this.buildingRepo.findOne({ where: { id }, relations: ['game'] });
    if (!building) throw new NotFoundException(`Building ${id} not found`);
    if (building.game.ownerId !== ownerId) throw new ForbiddenException();
    await this.buildingRepo.remove(building);
  }
}
