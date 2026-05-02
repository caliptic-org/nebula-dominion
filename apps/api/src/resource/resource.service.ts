import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource, ResourceType } from './entities/resource.entity';
import { Game } from '../game/entities/game.entity';

@Injectable()
export class ResourceService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepo: Repository<Resource>,
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
  ) {}

  private async assertGameOwner(gameId: string, ownerId: string): Promise<void> {
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (game.ownerId !== ownerId) throw new ForbiddenException();
  }

  async findByGame(gameId: string, ownerId: string): Promise<Resource[]> {
    await this.assertGameOwner(gameId, ownerId);
    return this.resourceRepo.find({ where: { gameId }, order: { type: 'ASC' } });
  }

  async initForGame(gameId: string): Promise<Resource[]> {
    const defaults: Array<Partial<Resource>> = Object.values(ResourceType).map((type) => ({
      gameId,
      type,
      amount: type === ResourceType.METAL ? 500 : type === ResourceType.ENERGY ? 200 : 100,
      productionRate: 1,
      capacity: 10000,
    }));

    const resources = defaults.map((d) => this.resourceRepo.create(d));
    return this.resourceRepo.save(resources);
  }

  async update(id: string, ownerId: string, amount: number): Promise<Resource> {
    const resource = await this.resourceRepo.findOne({ where: { id }, relations: ['game'] });
    if (!resource) throw new NotFoundException(`Resource ${id} not found`);
    if (resource.game.ownerId !== ownerId) throw new ForbiddenException();
    resource.amount = amount;
    return this.resourceRepo.save(resource);
  }
}
