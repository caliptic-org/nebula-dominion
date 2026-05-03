import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameState, Race } from './entities/game-state.entity';
import { PlayerScore } from '../scoreboard/entities/player-score.entity';
import { SelectRaceDto } from './dto/select-race.dto';
import { CollectResourcesDto } from './dto/collect-resources.dto';

const MAX_RESOURCES_PER_CALL = 1000;

@Injectable()
export class GameStateService {
  constructor(
    @InjectRepository(GameState) private readonly gsRepo: Repository<GameState>,
    @InjectRepository(PlayerScore) private readonly scoreRepo: Repository<PlayerScore>,
  ) {}

  async getState(requesterId: string, userId: string): Promise<GameState> {
    if (requesterId !== userId) {
      throw new ForbiddenException('Cannot view another player game state');
    }
    const state = await this.gsRepo.findOne({ where: { userId } });
    if (!state) throw new NotFoundException('Game state not found');
    return state;
  }

  async selectRace(requesterId: string, userId: string, dto: SelectRaceDto): Promise<GameState> {
    if (requesterId !== userId) {
      throw new ForbiddenException('Cannot modify another player game state');
    }
    const state = await this.gsRepo.findOne({ where: { userId } });
    if (!state) throw new NotFoundException('Game state not found');
    if (state.level > 1) {
      throw new BadRequestException('Race can only be selected before level 2');
    }
    state.race = dto.race;
    return this.gsRepo.save(state);
  }

  async collectResources(
    requesterId: string,
    userId: string,
    dto: CollectResourcesDto,
  ): Promise<GameState> {
    if (requesterId !== userId) {
      throw new ForbiddenException('Cannot modify another player game state');
    }
    const state = await this.gsRepo.findOne({ where: { userId } });
    if (!state) throw new NotFoundException('Game state not found');

    const minerals = dto.minerals ?? 0;
    const energy = dto.energy ?? 0;
    const darkMatter = dto.darkMatter ?? 0;

    if (minerals <= 0 && energy <= 0 && darkMatter <= 0) {
      throw new BadRequestException('At least one resource amount must be greater than 0');
    }
    if (minerals > MAX_RESOURCES_PER_CALL || energy > MAX_RESOURCES_PER_CALL || darkMatter > MAX_RESOURCES_PER_CALL) {
      throw new BadRequestException(`Resource collection exceeds maximum of ${MAX_RESOURCES_PER_CALL} per call`);
    }

    state.resources = {
      minerals: state.resources.minerals + minerals,
      energy: state.resources.energy + energy,
      darkMatter: state.resources.darkMatter + darkMatter,
    };
    state.lastActiveAt = new Date();

    const saved = await this.gsRepo.save(state);

    // Keep scoreboard in sync
    await this.scoreRepo.update({ userId }, { totalScore: saved.totalScore });

    return saved;
  }

  async adminSummary(): Promise<{ totalPlayers: number; averageLevel: number }> {
    const result = await this.gsRepo
      .createQueryBuilder('gs')
      .select('COUNT(*)', 'totalPlayers')
      .addSelect('AVG(gs.level)', 'averageLevel')
      .getRawOne();

    return {
      totalPlayers: parseInt(result.totalPlayers, 10),
      averageLevel: parseFloat(parseFloat(result.averageLevel).toFixed(2)),
    };
  }
}
