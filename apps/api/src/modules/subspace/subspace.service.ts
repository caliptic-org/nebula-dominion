import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubspaceZone } from './entities/subspace-zone.entity';
import { SubspaceSession } from './entities/subspace-session.entity';
import { SubspaceBattle } from './entities/subspace-battle.entity';
import { EnterSubspaceDto, StartSubspaceBattleDto } from './dto/enter-subspace.dto';

@Injectable()
export class SubspaceService {
  private readonly logger = new Logger(SubspaceService.name);

  constructor(
    @InjectRepository(SubspaceZone)
    private readonly zoneRepository: Repository<SubspaceZone>,
    @InjectRepository(SubspaceSession)
    private readonly sessionRepository: Repository<SubspaceSession>,
    @InjectRepository(SubspaceBattle)
    private readonly battleRepository: Repository<SubspaceBattle>,
  ) {}

  async getZones(userLevel?: number) {
    const qb = this.zoneRepository
      .createQueryBuilder('zone')
      .where('zone.isActive = true')
      .orderBy('zone.levelRequired', 'ASC');

    if (userLevel !== undefined) {
      qb.andWhere('zone.levelRequired <= :level', { level: userLevel });
    }

    return qb.getMany();
  }

  async getZoneByCode(code: string) {
    const zone = await this.zoneRepository.findOne({ where: { code } });
    if (!zone) throw new NotFoundException(`Subspace bölgesi '${code}' bulunamadı`);
    return zone;
  }

  async enterSubspace(userId: string, dto: EnterSubspaceDto): Promise<SubspaceSession> {
    const zone = await this.zoneRepository.findOne({ where: { code: dto.zoneCode } });
    if (!zone) throw new NotFoundException(`Subspace bölgesi '${dto.zoneCode}' bulunamadı`);

    const activeSession = await this.sessionRepository.findOne({
      where: { userId, status: 'active' },
    });
    if (activeSession) {
      throw new BadRequestException('Zaten aktif bir subspace oturumunuz var. Önce çıkış yapın.');
    }

    const session = this.sessionRepository.create({
      userId,
      zoneId: zone.id,
      status: 'active',
      unitsDeployed: dto.unitCodes.map((code) => ({ code, deployedAt: new Date() })),
    });

    const saved = await this.sessionRepository.save(session);
    this.logger.log(`Kullanıcı ${userId} subspace bölgesine girdi: ${zone.name}`);
    return saved;
  }

