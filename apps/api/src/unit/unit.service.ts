import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit, UnitType, UnitStatus } from './entities/unit.entity';
import { Game } from '../game/entities/game.entity';
import { User } from '../user/entities/user.entity';
import { Race } from '../user/entities/race.enum';

export interface MutateOptions {
  unitId: string;
  targetType?: UnitType;
}

export interface MergeOptions {
  sourceUnitId: string;
  targetUnitId: string;
}

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async assertGameOwner(gameId: string, ownerId: string): Promise<void> {
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (game.ownerId !== ownerId) throw new ForbiddenException();
  }

  // create() removed — see unit.controller.ts changelog. The method
  // saved a Unit row with count=dto.count and no resource deduction,
  // no race gate, no queue, and no upper bound on count. A live-audit
  // POST {gameId, type:"marine", count:1_000_000} minted 1M marines
  // free of charge. (ECON-C6-02, audit cycle 6.) Canonical training
  // path: apps/game-server/src/units/units.service.ts -> trainUnit(),
  // exposed as POST /api/units/train on game-server.

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

  async merge(ownerId: string, { sourceUnitId, targetUnitId }: MergeOptions): Promise<Unit> {
    if (sourceUnitId === targetUnitId) {
      throw new BadRequestException('source and target unit must differ');
    }
    const [source, target] = await Promise.all([
      this.unitRepo.findOne({ where: { id: sourceUnitId }, relations: ['game'] }),
      this.unitRepo.findOne({ where: { id: targetUnitId }, relations: ['game'] }),
    ]);
    if (!source) throw new NotFoundException(`Unit ${sourceUnitId} not found`);
    if (!target) throw new NotFoundException(`Unit ${targetUnitId} not found`);
    if (source.game.ownerId !== ownerId || target.game.ownerId !== ownerId) {
      throw new ForbiddenException();
    }
    if (source.gameId !== target.gameId) {
      throw new BadRequestException('cannot merge units across different games');
    }
    if (source.type !== target.type) {
      throw new BadRequestException('only units of identical type may be merged');
    }
    if (source.level !== target.level) {
      throw new BadRequestException('only units of identical level may be merged');
    }

    target.level += 1;
    await this.unitRepo.save(target);
    await this.unitRepo.remove(source);
    return target;
  }

  async mutate(ownerId: string, dto: MutateOptions): Promise<Unit> {
    const user = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!user) throw new NotFoundException(`User ${ownerId} not found`);
    if (user.race !== Race.ZERG) {
      throw new ForbiddenException('Mutation is a Zerg-only mechanic');
    }
    const unit = await this.unitRepo.findOne({
      where: { id: dto.unitId },
      relations: ['game'],
    });
    if (!unit) throw new NotFoundException(`Unit ${dto.unitId} not found`);
    if (unit.game.ownerId !== ownerId) throw new ForbiddenException();
    if (unit.status !== UnitStatus.IDLE) {
      throw new BadRequestException('Only idle units may be mutated');
    }

    if (dto.targetType && dto.targetType !== unit.type) {
      unit.type = dto.targetType;
    }
    unit.level += 1;
    unit.status = UnitStatus.IDLE;
    return this.unitRepo.save(unit);
  }
}
