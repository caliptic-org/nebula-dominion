import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Battle } from './entities/battle.entity';
import { BattleLog } from './entities/battle-log.entity';
import { BattleEngineService } from './battle-engine.service';
import { MinioService } from '../storage/minio.service';
import { AnalyticsService } from '../analytics/analytics.service';
import {
  BattleStatus,
  BattleSide,
  BattleArmy,
  UnitSnapshot,
  TurnAction,
  BattleActionType,
  BattleReplay,
  ReplayFrame,
} from './types/battle.types';

export interface CreateBattleDto {
  attackerId: string;
  defenderId: string;
  attackerUnits: UnitSnapshot[];
  defenderUnits: UnitSnapshot[];
}

export interface ExecuteTurnDto {
  playerId: string;
  actionType: BattleActionType;
  attackerUnitId: string;
  targetUnitId?: string;
}

@Injectable()
export class BattleService {
  private readonly logger = new Logger(BattleService.name);

  constructor(
    @InjectRepository(Battle)
    private readonly battleRepo: Repository<Battle>,
    @InjectRepository(BattleLog)
    private readonly logRepo: Repository<BattleLog>,
    private readonly engine: BattleEngineService,
    private readonly minio: MinioService,
    private readonly analytics: AnalyticsService,
  ) {}

  async createBattle(dto: CreateBattleDto): Promise<Battle> {
    if (dto.attackerId === dto.defenderId) {
      throw new BadRequestException('A player cannot battle themselves');
    }
    if (!dto.attackerUnits.length || !dto.defenderUnits.length) {
      throw new BadRequestException('Both armies must have at least one unit');
    }

    const attackerArmy: BattleArmy = {
      playerId: dto.attackerId,
      units: dto.attackerUnits.map((u) => ({ ...u, isAlive: true, hp: u.maxHp })),
    };
    const defenderArmy: BattleArmy = {
      playerId: dto.defenderId,
      units: dto.defenderUnits.map((u) => ({ ...u, isAlive: true, hp: u.maxHp })),
    };

    const battle = this.battleRepo.create({
      attackerId: dto.attackerId,
      defenderId: dto.defenderId,
      status: BattleStatus.IN_PROGRESS,
      attackerArmy: attackerArmy as unknown as object,
      defenderArmy: defenderArmy as unknown as object,
      attackerArmyState: attackerArmy as unknown as object,
      defenderArmyState: defenderArmy as unknown as object,
      currentTurn: 0,
      currentTurnSide: BattleSide.ATTACKER,
      startedAt: new Date(),
    });

    const saved = await this.battleRepo.save(battle);
    this.logger.log(`Battle created: ${saved.id} (${dto.attackerId} vs ${dto.defenderId})`);

    void this.analytics.trackServer({
      event_type: 'pvp.match_started',
      user_id: dto.attackerId,
      session_id: saved.id,
      properties: { battle_id: saved.id, defender_id: dto.defenderId, is_bot: false },
    });

    return saved;
  }

  async executeTurn(battleId: string, dto: ExecuteTurnDto): Promise<BattleLog> {
    const battle = await this.battleRepo.findOne({ where: { id: battleId } });
    if (!battle) throw new NotFoundException(`Battle ${battleId} not found`);
    if (battle.status !== BattleStatus.IN_PROGRESS) {
      throw new ConflictException(`Battle is not in progress (status: ${battle.status})`);
    }

    const attackerArmy = battle.attackerArmyState as unknown as BattleArmy;
    const defenderArmy = battle.defenderArmyState as unknown as BattleArmy;

    const state = this.engine.buildBattleState(
      battleId,
      attackerArmy,
      defenderArmy,
      battle.currentTurn,
      battle.currentTurnSide as BattleSide,
      battle.status,
    );

    const action: TurnAction = {
      battleId,
      playerId: dto.playerId,
      actionType: dto.actionType,
      attackerUnitId: dto.attackerUnitId,
      targetUnitId: dto.targetUnitId || '',
    };

    const result = this.engine.executeTurn(state, action);

    // Persist the log entry
    const log = this.logRepo.create({
      battleId,
      turnNumber: result.turnNumber,
      actionType: dto.actionType,
      actorPlayerId: dto.playerId,
      actorUnitId: result.attackerUnitId,
      actorUnitName: result.attackerUnitName,
      targetUnitId: result.defenderUnitId || null,
      targetUnitName: result.defenderUnitName || null,
      baseDamage: result.damageResult.baseDamage,
      finalDamage: result.damageResult.finalDamage,
      criticalHit: result.damageResult.criticalHit,
      blockedDamage: result.damageResult.blocked,
      targetRemainingHp: result.remainingHp,
      unitKilled: result.unitKilled,
      attackerArmyState: state.attackerArmy as unknown as object,
      defenderArmyState: state.defenderArmy as unknown as object,
      stateHash: result.stateHash,
    });
    const savedLog = await this.logRepo.save(log);

    if (result.battleEnded) {
      await this.finalizeBattle(battle, state, result.winner);
    } else {
      this.engine.advanceTurn(state);
      battle.currentTurn = state.currentTurn;
      battle.currentTurnSide = state.currentTurnSide;
      battle.attackerArmyState = state.attackerArmy as unknown as object;
      battle.defenderArmyState = state.defenderArmy as unknown as object;
      await this.battleRepo.save(battle);
    }

    return savedLog;
  }

