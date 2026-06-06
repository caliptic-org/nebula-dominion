import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from './entities/building.entity';
import { Game } from '../game/entities/game.entity';

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

  // create() removed — see building.controller.ts changelog. The
  // method saved a Building row with no resource cost, no position
  // uniqueness, no maxPerPlayer cap, and no queue gate. Repeated
  // POSTs instantiated dozens of free production buildings per
  // gameId (ECON-C6-03, audit cycle 6). Canonical construction path:
  // apps/game-server/src/buildings/buildings.service.ts
  // -> startConstruction(), exposed as
  // POST /api/buildings/start-construction on game-server.

  async findByGame(gameId: string, ownerId: string): Promise<Building[]> {
    await this.assertGameOwner(gameId, ownerId);
    return this.buildingRepo.find({ where: { gameId }, order: { createdAt: 'ASC' } });
  }

  // upgrade() removed — see building.controller.ts changelog. The
  // method had no level cap and no resource cost so any authed user
  // could PATCH /api/v1/buildings/:id/upgrade their way to Lv 68 in
  // 36 seconds (live audit smoke test). The canonical upgrade path
  // lives in apps/game-server/src/buildings/buildings.service.ts and
  // enforces MAX_BUILDING_LEVEL = 54, scaled cost, queue. The FE has
  // always called the game-server path; nothing breaks by removing
  // this shim.

  async remove(id: string, ownerId: string): Promise<void> {
    const building = await this.buildingRepo.findOne({ where: { id }, relations: ['game'] });
    if (!building) throw new NotFoundException(`Building ${id} not found`);
    if (building.game.ownerId !== ownerId) throw new ForbiddenException();
    await this.buildingRepo.remove(building);
  }
}
