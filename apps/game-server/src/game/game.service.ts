import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private readonly maxRoundMs: number;

  constructor(
    private readonly rooms: RoomService,
    private readonly sessions: SessionService,
    private readonly elo: EloService,
    private readonly antiCheat: AntiCheatService,
    private readonly emitter: EventEmitter2,
    private readonly config: ConfigService,
    private readonly progression: ProgressionService,
  ) {
    this.maxRoundMs = config.get<number>('game.maxRoundDurationMs', 30000);
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

    const violation = this.antiCheat.validate(userId, dto, room);
    if (violation) return fail(violation);

    switch (dto.type) {
      case ActionType.ATTACK:       return this.handleAttack(userId, dto, room);
      case ActionType.MOVE_UNIT:    return this.handleMove(userId, dto, room);
      case ActionType.DEPLOY_UNIT:  return this.handleDeploy(userId, dto, room);
      case ActionType.USE_ABILITY:  return this.handleAbility(userId, dto, room);
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

    const damage = Math.max(1, attacker.attack - target.defense);
    target.hp -= damage;
    attacker.actionUsed = true;

    const events: GameEvent[] = [
      { type: 'unit_attacked', data: { attackerUnitId, targetUnitId, damage, targetHp: target.hp } },
    ];

    if (target.hp <= 0) {
      room.players[opponentId].units = room.players[opponentId].units.filter((u) => u.id !== targetUnitId);
      events.push({ type: 'unit_died', data: { unitId: targetUnitId, ownerId: opponentId } });

      if (room.players[opponentId].units.length === 0) {
        return this.finishGame(userId, opponentId, room, events, dto.sequenceNumber);
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

    // Server-side movement validation
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

    room.players[userId].lastActionSequence = dto.sequenceNumber;
    await this.rooms.save(room);
    return { success: true, room, events: [{ type: 'unit_deployed', data: { ...dto.payload } }] };
  }

  private async handleAbility(userId: string, dto: GameActionDto, room: GameRoom): Promise<ActionResult> {
    if (room.currentPlayerId !== userId) return fail('Not your turn');

    const { unitId } = dto.payload as any;
    const unit = this.findUnit(room, userId, unitId);
    if (!unit) return fail('Unit not found');
    if (unit.actionUsed) return fail('Unit already acted this turn');

    const manaCost = 10;
    if (room.players[userId].mana < manaCost) return fail('Not enough mana');

    room.players[userId].mana -= manaCost;
    unit.actionUsed = true;
    room.players[userId].lastActionSequence = dto.sequenceNumber;
    await this.rooms.save(room);
    return { success: true, room, events: [{ type: 'ability_used', data: { ...dto.payload } }] };
  }

  private async handleEndTurn(userId: string, dto: GameActionDto, room: GameRoom): Promise<ActionResult> {
    if (room.currentPlayerId !== userId) return fail('Not your turn');

    room.players[userId].units.forEach((u) => { u.actionUsed = false; });

    const opponentId = this.opponentOf(room, userId);
    room.currentPlayerId = opponentId;
    room.currentTurn++;
    room.turnStartedAt = Date.now();
    room.phase = TurnPhase.ACTION;

    // Mana regeneration
    room.players[opponentId].mana = Math.min(100, room.players[opponentId].mana + 10);

    room.players[userId].lastActionSequence = dto.sequenceNumber;
    await this.rooms.save(room);

    return {
      success: true,
      room,
      events: [{ type: 'turn_ended', data: { nextPlayerId: opponentId, turn: room.currentTurn } }],
    };
  }

  private async handleSurrender(userId: string, room: GameRoom): Promise<ActionResult> {
    const opponentId = this.opponentOf(room, userId);
    return this.finishGame(opponentId, userId, room, [
      { type: 'player_surrendered', data: { userId } },
    ], -1);
  }

  async checkTurnTimeout(roomId: string): Promise<ActionResult | null> {
    const room = await this.rooms.get(roomId);
    if (!room || room.status !== GameStatus.IN_PROGRESS) return null;

    if (Date.now() - room.turnStartedAt < this.maxRoundMs) return null;

    this.logger.warn(`Turn timeout in room ${roomId} for player ${room.currentPlayerId}`);
    const dto: GameActionDto = { roomId, type: ActionType.END_TURN, sequenceNumber: -1 };
    return this.handleEndTurn(room.currentPlayerId, dto, room);
  }

  private async finishGame(
    winnerId: string,
    loserId: string,
    room: GameRoom,
    events: GameEvent[],
    lastSeq: number,
  ): Promise<ActionResult> {
    room.status = GameStatus.FINISHED;
    room.winner = winnerId;

    const winner = room.players[winnerId];
    const loser = room.players[loserId];

    const winResult = this.elo.calculate(winner.elo, loser.elo, true, winner.gamesPlayed);
    const loseResult = this.elo.calculate(loser.elo, winner.elo, false, loser.gamesPlayed);

    events.push({
      type: 'game_over',
      data: {
        winner: winnerId,
        loser: loserId,
        eloDelta: { [winnerId]: winResult.delta, [loserId]: loseResult.delta },
        newElo: { [winnerId]: winResult.newElo, [loserId]: loseResult.newElo },
      },
    });

    if (lastSeq >= 0) room.players[winnerId].lastActionSequence = lastSeq;
    await this.rooms.save(room);

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
