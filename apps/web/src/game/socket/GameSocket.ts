import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/session';
import { toast } from '@/components/handoff/Toaster';

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

/**
 * GameSocket — Socket.io client wrapper for the `/pve` and `/game` namespaces.
 *
 * Auth contract (cycle 6 fix):
 *   Earlier revisions of this client used a "demo stub" token built with
 *   `btoa(JSON.stringify({ sub: userId }))`. That worked against a permissive
 *   WsAuth guard during early prototyping, but the production `WsJwtGuard`
 *   (apps/game-server) calls `jwtService.verify(token)` and rejects anything
 *   that is not a real signed JWT — the stub silently threw `WsException`
 *   server-side and the client disconnected without surfacing any error
 *   (no `connect_error` listener was wired), so PvE buttons looked dead.
 *
 *   The client now reads the real access token via `getAccessToken()` from
 *   `@/lib/session` (the same store the REST API client uses) and passes it
 *   through Socket.io's `auth.token` field. The backend mints these tokens
 *   in `/api/v1/auth/login` against the shared `JWT_SECRET` so the same
 *   token verifies on both REST and WS layers.
 *
 *   On the wire side we register `connect_error`, `exception`, and
 *   `disconnect` listeners on both sockets so Turkish WsException messages
 *   from the backend (cycle 7/8) surface as user-visible toasts instead of
 *   vanishing into the console.
 *
 *   If the user is unauthenticated at construction time we set
 *   `this.authError = true`, skip the socket wiring, and let `startPve()`
 *   redirect to `/login` with a toast — better than connecting with `null`
 *   and watching the server hang up.
 */
export class GameSocket {
  private pveSocket: Socket | null = null;
  private gameSocket: Socket | null = null;
  private handlers = new Map<string, GameEventHandler[]>();
  /** True when no access token was available at construction time. */
  private authError = false;

  roomId: string | null = null;
  myUserId: string;
  myRace: string;

  constructor(userId: string, race: string) {
    this.myUserId = userId;
    this.myRace = race;

    // Pull the real JWT minted by /api/v1/auth/login. Backend WsJwtGuard
    // verifies this with the same JWT_SECRET — see CLAUDE.md §1.
    const token = getAccessToken();

    if (!token) {
      // No session → defer the actual connection and surface the failure
      // when the user tries to start a match. We can't redirect from a
      // constructor (no router here), so we mark and let startPve handle it.
      this.authError = true;
      return;
    }

    this.pveSocket = io(`${GAME_SERVER_URL}/pve`, {
      auth: { token },
      autoConnect: false,
    });

    this.gameSocket = io(`${GAME_SERVER_URL}/game`, {
      auth: { token },
      autoConnect: false,
    });

    this.wireGameEvents();
    this.wireErrorListeners();
  }

  private wireGameEvents() {
    if (!this.pveSocket || !this.gameSocket) return;
    const gameSocket = this.gameSocket;

    const passThrough = (event: string) => {
      gameSocket.on(event, (data: Record<string, unknown>) => this.emit(event, data));
    };

    ['state_update', 'unit_attacked', 'unit_died', 'unit_moved', 'unit_deployed',
      'ability_ready', 'ability_used', 'battle_event', 'turn_ended',
      'game_over', 'player_surrendered',
      'player_disconnected', 'player_reconnected'].forEach(passThrough);

    this.pveSocket.on('pve_game_ready', async (data: Record<string, unknown>) => {
      this.roomId = data.roomId as string;
      this.emit('pve_game_ready', data);

      // Join the game room socket
      gameSocket.connect();
      await new Promise<void>((r) => gameSocket.once('connect', r));
      gameSocket.emit('join_room', { roomId: this.roomId });
    });

    gameSocket.on('room_joined', (data: Record<string, unknown>) => {
      this.emit('room_joined', data);
    });

    gameSocket.on('full_state_sync', (data: Record<string, unknown>) => {
      this.emit('full_state_sync', data);
    });
  }

  /**
   * Surface backend disconnect / auth failures as toast messages.
   *
   * `WsJwtGuard` throws WsException with Turkish messages (cycle 7/8),
   * which Socket.io delivers via the `exception` event before tearing
   * down the connection. `connect_error` fires when the handshake itself
   * is rejected (bad token, CORS, server down).
   */
  private wireErrorListeners() {
    if (!this.pveSocket || !this.gameSocket) return;

    const onConnectError = (label: 'PvE' | 'Game') => (err: Error) => {
      const msg = err?.message || 'Sunucuya bağlanılamadı';
      toast.error(msg);
      // eslint-disable-next-line no-console
      console.error(`${label} connect_error:`, err);
    };
    const onException = (label: 'PvE' | 'Game') => (err: { message?: string } | Error) => {
      const msg = (err as { message?: string })?.message || 'Yetkisiz işlem';
      toast.error(msg);
      // eslint-disable-next-line no-console
      console.warn(`${label} exception:`, err);
    };
    const onDisconnect = (label: 'PvE' | 'Game') => (reason: string) => {
      // eslint-disable-next-line no-console
      console.warn(`${label} disconnect:`, reason);
      // "io server disconnect" → server kicked us (usually auth). Anything
      // else is typically a transient network blip; Socket.io will retry.
      if (reason === 'io server disconnect') {
        toast.error('Bağlantı sunucu tarafından sonlandırıldı');
      }
    };

    this.pveSocket.on('connect_error', onConnectError('PvE'));
    this.pveSocket.on('exception', onException('PvE'));
    this.pveSocket.on('disconnect', onDisconnect('PvE'));

    this.gameSocket.on('connect_error', onConnectError('Game'));
    this.gameSocket.on('exception', onException('Game'));
    this.gameSocket.on('disconnect', onDisconnect('Game'));
  }

  startPve(botRace?: string, opts?: { tutorial?: boolean }) {
    if (this.authError || !this.pveSocket) {
      // No session at construction time — bounce to login with a clear
      // Turkish toast. Matches the message WsJwtGuard would have emitted.
      toast.error('Yetkisiz erişim — lütfen giriş yapın');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return;
    }

    this.pveSocket.connect();
    this.pveSocket.emit('start_pve', {
      race: this.myRace,
      botRace,
      playerElo: 1000,
      playerGamesPlayed: 0,
      // Tutorial mode is a frontend hint: backends that recognise it should
      // weaken the bot and skip ranked rewards. Older backends ignore the
      // flag and the player gets a regular PvE match.
      tutorial: opts?.tutorial === true,
      // Bot strength multiplier for tutorial mode (50% of the player) — sent
      // alongside `tutorial` so backends can apply without reading the flag.
      botStrengthMultiplier: opts?.tutorial ? 0.5 : 1,
    });
  }

  sendAction(type: string, payload?: Record<string, unknown>) {
    if (!this.roomId || !this.gameSocket) return;
    this.gameSocket.emit('game_action', {
      roomId: this.roomId,
      type,
      sequenceNumber: Date.now(),
      payload,
    });
  }

  requestSync() {
    if (!this.roomId || !this.gameSocket) return;
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
    this.pveSocket?.disconnect();
    this.gameSocket?.disconnect();
    this.handlers.clear();
  }
}