  private async finalizeBattle(
    battle: Battle,
    state: any,
    winner: BattleSide | undefined,
  ): Promise<void> {
    const winnerId =
      winner === BattleSide.ATTACKER
        ? battle.attackerId
        : winner === BattleSide.DEFENDER
          ? battle.defenderId
          : null;

    battle.status = BattleStatus.COMPLETED;
    battle.winnerId = winnerId;
    battle.endedAt = new Date();
    battle.attackerArmyState = state.attackerArmy as unknown as object;
    battle.defenderArmyState = state.defenderArmy as unknown as object;

    const replayKey = await this.buildAndStoreReplay(battle, state);
    battle.replayKey = replayKey;

    await this.battleRepo.save(battle);
    this.logger.log(`Battle ${battle.id} completed. Winner: ${winnerId ?? 'draw'}`);

    const durationMs = battle.startedAt
      ? Date.now() - battle.startedAt.getTime()
      : undefined;

    for (const playerId of [battle.attackerId, battle.defenderId]) {
      const result = winnerId === playerId ? 'win' : winnerId ? 'loss' : 'draw';
      void this.analytics.trackServer({
        event_type: 'pvp.match_ended',
        user_id: playerId,
        session_id: battle.id,
        properties: {
          battle_id: battle.id,
          result,
          duration_ms: durationMs,
          total_turns: state.currentTurn,
        },
      });
    }
  }

  private async buildAndStoreReplay(battle: Battle, finalState: any): Promise<string | null> {
    try {
      const logs = await this.logRepo.find({
        where: { battleId: battle.id },
        order: { turnNumber: 'ASC' },
      });

      const frames: ReplayFrame[] = logs.map((log) => ({
        turn: log.turnNumber,
        action: {
          battleId: battle.id,
          playerId: log.actorPlayerId,
          actionType: log.actionType as BattleActionType,
          attackerUnitId: log.actorUnitId,
          targetUnitId: log.targetUnitId || '',
        },
        result: {
          turnNumber: log.turnNumber,
          attackerUnitId: log.actorUnitId,
          attackerUnitName: log.actorUnitName,
          defenderUnitId: log.targetUnitId || '',
          defenderUnitName: log.targetUnitName || '',
          damageResult: {
            baseDamage: log.baseDamage,
            criticalHit: log.criticalHit,
            critMultiplier: log.criticalHit ? 1.75 : 1.0,
            finalDamage: log.finalDamage,
            blocked: log.blockedDamage,
          },
          remainingHp: log.targetRemainingHp,
          unitKilled: log.unitKilled,
          battleEnded: false,
          stateHash: log.stateHash,
        },
        attackerArmyState: (log.attackerArmyState as any)?.units || [],
        defenderArmyState: (log.defenderArmyState as any)?.units || [],
        timestamp: log.createdAt.toISOString(),
      }));

      const replay: BattleReplay = {
        battleId: battle.id,
        attackerId: battle.attackerId,
        defenderId: battle.defenderId,
        winnerId: battle.winnerId,
        startedAt: battle.startedAt!.toISOString(),
        endedAt: battle.endedAt!.toISOString(),
        totalTurns: logs.length,
        frames,
        engineVersion: this.engine.getEngineVersion(),
      };

      const replayJson = JSON.stringify(replay, null, 2);
      return await this.minio.uploadReplay(battle.id, replayJson);
    } catch (err) {
      this.logger.error(`Failed to store replay for battle ${battle.id}: ${err.message}`);
      return null;
    }
  }

