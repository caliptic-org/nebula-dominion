import { AntiCheatService } from './anti-cheat.service';
import { ConfigService } from '@nestjs/config';
import { GameRoom, GameStatus, TurnPhase } from '../game/room.service';
import { ActionType, GameActionDto } from '../game/dto/game-action.dto';
import { Race } from '../matchmaking/dto/join-queue.dto';

const mockConfig = { get: (key: string, def: any) => def } as any as ConfigService;

function buildRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    id: 'room-1',
    matchId: 'match-1',
    status: GameStatus.IN_PROGRESS,
    mode: 'ranked',
    currentTurn: 1,
    currentPlayerId: 'user-1',
    phase: TurnPhase.ACTION,
    players: {
      'user-1': {
        userId: 'user-1', socketId: 's1', race: Race.HUMAN,
        elo: 1000, gamesPlayed: 10, hp: 100, mana: 50,
        units: [], connected: true, lastActionSequence: 0,
      },
      'user-2': {
        userId: 'user-2', socketId: 's2', race: Race.ZERG,
        elo: 1000, gamesPlayed: 10, hp: 100, mana: 50,
        units: [], connected: true, lastActionSequence: 0,
      },
    },
    stateHash: 'abc',
    createdAt: Date.now(),
    turnStartedAt: Date.now(),
    ...overrides,
  };
}

function buildDto(overrides: Partial<GameActionDto> = {}): GameActionDto {
  return {
    roomId: 'room-1',
    type: ActionType.ATTACK,
    sequenceNumber: 1,
    ...overrides,
  };
}

describe('AntiCheatService', () => {
  let svc: AntiCheatService;

  beforeEach(() => {
    svc = new AntiCheatService(mockConfig);
  });

  it('returns null for a valid action', () => {
    expect(svc.validate('user-1', buildDto(), buildRoom())).toBeNull();
  });

  it('rejects player not in room', () => {
    expect(svc.validate('unknown', buildDto(), buildRoom())).toBeTruthy();
  });

  it('rejects action when game is not in progress', () => {
    const room = buildRoom({ status: GameStatus.FINISHED });
    expect(svc.validate('user-1', buildDto(), room)).toBeTruthy();
  });

  it('rejects duplicate sequence number', () => {
    const room = buildRoom();
    room.players['user-1'].lastActionSequence = 5;
    expect(svc.validate('user-1', buildDto({ sequenceNumber: 5 }), room)).toBeTruthy();
  });

  it('rejects offensive action when not player turn', () => {
    expect(svc.validate('user-2', buildDto({ type: ActionType.ATTACK }), buildRoom())).toBeTruthy();
  });

  it('rejects oversized payload', () => {
    const largePayload = { data: 'x'.repeat(5000) };
    expect(svc.validate('user-1', buildDto({ payload: largePayload }), buildRoom())).toBeTruthy();
  });

  it('enforces rate limit after maxActionsPerSecond', () => {
    const configWithLimit = { get: (key: string, def: any) => (key === 'game.maxActionsPerSecond' ? 3 : def) } as any;
    const limited = new AntiCheatService(configWithLimit);
    const room = buildRoom();

    // First 3 actions within 1 second should pass
    for (let i = 0; i < 3; i++) {
      expect(limited.validate('user-1', buildDto({ sequenceNumber: i + 1 }), room)).toBeNull();
      // bump lastActionSequence to avoid duplicate check
      room.players['user-1'].lastActionSequence = i + 1;
    }

    // 4th should be rate-limited
    expect(limited.validate('user-1', buildDto({ sequenceNumber: 4 }), room)).toMatch(/rate limit/i);
  });
});
