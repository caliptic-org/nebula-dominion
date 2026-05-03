import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { EloService } from '../matchmaking/elo.service';
import { MatchResult } from '../matchmaking/matchmaking.service';
import { RoomService, GameRoom, GameStatus, TurnPhase, UnitState } from './room.service';
import { SessionService } from './session.service';
import { ActionType, GameActionDto } from './dto/game-action.dto';
import { AntiCheatService } from '../anti-cheat/anti-cheat.service';
import { ProgressionService } from '../progression/progression.service';
import { XpSource } from '../progression/config/level-config';
import { MergeService } from './merge/merge.service';

const BOT_USER_ID_PREFIX = 'bot:';
const GRID_WIDTH = 8;
const GRID_HEIGHT = 6;
const SKILL_COOLDOWNS: Record<number, number> = { 0: 2, 1: 3, 2: 4, 3: 5 };

export interface GameCreatedEvent {
  match: MatchResult;
  room: GameRoom;
  tokens: Record<string, string>;
}

export interface GameEvent {
  type: string;
  data: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  room: GameRoom | null;
  events: GameEvent[];
  error?: string;
}

export interface GameActionResultEvent {
  roomId: string;
  result: ActionResult;
}

@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameService.name);
  private readonly maxRoundMs: number;
  private timeoutTimer: NodeJS.Timeout;
  private readonly rewards = {
    calculate: (isWin: boolean, totalTurns: number, eloDelta: number, isPvE: boolean) => ({
      xp: isWin ? 100 : 25,
      bonus: isPvE ? 0 : Math.round(Math.abs(eloDelta) * 0.5),
      turns: totalTurns,
    }),
  };

  constructor(
    private readonly rooms: RoomService,
    private readonly sessions: SessionService,
    private readonly elo: EloService,
    private readonly antiCheat: AntiCheatService,
    private readonly emitter: EventEmitter2,
    private readonly config: ConfigService,
    private readonly progression: ProgressionService,
    private readonly mergeService: MergeService,
  ) {
    this.maxRoundMs = config.get<number>('game.maxRoundDurationMs', 30000);
  }

  onModuleInit(): void {
    this.timeoutTimer = setInterval(() => this.tickTurnTimeouts(), 5000);
    this.logger.log('Turn timeout scheduler started');
  }

  onModuleDestroy(): void {
    clearInterval(this.timeoutTimer);
  }

  @OnEvent('matchmaking.matched')
  async onMatchFound(match: MatchResult): Promise<void> {
    const { matchId, player1, player2 } = match;

    const room = await this.rooms.create(
      matchId,
      { userId: player1.userId, socketId: player1.socketId, race: player1.race, elo: player1.elo, gamesPlayed: player1.gamesPlayed },
      { userId: player2.userId, socketId: player2.socketId, race: player2.race, elo: player2.elo, gamesPlayed: player2.gamesPlayed },
      player1.mode,
    );

    const [token1, token2] = await Promise.all([
      this.rooms.setUserRoom(player1.userId, room.id).then(() => this.sessions.create(player1.userId, room.id, player1.socketId)),
      this.rooms.setUserRoom(player2.userId, room.id).then(() => this.sessions.create(player2.userId, room.id, player2.socketId)),
    ]);

    room.status = GameStatus.IN_PROGRESS;
    await this.rooms.save(room);
    await this.rooms.addToActiveRooms(room.id);

    this.logger.log(`Game created: room=${room.id} match=${matchId}`);

    const event: GameCreatedEvent = {
      match,
      room,
      tokens: { [player1.userId]: token1, [player2.userId]: token2 },
    };
    this.emitter.emit('game.created', event);
  }

  async processAction(userId: string, dto: GameActionDto): Promise<ActionResult> {
    const room = await this.rooms.get(dto.roomId);
    if (!room) return fail('Room not found');

    // Skip anti-cheat for bot players
    if (!userId.startsWith(BOT_USER_ID_PREFIX)) {
      const violation = this.antiCheat.validate(userId, dto, room);
      if (violation) return fail(violation);
    }

    switch (dto.type) {
      case ActionType.ATTACK:       return this.handleAttack(userId, dto, room);
      case ActionType.MOVE_UNIT:    return this.handleMove(userId, dto, room);
      case ActionType.DEPLOY_UNIT:  return this.handleDeploy(userId, dto, room);
      case ActionType.USE_ABILITY:  return this.handleAbility(userId, dto, room);
      case ActionType.MERGE_UNITS:  return this.handleMerge(userId, dto, room);
      case ActionType.MUTATE_UNIT:  return this.handleMutate(userId, dto, room);
      case ActionType.END_TURN:     return this.handleEndTurn(userId, dto, room);
      case ActionType.SURRENDER:    return this.handleSurrender(userId, room);
      default:                      return fail('Unknown action type');
    }
  }

  private async handleAttack(userId: string, dto: GameActionDto, room: GameRoom): Promise<ActionResult> {
    if (room.currentPlayerId !== userId) return fail('Not your turn');
    if (room.phase !== TurnPhase.ACTION) return fail('Not action phase');

    const { attackerUnitId, targetUnitId } = dto.payload as any;
    const opponentId = this.opponentOf(room, userId);
    const attacker = this.findUnit(room, userId, attackerUnitId);
    const target = this.findUnit(room, opponentId, targetUnitId);

    if (!attacker) return fail('Attacker unit not found');
    if (!target) return fail('Target unit not found');
    if (attacker.actionUsed) return fail('Unit already acted this turn');

    const isCrit = Math.random() < 0.15;
    const baseDamage = Math.max(1, attacker.attack - target.defense);
    const damage = isCrit ? Math.round(baseDamage * 1.75) : baseDamage;
    target.hp -= damage;
    attacker.actionUsed = true;

    const events: GameEvent[] = [
      { type: 'unit_attacked', data: { attackerUnitId, targetUnitId, damage, targetHp: target.hp } },
      {
        type: 'battle_event',
        data: { type: 'damage', actorName: attacker.type, targetName: target.type, value: damage, isCrit },
      },
    ];

    if (target.hp <= 0) {
      room.players[opponentId].units = room.players[opponentId].units.filter((u) => u.id !== targetUnitId);
      events.push({ type: 'unit_died', data: { unitId: targetUnitId, ownerId: opponentId } });
      events.push({
        type: 'battle_event',
        data: { type: 'death', actorName: attacker.type, targetName: target.type, value: 0, isCrit: false },
      });

      if (room.players[opponentId].units.length === 0) {
        return this.finishGame(userId, opponentId, room, events, dto.sequenceNumber, 'all_units_destroyed');
      }
    }

    room.players[userId].lastActionSequence = dto.sequenceNumber;
    await this.rooms.save(room);
    return { success: true, room, events };
  }

  private async handleMove(userId: string, dto: GameActionDto, room: GameRoom): Promise<ActionResult> {
    if (room.currentPlayerId !== userId) return fail('Not your turn');

    const { unitId, position } = dto.payload as any;
    const unit = this.findUnit(room, userId, unitId);
    if (!unit) return fail('Unit not found');
    if (unit.actionUsed) return fail('Unit already acted this turn');

    const dx = Math.abs(unit.position.x - position.x);
    const dy = Math.abs(unit.position.y - position.y);
    if (dx + dy > unit.speed) return fail('Move distance exceeds unit speed');

    unit.position = { x: position.x, y: position.y };
    unit.actionUsed = true;
    room.players[userId].lastActionSequence = dto.sequenceNumber;
    await this.rooms.save(room);
    return { success: true, room, events: [{ type: 'unit_moved', data: { unitId, position } }] };
  }

  private async handleDeploy(userId: string, dto: GameActionDto, room: GameRoom): Promise<ActionResult> {
    if (room.phase !== TurnPhase.DEPLOY) return fail('Not deploy phase');

    const { unitId, position } = dto.payload as any;

    const unit = this.findUnit(room, userId, unitId);
    if (!unit) return fail('Unit not found or not owned by player');

    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      return fail('Invalid position');
    }
    if (position.x < 0 || position.x >= GRID_WIDTH || position.y < 0 || position.y >= GRID_HEIGHT) {
      return fail('Position out of bounds');
    }

    unit.position = { x: position.x, y: position.y };
    room.players[userId].lastActionSequence = dto.sequenceNumber;
    await this.rooms.save(room);
    return { success: true, room, events: [{ type: 'unit_deployed', data: { unitId, position } }] };
  }

  private async handleAbility(userId: string, dto: GameActionDto, room: GameRoom): Promise<ActionResult> {
    if (room.currentPlayerId !== userId) return fail('Not your turn');

    const { unitId, skillIndex = 0 } = dto.payload as any;
    if (skillIndex < 0 || skillIndex > 3) return fail('Invalid skill index');

    const unit = this.findUnit(room, userId, unitId);
    if (!unit) return fail('Unit not found');
    if (unit.actionUsed) return fail('Unit already acted this turn');

    if (!unit.skillCooldowns) unit.skillCooldowns = [0, 0, 0, 0];
    if (!unit.skillCooldownMax) unit.skillCooldownMax = [0, 0, 0, 0];
    if (unit.skillCooldowns[skillIndex] > 0) return fail('Skill is on cooldown');

    const manaCost = 10;
    if (room.players[userId].mana < manaCost) return fail('Not enough mana');

    const cooldown = SKILL_COOLDOWNS[skillIndex] ?? 2;
    room.players[userId].mana -= manaCost;
    unit.skillCooldowns[skillIndex] = cooldown;
    unit.skillCooldownMax[skillIndex] = cooldown;
    unit.actionUsed = true;
    room.players[userId].lastActionSequence = dto.sequenceNumber;
    await this.rooms.save(room);

    return {
      success: true,
      room,
      events: [
        { type: 'ability_used', data: { unitId, skillIndex, cooldown } },
        {
          type: 'battle_event',
          data: { type: 'ability', actorName: unit.type, targetName: '', value: 0, isCrit: false },
        },
      ],
    };
  }

  private async handleEndTurn(userId: string, dto: GameActionDto, room: GameRoom): Promise<ActionResult> {
    if (room.currentPlayerId !== userId) return fail('Not your turn');

    const abilityReadyEvents: GameEvent[] = [];
    room.players[userId].units.forEach((u) => {
      u.actionUsed = false;
      if (u.skillCooldowns) {
        u.skillCooldowns = u.skillCooldowns.map((cd, skillIndex) => {
          if (cd <= 0) return 0;
          const next = cd - 1;
          if (next === 0) {
            abilityReadyEvents.push({
              type: 'ability_ready',
              data: { skillIndex, cooldown: u.skillCooldownMax?.[skillIndex] ?? 0 },
            });
          }
          return next;
        });
      }
    });

    const opponentId = this.opponentOf(room, userId);
    room.currentPlayerId = opponentId;
    room.currentTurn++;
    room.turnStartedAt = Date.now();
    room.phase = TurnPhase.ACTION;

    room.players[opponentId].mana = Math.min(100, room.players[opponentId].mana + 10);

    room.players[userId].lastActionSequence = dto.sequenceNumber;
    await this.rooms.save(room);

    const result: ActionResult = {
      success: true,
      room,
      events: [
        { type: 'turn_ended', data: { nextPlayerId: opponentId, turn: room.currentTurn } },
        {
          type: 'battle_event',
          data: { type: 'turn_start', actorName: opponentId, targetName: '', value: room.currentTurn, isCrit: false },
        },
        ...abilityReadyEvents,
      ],
    };

    // Notify PveService to run bot turn if needed
    this.emitter.emit('game.turn_ended', { room, newPlayerId: opponentId });

    return result;
  }

  private async handleMerge(userId: string, dto: GameActionDto, room: GameRoom): Promise<ActionResult> {
    if (room.currentPlayerId !== userId) return fail('Not your turn');
    if (room.phase !== TurnPhase.ACTION) return fail('Not action phase');

    const { unitIds } = dto.payload as { unitIds: string[] };
    if (!Array.isArray(unitIds) || unitIds.length < 2) return fail('Merge requires at least 2 unit IDs');

    const playerUnits = room.players[userId].units;
    const sourceUnits = unitIds.map((id) => playerUnits.find((u) => u.id === id)).filter(Boolean) as UnitState[];
    if (sourceUnits.length !== unitIds.length) return fail('One or more units not found');
    if (sourceUnits.some((u) => u.actionUsed)) return fail('Cannot merge units that have already acted this turn');

    const unitTypes = sourceUnits.map((u) => u.type);
    const recipe = this.mergeService.findRecipe(unitTypes);
    if (!recipe) return fail(`No merge recipe found for: ${unitTypes.sort().join(' + ')}`);

    const { mergedUnit, removedUnitIds } = this.mergeService.merge(sourceUnits, recipe);

    room.players[userId].units = playerUnits
      .filter((u) => !removedUnitIds.includes(u.id))
      .concat(mergedUnit);

    room.players[userId].lastActionSequence = dto.sequenceNumber;
    await this.rooms.save(room);

    return {
      success: true,
      room,
      events: [
        {
          type: 'units_merged',
          data: {
            removedUnitIds,
            mergedUnit,
            recipeId: recipe.id,
            ownerId: userId,
            availableMutations: recipe.mutations,
          },
        },
      ],
    };
  }

  private async handleMutate(userId: string, dto: GameActionDto, room: GameRoom): Promise<ActionResult> {
    if (room.currentPlayerId !== userId) return fail('Not your turn');

    const { unitId, mutationId } = dto.payload as { unitId: string; mutationId: string };
    const unit = this.findUnit(room, userId, unitId);
    if (!unit) return fail('Unit not found');

    const result = this.mergeService.mutate(unit, mutationId);
    if (!result) return fail(`Mutation '${mutationId}' is not available for unit type '${unit.type}'`);

    const { manaCost, unlockedAbility, mutation } = result;
    if (room.players[userId].mana < manaCost) return fail('Not enough mana');

    room.players[userId].mana -= manaCost;
    room.players[userId].lastActionSequence = dto.sequenceNumber;
    await this.rooms.save(room);

    const availableNext = this.mergeService.getAvailableMutationsForUnit(unit);

    return {
      success: true,
      room,
      events: [
        {
          type: 'unit_mutated',
          data: {
            unitId,
            ownerId: userId,
            mutationId,
            mutationName: mutation.name,
            manaCost,
            unlockedAbility: unlockedAbility ?? null,
            unitStats: {
              attack: unit.attack,
              defense: unit.defense,
              speed: unit.speed,
              hp: unit.hp,
              maxHp: unit.maxHp,
            },
            appliedMutations: unit.appliedMutations,
            abilities: unit.abilities,
            nextAvailableMutations: availableNext,
          },
        },
      ],
    };
  }

  private async handleSurrender(userId: string, room: GameRoom): Promise<ActionResult> {
    const opponentId = this.opponentOf(room, userId);
    return this.finishGame(opponentId, userId, room, [
      { type: 'player_surrendered', data: { userId } },
    ], -1, 'surrender');
  }

  async checkTurnTimeout(roomId: string): Promise<ActionResult | null> {
    const room = await this.rooms.get(roomId);
    if (!room || room.status !== GameStatus.IN_PROGRESS) return null;

    if (Date.now() - room.turnStartedAt < this.maxRoundMs) return null;

    this.logger.warn(`Turn timeout in room ${roomId} for player ${room.currentPlayerId}`);
    const dto: GameActionDto = { roomId, type: ActionType.END_TURN, sequenceNumber: -1 };
    return this.handleEndTurn(room.currentPlayerId, dto, room);
  }

  private async tickTurnTimeouts(): Promise<void> {
    const roomIds = await this.rooms.getActiveRoomIds();
    for (const roomId of roomIds) {
      try {
        const result = await this.checkTurnTimeout(roomId);
        if (result?.success) {
          const event: GameActionResultEvent = { roomId, result };
          this.emitter.emit('game.action_result', event);
        }
      } catch (err) {
        this.logger.error(`Turn timeout check error for room ${roomId}`, (err as Error).stack);
      }
    }
  }

  private async finishGame(
    winnerId: string,
    loserId: string,
    room: GameRoom,
    events: GameEvent[],
    lastSeq: number,
    endReason: string,
  ): Promise<ActionResult> {
    room.status = GameStatus.FINISHED;
    room.winner = winnerId;

    const winner = room.players[winnerId];
    const loser = room.players[loserId];

    const isPvE = winnerId.startsWith(BOT_USER_ID_PREFIX) || loserId.startsWith(BOT_USER_ID_PREFIX);

    const winResult = this.elo.calculate(winner.elo, loser.elo, true, winner.gamesPlayed);
    const loseResult = this.elo.calculate(loser.elo, winner.elo, false, loser.gamesPlayed);

    const totalTurns = room.currentTurn;
    const durationMs = Date.now() - room.createdAt;

    const winnerRewards = this.rewards.calculate(true, totalTurns, winResult.delta, isPvE);
    const loserRewards = this.rewards.calculate(false, totalTurns, loseResult.delta, isPvE);

    events.push({
      type: 'game_end',
      data: {
        winner: winnerId,
        loser: loserId,
        endReason,
        eloDelta: { [winnerId]: winResult.delta, [loserId]: loseResult.delta },
        newElo: { [winnerId]: winResult.newElo, [loserId]: loseResult.newElo },
        rewards: { [winnerId]: winnerRewards, [loserId]: loserRewards },
      },
    });

    if (lastSeq >= 0) room.players[winnerId].lastActionSequence = lastSeq;
    await this.rooms.save(room);
    await this.rooms.removeFromActiveRooms(room.id);

    this.logger.log(`Game over: room=${room.id} winner=${winnerId} loser=${loserId}`);

    // Award XP asynchronously — fire-and-forget so it doesn't block game response
    Promise.all([
      this.progression.awardXp({ userId: winnerId, source: XpSource.BATTLE_WIN, referenceId: room.id }),
      this.progression.awardXp({ userId: loserId, source: XpSource.BATTLE_LOSS, referenceId: room.id }),
    ]).catch((err) => this.logger.error(`Failed to award battle XP: ${err.message}`));

    return { success: true, room, events };
  }

  private opponentOf(room: GameRoom, userId: string): string {
    return Object.keys(room.players).find((id) => id !== userId)!;
  }

  private findUnit(room: GameRoom, userId: string, unitId: string): UnitState | undefined {
    return room.players[userId]?.units.find((u) => u.id === unitId);
  }
}

function fail(error: string): ActionResult {
  return { success: false, room: null, events: [], error };
}