  async getBattle(battleId: string): Promise<Battle> {
    const battle = await this.battleRepo.findOne({ where: { id: battleId } });
    if (!battle) throw new NotFoundException(`Battle ${battleId} not found`);
    return battle;
  }

  async getBattleLogs(battleId: string): Promise<BattleLog[]> {
    return this.logRepo.find({
      where: { battleId },
      order: { turnNumber: 'ASC' },
    });
  }

  async getPlayerBattles(playerId: string, limit = 20, offset = 0): Promise<{ battles: Battle[]; total: number }> {
    const [battles, total] = await this.battleRepo
      .createQueryBuilder('b')
      .where('b.attacker_id = :playerId OR b.defender_id = :playerId', { playerId })
      .orderBy('b.created_at', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();
    return { battles, total };
  }

  async getReplayUrl(battleId: string): Promise<string> {
    const battle = await this.battleRepo.findOne({ where: { id: battleId } });
    if (!battle) throw new NotFoundException(`Battle ${battleId} not found`);
    if (!battle.replayKey) throw new NotFoundException('Replay not available for this battle');
    return this.minio.getReplayPresignedUrl(battle.replayKey);
  }

  async getReplayData(battleId: string): Promise<BattleReplay> {
    const battle = await this.battleRepo.findOne({ where: { id: battleId } });
    if (!battle) throw new NotFoundException(`Battle ${battleId} not found`);
    if (!battle.replayKey) throw new NotFoundException('Replay not available for this battle');
    const json = await this.minio.downloadReplay(battle.replayKey);
    return JSON.parse(json) as BattleReplay;
  }

  async verifyBattleIntegrity(battleId: string): Promise<{ valid: boolean; invalidTurns: number[] }> {
    const battle = await this.battleRepo.findOne({ where: { id: battleId } });
    if (!battle) throw new NotFoundException(`Battle ${battleId} not found`);

    const logs = await this.logRepo.find({
      where: { battleId },
      order: { turnNumber: 'ASC' },
    });

    const invalidTurns: number[] = [];
    let attackerArmy = { ...(battle.attackerArmy as unknown as BattleArmy) };
    let defenderArmy = { ...(battle.defenderArmy as unknown as BattleArmy) };

    for (const log of logs) {
      const action: TurnAction = {
        battleId,
        playerId: log.actorPlayerId,
        actionType: log.actionType as BattleActionType,
        attackerUnitId: log.actorUnitId,
        targetUnitId: log.targetUnitId || '',
      };
      const expectedHash = this.engine.computeStateHash(
        battleId,
        log.turnNumber,
        action,
        {
          baseDamage: log.baseDamage,
          criticalHit: log.criticalHit,
          critMultiplier: log.criticalHit ? 1.75 : 1.0,
          finalDamage: log.finalDamage,
          blocked: log.blockedDamage,
        },
        log.attackerArmyState as unknown as BattleArmy,
        log.defenderArmyState as unknown as BattleArmy,
      );

      if (expectedHash !== log.stateHash) {
        invalidTurns.push(log.turnNumber);
      }
    }

    return { valid: invalidTurns.length === 0, invalidTurns };
  }

  async abandonBattle(battleId: string, playerId: string): Promise<Battle> {
    const battle = await this.battleRepo.findOne({ where: { id: battleId } });
    if (!battle) throw new NotFoundException(`Battle ${battleId} not found`);
    if (battle.status !== BattleStatus.IN_PROGRESS) {
      throw new ConflictException('Battle is not in progress');
    }
    if (battle.attackerId !== playerId && battle.defenderId !== playerId) {
      throw new BadRequestException('Player is not part of this battle');
    }

    const winnerId = battle.attackerId === playerId ? battle.defenderId : battle.attackerId;
    battle.status = BattleStatus.ABANDONED;
    battle.winnerId = winnerId;
    battle.endedAt = new Date();
    const saved = await this.battleRepo.save(battle);

    void this.analytics.trackServer({
      event_type: 'pvp.match_ended',
      user_id: playerId,
      session_id: battleId,
      properties: { battle_id: battleId, result: 'abandoned' },
    });

    return saved;
  }
}
