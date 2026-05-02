import { io, Socket } from 'socket.io-client';

const GAME_SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:3001';

export interface UnitState {
  id: string;
  type: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  position: { x: number; y: number };
  actionUsed: boolean;
}

export interface PlayerState {
  userId: string;
  race: string;
  hp: number;
  mana: number;
  units: UnitState[];
  connected: boolean;
}

export interface GameRoom {
  id: string;
  status: string;
  mode: string;
  currentTurn: number;
  currentPlayerId: string;
  phase: string;
  players: Record<string, PlayerState>;
  winner?: string;
}

export interface BattleRewards {
  minerals: number;
  gas: number;
  xp: number;
  eloDelta: number;
  bonuses: string[];
}

export type GameEventHandler = (data: Record<string, unknown>) => void;

export class GameSocket {
  private pveSocket: Socket;
  private gameSocket: Socket;
  private handlers = new Map<string, GameEventHandler[]>();

  roomId: string | null = null;
  myUserId: string;
  myRace: string;

  constructor(userId: string, race: string) {
    this.myUserId = userId;
    this.myRace = race;

    // Demo token — real app would get this from auth
    const token = btoa(JSON.stringify({ sub: userId }));

    this.pveSocket = io(`${GAME_SERVER_URL}/pve`, {
      auth: { token },
      autoConnect: false,
    });

    this.gameSocket = io(`${GAME_SERVER_URL}/game`, {
      auth: { token },
      autoConnect: false,
    });

    this.wireGameEvents();
  }

  private wireGameEvents() {
    const passThrough = (event: string) => {
      this.gameSocket.on(event, (data: Record<string, unknown>) => this.emit(event, data));
    };

    ['state_update', 'unit_attacked', 'unit_died', 'unit_moved', 'unit_deployed',
      'ability_used', 'turn_ended', 'game_over', 'player_surrendered',
      'player_disconnected', 'player_reconnected'].forEach(passThrough);

    this.pveSocket.on('pve_game_ready', async (data: Record<string, unknown>) => {
      this.roomId = data.roomId as string;
      this.emit('pve_game_ready', data);

      // Join the game room socket
      this.gameSocket.connect();
      await new Promise<void>((r) => this.gameSocket.once('connect', r));
      this.gameSocket.emit('join_room', { roomId: this.roomId });
    });

    this.gameSocket.on('room_joined', (data: Record<string, unknown>) => {
      this.emit('room_joined', data);
    });

    this.gameSocket.on('full_state_sync', (data: Record<string, unknown>) => {
      this.emit('full_state_sync', data);
    });
  }

  startPve(botRace?: string) {
    this.pveSocket.connect();
    this.pveSocket.emit('start_pve', {
      race: this.myRace,
      botRace,
      playerElo: 1000,
      playerGamesPlayed: 0,
    });
  }

  sendAction(type: string, payload?: Record<string, unknown>) {
    if (!this.roomId) return;
    this.gameSocket.emit('game_action', {
      roomId: this.roomId,
      type,
      sequenceNumber: Date.now(),
      payload,
    });
  }

  requestSync() {
    if (!this.roomId) return;
    this.gameSocket.emit('request_sync', { roomId: this.roomId });
  }

  on(event: string, handler: GameEventHandler) {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  off(event: string, handler: GameEventHandler) {
    const list = this.handlers.get(event) ?? [];
    this.handlers.set(event, list.filter((h) => h !== handler));
  }

  private emit(event: string, data: Record<string, unknown>) {
    const handlers = this.handlers.get(event) ?? [];
    handlers.forEach((h) => h(data));
  }

  destroy() {
    this.pveSocket.disconnect();
    this.gameSocket.disconnect();
    this.handlers.clear();
  }
}
