import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Formation } from './entities/formation.entity';
import { FormationTemplate } from './entities/formation-template.entity';
import { Unit } from '../units/entities/unit.entity';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { ListFormationsDto } from './dto/list-formations.dto';
import { FormationPowerDto } from './dto/formation-power.dto';
import { UnitSlotDto, CommanderSlotDto } from './dto/unit-slot.dto';

const COMMANDER_POWER_MULTIPLIER = 1.5;

function computeUnitPower(unit: Unit): number {
  // Server-authoritative power formula — prevents client manipulation
  return Math.floor(unit.attack * 2 + unit.defense * 1.5 + unit.hp * 0.1 + unit.speed * 0.5);
}

@Injectable()
export class FormationsService {
  constructor(
    @InjectRepository(Formation)
    private readonly formationRepo: Repository<Formation>,
    @InjectRepository(FormationTemplate)
    private readonly templateRepo: Repository<FormationTemplate>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateFormationDto): Promise<Formation> {
    await this.validateSlots(dto.playerId, dto.unitSlots, dto.commanderSlots);

    if (dto.templateId) {
      await this.assertTemplateExists(dto.templateId);
    }

    const power = await this.calculatePowerFromSlots(dto.unitSlots, dto.commanderSlots);

    const formation = this.formationRepo.create({
      playerId: dto.playerId,
      name: dto.name,
      unitSlots: dto.unitSlots,
      commanderSlots: dto.commanderSlots,
      templateId: dto.templateId ?? null,
      isLastActive: false,
      totalPower: power,
      isActive: true,
    });

    return this.formationRepo.save(formation);
  }

  async findByPlayer(dto: ListFormationsDto): Promise<{ formations: Formation[]; total: number; page: number; limit: number }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const [formations, total] = await this.formationRepo.findAndCount({
      where: { playerId: dto.playerId, isActive: true },
      order: { isLastActive: 'DESC', updatedAt: 'DESC' },
      skip,
      take: limit,
    });

