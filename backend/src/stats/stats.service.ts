import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { PlayerBuff } from './entities/player-buff.entity';
import { PlayerResource } from './entities/player-resource.entity';
import { PlayerPower } from './entities/player-power.entity';
import { Unit } from '../units/entities/unit.entity';
import { Battle } from '../battle/entities/battle.entity';
import { BattleStatus } from '../battle/types/battle.types';

const RACE_COLOR_TOKENS: Record<string, string> = {
  human: 'gold',
  zerg: 'purple',
  droid: 'cyan',
  creature: 'green',
  demon: 'red',
};

function calcDeltaPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(PlayerBuff)
    private readonly buffRepo: Repository<PlayerBuff>,
    @InjectRepository(PlayerResource)
    private readonly resourceRepo: Repository<PlayerResource>,
    @InjectRepository(PlayerPower)
    private readonly powerRepo: Repository<PlayerPower>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectRepository(Battle)
    private readonly battleRepo: Repository<Battle>,
  ) {}

  async getPowerBreakdown(playerId: string) {
    const [power, units] = await Promise.all([
      this.powerRepo.findOne({ where: { playerId } }),
      this.unitRepo.find({ where: { playerId, isActive: true } }),
    ]);

    const commanderScore = power?.commanderScore ?? 0;
    const researchScore = power?.researchScore ?? 0;
    const unitScore = units.reduce((sum, u) => sum + u.attack + u.defense, 0);
    const race = power?.race ?? 'human';
    const total = commanderScore + researchScore + unitScore;

    const pct = (score: number) =>
      total === 0 ? 0 : Math.round((score / total) * 100);

    return {
      data: {
        commander_katki: { score: commanderScore, percentage: pct(commanderScore) },
        research_katki: { score: researchScore, percentage: pct(researchScore) },
        unit_katki: { score: unitScore, percentage: pct(unitScore) },
        total_power: total,
        race_color_token: RACE_COLOR_TOKENS[race] ?? 'gold',
      },
      meta: { race, timestamp: new Date().toISOString() },
    };
  }

  async getActiveBuffs(playerId: string) {
    const now = new Date();
    const [buffs, power] = await Promise.all([
      this.buffRepo.find({
        where: { playerId, expiresAt: MoreThan(now) },
        order: { expiresAt: 'ASC' },
        take: 6,
      }),
      this.powerRepo.findOne({ where: { playerId } }),
    ]);

    const race = power?.race ?? 'human';

    return {
      data: {
        buffs: buffs.map((b) => ({
          buff_id: b.id,
          buff_type: b.buffType,
          icon: b.icon,
          effect_value: b.effectValue,
          expires_at: Math.floor(b.expiresAt.getTime() / 1000),
        })),
        count: buffs.length,
      },
      meta: { race, timestamp: new Date().toISOString() },
    };
  }

  async getBattleStats(playerId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [allBattles, currentPeriodBattles, prevPeriodBattles, units, power] =
      await Promise.all([
        this.battleRepo
          .createQueryBuilder('b')
          .where('(b.attackerId = :pid OR b.defenderId = :pid)', { pid: playerId })
          .andWhere('b.status = :status', { status: BattleStatus.COMPLETED })
          .take(10000)
          .getMany(),
        this.battleRepo
          .createQueryBuilder('b')
          .where('(b.attackerId = :pid OR b.defenderId = :pid)', { pid: playerId })
          .andWhere('b.status = :status', { status: BattleStatus.COMPLETED })
          .andWhere('b.endedAt >= :from', { from: thirtyDaysAgo })
          .getMany(),
        this.battleRepo
          .createQueryBuilder('b')
          .where('(b.attackerId = :pid OR b.defenderId = :pid)', { pid: playerId })
          .andWhere('b.status = :status', { status: BattleStatus.COMPLETED })
          .andWhere('b.endedAt >= :from AND b.endedAt < :to', {
            from: sixtyDaysAgo,
            to: thirtyDaysAgo,
          })
          .getMany(),
        this.unitRepo.find({ where: { playerId, isActive: true } }),
        this.powerRepo.findOne({ where: { playerId } }),
      ]);

    const race = power?.race ?? 'human';

    const countWins = (battles: Battle[]) =>
      battles.filter((b) => b.winnerId === playerId).length;
    const countLosses = (battles: Battle[]) =>
      battles.filter(
        (b) => b.winnerId !== null && b.winnerId !== playerId,
      ).length;

    const battlesWon = countWins(allBattles);
    const battlesLost = countLosses(allBattles);
    const totalBattles = battlesWon + battlesLost;
    const winRate = totalBattles === 0 ? 0 : Math.round((battlesWon / totalBattles) * 100);

    const currentWon = countWins(currentPeriodBattles);
    const currentLost = countLosses(currentPeriodBattles);
    const currentTotal = currentWon + currentLost;
    const currentWinRate = currentTotal === 0 ? 0 : Math.round((currentWon / currentTotal) * 100);

    const prevWon = countWins(prevPeriodBattles);
    const prevLost = countLosses(prevPeriodBattles);
    const prevTotal = prevWon + prevLost;
    const prevWinRate = prevTotal === 0 ? 0 : Math.round((prevWon / prevTotal) * 100);

    const totalAttack = units.reduce((sum, u) => sum + u.attack, 0);
    const totalDefense = units.reduce((sum, u) => sum + u.defense, 0);

    return {
      data: {
        total_attack: totalAttack,
        total_defense: totalDefense,
        battles_won: battlesWon,
        battles_lost: battlesLost,
        win_rate: winRate,
        delta: {
          battles_won_pct: calcDeltaPct(currentWon, prevWon),
          battles_lost_pct: calcDeltaPct(currentLost, prevLost),
          win_rate_pct: calcDeltaPct(currentWinRate, prevWinRate),
        },
      },
      meta: { race, timestamp: new Date().toISOString() },
    };
  }

  async getResourceRates(playerId: string) {
    const [resource, power] = await Promise.all([
      this.resourceRepo.findOne({ where: { playerId } }),
      this.powerRepo.findOne({ where: { playerId } }),
    ]);

    if (!resource) {
      throw new NotFoundException('No resource data found for player');
    }

    const race = power?.race ?? 'human';

    return {
      data: {
        mineral_per_hour: resource.mineralPerHour,
        gas_per_hour: resource.gasPerHour,
        energy_per_hour: resource.energyPerHour,
        population_current: resource.populationCurrent,
        population_capacity: resource.populationCapacity,
        delta: {
          mineral_pct: calcDeltaPct(resource.mineralPerHour, resource.prevMineralPerHour),
          gas_pct: calcDeltaPct(resource.gasPerHour, resource.prevGasPerHour),
          energy_pct: calcDeltaPct(resource.energyPerHour, resource.prevEnergyPerHour),
        },
      },
      meta: { race, timestamp: new Date().toISOString() },
    };
  }
}