  async exitSubspace(userId: string, sessionId: string, fled = false): Promise<SubspaceSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId, status: 'active' },
      relations: ['zone'],
    });
    if (!session) throw new NotFoundException('Aktif subspace oturumu bulunamadı');

    const exitedAt = new Date();
    const durationSecs = Math.floor((exitedAt.getTime() - session.enteredAt.getTime()) / 1000);

    const rewards = this.calculateRewards(session.zone, durationSecs, session.enemiesKilled);

    session.status = fled ? 'fled' : 'completed';
    session.exitedAt = exitedAt;
    session.durationSecs = durationSecs;
    session.rewardsEarned = rewards;

    const saved = await this.sessionRepository.save(session);
    this.logger.log(
      `Kullanıcı ${userId} subspace'ten çıktı: ${session.zone.name}, süre: ${durationSecs}s`,
    );
    return saved;
  }

  async applyHazard(sessionId: string): Promise<Record<string, unknown>> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, status: 'active' },
      relations: ['zone'],
    });
    if (!session) throw new NotFoundException('Aktif oturum bulunamadı');

    const zone = session.zone;
    const triggeredHazards: Record<string, unknown>[] = [];

    for (const hazard of zone.hazards as Array<{ type: string; chance: number; damage_pct?: number; effect?: string }>) {
      if (Math.random() < hazard.chance) {
        triggeredHazards.push({
          type: hazard.type,
          damage_pct: hazard.damage_pct,
          effect: hazard.effect,
          triggeredAt: new Date(),
        });
      }
    }

    if (triggeredHazards.length > 0) {
      session.hazardsHit = [...session.hazardsHit, ...triggeredHazards];
      await this.sessionRepository.save(session);
    }

    return { triggeredHazards, zoneModifiers: zone.modifiers };
  }

  async startBattle(userId: string, dto: StartSubspaceBattleDto): Promise<SubspaceBattle> {
    const zone = await this.zoneRepository.findOne({ where: { id: dto.zoneId } });
    if (!zone) throw new NotFoundException('Subspace bölgesi bulunamadı');

    const battle = this.battleRepository.create({
      zoneId: dto.zoneId,
      battleType: dto.battleType,
      attackerId: userId,
      defenderId: dto.defenderId ?? null,
      status: 'pending',
      attackerUnits: dto.attackerUnits,
      subspaceEffects: this.resolveSubspaceEffects(zone),
    });

    return this.battleRepository.save(battle);
  }

  async resolveBattle(battleId: string, defenderUnits: Record<string, unknown>[]): Promise<SubspaceBattle> {
    const battle = await this.battleRepository.findOne({
      where: { id: battleId, status: 'pending' },
      relations: ['zone'],
    });
    if (!battle) throw new NotFoundException('Savaş bulunamadı veya zaten tamamlandı');

    const result = this.computeBattleResult(
      battle.attackerUnits,
      defenderUnits,
      battle.zone.modifiers as Record<string, number>,
    );

    battle.status = 'completed';
    battle.defenderUnits = defenderUnits;
    battle.result = result;
    battle.winnerId = result.winnerId as string;
    battle.startedAt = new Date(Date.now() - (result as { durationMs: number }).durationMs);
    battle.endedAt = new Date();

    return this.battleRepository.save(battle);
  }

  async getUserSessions(userId: string, limit = 20) {
    return this.sessionRepository.find({
      where: { userId },
      relations: ['zone'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private calculateRewards(
    zone: SubspaceZone,
    durationSecs: number,
    enemiesKilled: number,
  ): Record<string, unknown> {
    const base = zone.rewards as Record<string, number>;
    const timeFactor = Math.min(durationSecs / 300, 2.0);
    const killBonus = enemiesKilled * 50;

    return {
      minerals: Math.floor((base.minerals || 0) * timeFactor),
      energy: Math.floor((base.energy || 0) * timeFactor),
      void_crystals: Math.floor((base.void_crystals || 0) * timeFactor) + Math.floor(killBonus / 100),
      enemies_killed: enemiesKilled,
    };
  }

  private resolveSubspaceEffects(zone: SubspaceZone): Record<string, unknown>[] {
    const modifiers = zone.modifiers as Record<string, unknown>;
    return Object.entries(modifiers).map(([key, value]) => ({ effect: key, value }));
  }

  private computeBattleResult(
    attackerUnits: Record<string, unknown>[],
    defenderUnits: Record<string, unknown>[],
    zoneModifiers: Record<string, number>,
  ): Record<string, unknown> {
    const attackMod = zoneModifiers.attack_multiplier || 1.0;
    const defMod = zoneModifiers.defense_penalty || 1.0;

    let attackerPower = attackerUnits.reduce((sum, u) => sum + ((u.attack as number) || 100), 0);
    let defenderPower = defenderUnits.reduce((sum, u) => sum + ((u.attack as number) || 100), 0);

    attackerPower *= attackMod;
    defenderPower *= defMod;

    const attackerWins = attackerPower >= defenderPower;
    const margin = Math.abs(attackerPower - defenderPower) / Math.max(attackerPower, defenderPower);

    return {
      attackerPower: Math.floor(attackerPower),
      defenderPower: Math.floor(defenderPower),
      winnerId: attackerWins ? 'attacker' : 'defender',
      marginPct: Math.floor(margin * 100),
      durationMs: 5000 + Math.random() * 10000,
      subspaceBonus: attackMod !== 1.0,
    };
  }
}