    return { formations, total, page, limit };
  }

  async findById(id: string): Promise<Formation> {
    const formation = await this.formationRepo.findOne({ where: { id, isActive: true } });
    if (!formation) throw new NotFoundException(`Formation ${id} not found`);
    return formation;
  }

  async update(id: string, playerId: string, dto: UpdateFormationDto): Promise<Formation> {
    const formation = await this.assertOwnership(id, playerId);

    if (dto.unitSlots !== undefined || dto.commanderSlots !== undefined) {
      const unitSlots = dto.unitSlots ?? formation.unitSlots;
      const commanderSlots = dto.commanderSlots ?? formation.commanderSlots;
      await this.validateSlots(playerId, unitSlots, commanderSlots);
      formation.unitSlots = unitSlots;
      formation.commanderSlots = commanderSlots;
      formation.totalPower = await this.calculatePowerFromSlots(unitSlots, commanderSlots);
    }

    if (dto.name !== undefined) formation.name = dto.name;
    if (dto.templateId !== undefined) {
      await this.assertTemplateExists(dto.templateId);
      formation.templateId = dto.templateId;
    }

    return this.formationRepo.save(formation);
  }

  async remove(id: string, playerId: string): Promise<void> {
    const formation = await this.assertOwnership(id, playerId);
    await this.formationRepo.update(formation.id, { isActive: false });
  }

  async calculatePower(dto: FormationPowerDto): Promise<{
    totalPower: number;
    unitCount: number;
    commanderCount: number;
    breakdown: { unitId: string; power: number; isCommander: boolean }[];
  }> {
    await this.validateSlots(dto.playerId, dto.unitSlots, dto.commanderSlots);

    const allUnitIds = [
      ...dto.unitSlots.map((s) => s.unitId),
      ...dto.commanderSlots.map((s) => s.commanderId),
    ];

    const units = allUnitIds.length
      ? await this.unitRepo.findBy({ id: In(allUnitIds), isActive: true })
      : [];

    const unitMap = new Map(units.map((u) => [u.id, u]));
    const breakdown: { unitId: string; power: number; isCommander: boolean }[] = [];
    let totalPower = 0;

    for (const slot of dto.unitSlots) {
      const unit = unitMap.get(slot.unitId);
      if (!unit) throw new BadRequestException(`Unit ${slot.unitId} not found or inactive`);
      const power = computeUnitPower(unit);
      breakdown.push({ unitId: slot.unitId, power, isCommander: false });
      totalPower += power;
    }

    for (const slot of dto.commanderSlots) {
      const unit = unitMap.get(slot.commanderId);
      if (!unit) throw new BadRequestException(`Commander unit ${slot.commanderId} not found or inactive`);
      const power = Math.floor(computeUnitPower(unit) * COMMANDER_POWER_MULTIPLIER);
      breakdown.push({ unitId: slot.commanderId, power, isCommander: true });
      totalPower += power;
    }

    return {
      totalPower,
      unitCount: dto.unitSlots.length,
      commanderCount: dto.commanderSlots.length,
      breakdown,
    };
  }

  async markLastActive(id: string, playerId: string): Promise<Formation> {
    const formation = await this.assertOwnership(id, playerId);

    // Clear any existing last-active flag for this player in one query
    await this.formationRepo
      .createQueryBuilder()
      .update()
      .set({ isLastActive: false })
      .where('player_id = :playerId AND is_last_active = TRUE', { playerId })
      .execute();

    formation.isLastActive = true;
    return this.formationRepo.save(formation);
  }

  async listTemplates(): Promise<FormationTemplate[]> {
    return this.templateRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  private async assertOwnership(id: string, playerId: string): Promise<Formation> {
    const formation = await this.findById(id);
    if (formation.playerId !== playerId) {
      throw new ForbiddenException(`Formation ${id} does not belong to player ${playerId}`);
    }
    return formation;
  }

  private async assertTemplateExists(templateId: string): Promise<void> {
    const tpl = await this.templateRepo.findOne({ where: { id: templateId, isActive: true } });
    if (!tpl) throw new BadRequestException(`Formation template ${templateId} not found`);
  }

  private async validateSlots(
    playerId: string,
    unitSlots: UnitSlotDto[],
    commanderSlots: CommanderSlotDto[],
  ): Promise<void> {
    const unitIds = unitSlots.map((s) => s.unitId);
    const commanderIds = commanderSlots.map((s) => s.commanderId);

    const overlap = unitIds.filter((id) => commanderIds.includes(id));
    if (overlap.length) {
      throw new BadRequestException(
        `Unit IDs cannot appear in both unit and commander slots: ${overlap.join(', ')}`,
      );
    }

    const positions = unitSlots.map((s) => s.position);
    if (new Set(positions).size !== positions.length) {
      throw new BadRequestException('Duplicate position indices in unitSlots');
    }

    const cmdPositions = commanderSlots.map((s) => s.position);
    if (new Set(cmdPositions).size !== cmdPositions.length) {
      throw new BadRequestException('Duplicate position indices in commanderSlots');
    }

    const allIds = [...unitIds, ...commanderIds];
    if (!allIds.length) return;

    const found = await this.unitRepo.find({
      where: { id: In(allIds), playerId, isActive: true },
      select: ['id'],
    });

    const foundIds = new Set(found.map((u) => u.id));
    const missing = allIds.filter((id) => !foundIds.has(id));
    if (missing.length) {
      throw new BadRequestException(
        `Unit IDs not found or not owned by player: ${missing.join(', ')}`,
      );
    }
  }

  private async calculatePowerFromSlots(
    unitSlots: UnitSlotDto[],
    commanderSlots: CommanderSlotDto[],
  ): Promise<number> {
    const allIds = [
      ...unitSlots.map((s) => s.unitId),
      ...commanderSlots.map((s) => s.commanderId),
    ];
    if (!allIds.length) return 0;

    const units = await this.unitRepo.findBy({ id: In(allIds), isActive: true });
    const unitMap = new Map(units.map((u) => [u.id, u]));

    let total = 0;
    for (const slot of unitSlots) {
      const unit = unitMap.get(slot.unitId);
      if (unit) total += computeUnitPower(unit);
    }
    for (const slot of commanderSlots) {
      const unit = unitMap.get(slot.commanderId);
      if (unit) total += Math.floor(computeUnitPower(unit) * COMMANDER_POWER_MULTIPLIER);
    }
    return total;
  }
}
