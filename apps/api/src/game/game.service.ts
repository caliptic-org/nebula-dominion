import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from './entities/game.entity';

export class CreateGameDto {
  name: string;
}

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
  ) {}

  async create(ownerId: string, dto: CreateGameDto): Promise<Game> {
    const game = this.gameRepo.create({ ...dto, ownerId, status: GameStatus.ACTIVE });
    return this.gameRepo.save(game);
  }

  async findAll(ownerId: string): Promise<Game[]> {
    return this.gameRepo.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, ownerId: string): Promise<Game> {
    const game = await this.gameRepo.findOne({ where: { id } });
    if (!game) throw new NotFoundException(`Game ${id} not found`);
    if (game.ownerId !== ownerId) throw new ForbiddenException();
    return game;
  }

  async updateStatus(id: string, ownerId: string, status: GameStatus): Promise<Game> {
    const game = await this.findOne(id, ownerId);
    game.status = status;
    return this.gameRepo.save(game);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const game = await this.findOne(id, ownerId);
    await this.gameRepo.remove(game);
  }
}
