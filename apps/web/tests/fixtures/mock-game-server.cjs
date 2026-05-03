/**
 * Mock game server for E2E tests.
 * Simulates /pve and /game Socket.io namespaces from the real game server.
 * Exposes a control endpoint (GET /test-control) for test orchestration.
 */
'use strict';

const http = require('http');
const { Server } = require('socket.io');

const PORT = parseInt(process.env.MOCK_GAME_SERVER_PORT ?? '3001', 10);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Test control endpoint: POST /test-control
  if (url.pathname === '/test-control' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const cmd = JSON.parse(body);
        handleTestControl(cmd, res);
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms = new Map();
const gameSocketsByRoom = new Map();

function makeRoom(playerId, playerRace) {
  const botId = 'bot-pve-001';
  return {
    id: 'test-room-' + Date.now(),
    status: 'in_progress',
    mode: 'pve',
    currentTurn: 1,
    currentPlayerId: playerId,
    phase: 'action',
    players: {
      [playerId]: {
        userId: playerId,
        race: playerRace || 'insan',
        hp: 100,
        mana: 50,
        connected: true,
        units: [
          {
            id: playerId + '-u1',
            type: 'soldier',
            hp: 30, maxHp: 30, attack: 8, defense: 5, speed: 3,
            position: { x: 0, y: 0 },
            actionUsed: false,
          },
          {
            id: playerId + '-u2',
            type: 'mage',
            hp: 20, maxHp: 20, attack: 12, defense: 3, speed: 2,
            position: { x: 1, y: 1 },
            actionUsed: false,
          },
          {
            id: playerId + '-u3',
            type: 'archer',
            hp: 25, maxHp: 25, attack: 10, defense: 4, speed: 4,
            position: { x: 0, y: 2 },
            actionUsed: false,
          },
        ],
      },
      [botId]: {
        userId: botId,
        race: 'canavar',
        hp: 100,
        mana: 30,
        connected: true,
        units: [
          {
            id: botId + '-u1',
            type: 'soldier',
            hp: 15, maxHp: 15, attack: 4, defense: 3, speed: 2,
            position: { x: 7, y: 0 },
            actionUsed: false,
          },
          {
            id: botId + '-u2',
            type: 'soldier',
            hp: 15, maxHp: 15, attack: 4, defense: 3, speed: 2,
            position: { x: 7, y: 2 },
            actionUsed: false,
          },
        ],
      },
    },
  };
}

function getPlayerIdFromSocket(socket) {
  try {
    const token = socket.handshake.auth.token;
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return payload.sub || 'player_demo';
  } catch {
    return 'player_demo';
  }
}

const pveNs = io.of('/pve');
const gameNs = io.of('/game');

pveNs.on('connection', (socket) => {
  const playerId = getPlayerIdFromSocket(socket);

  socket.on('start_pve', (data) => {
    const race = (data && data.race) || 'insan';
    const room = makeRoom(playerId, race);
    rooms.set(room.id, { room, playerId });

    socket.emit('pve_game_ready', {
      roomId: room.id,
      botId: 'bot-pve-001',
      yourTurn: true,
    });
  });
});

gameNs.on('connection', (socket) => {
  const playerId = getPlayerIdFromSocket(socket);

  socket.on('join_room', ({ roomId }) => {
    const entry = rooms.get(roomId);
    if (!entry) return;

    socket.join(roomId);

    const socketsInRoom = gameSocketsByRoom.get(roomId) || [];
    socketsInRoom.push(socket);
    gameSocketsByRoom.set(roomId, socketsInRoom);

    socket.emit('room_joined', { room: entry.room });
  });

  socket.on('game_action', (action) => {
    const { roomId, type, payload } = action;
    const entry = rooms.get(roomId);
    if (!entry) return;

    if (type === 'end_turn') {
      const botId = 'bot-pve-001';
      socket.emit('turn_ended', { nextPlayerId: botId, turn: (entry.room.currentTurn || 1) + 1 });
      entry.room.currentPlayerId = botId;
      entry.room.currentTurn = (entry.room.currentTurn || 1) + 1;
    }

    if (type === 'move_unit' && payload) {
      const unitId = payload.unitId;
      const pos = payload.position;
      const pState = entry.room.players[entry.playerId];
      if (pState) {
        const unit = pState.units.find((u) => u.id === unitId);
        if (unit && pos) {
          unit.position = pos;
          unit.actionUsed = true;
          socket.emit('unit_moved', { unitId, position: pos });
        }
      }
    }

    if (type === 'attack' && payload) {
      const attackerUnitId = payload.attackerUnitId;
      const targetUnitId = payload.targetUnitId;

      const botState = entry.room.players['bot-pve-001'];
      if (botState) {
        const target = botState.units.find((u) => u.id === targetUnitId);
        if (target) {
          const damage = 8;
          target.hp = Math.max(0, target.hp - damage);
          socket.emit('unit_attacked', {
            attackerUnitId,
            targetUnitId,
            damage,
            targetHp: target.hp,
          });

          if (target.hp <= 0) {
            socket.emit('unit_died', { unitId: targetUnitId });
            botState.units = botState.units.filter((u) => u.id !== targetUnitId);

            if (botState.units.length === 0) {
              setTimeout(() => {
                socket.emit('game_over', {
                  winner: entry.playerId,
                  loser: 'bot-pve-001',
                  endReason: 'all_units_destroyed',
                  eloDelta: { [entry.playerId]: 20 },
                  newElo: { [entry.playerId]: 1020 },
                  rewards: {
                    [entry.playerId]: {
                      minerals: 150,
                      gas: 75,
                      xp: 300,
                      eloDelta: 20,
                      bonuses: ['quick_victory'],
                    },
                  },
                });
              }, 200);
            }
          }
        }
      }
    }
  });

  socket.on('request_sync', ({ roomId }) => {
    const entry = rooms.get(roomId);
    if (!entry) return;
    socket.emit('full_state_sync', { room: entry.room });
  });
});

function handleTestControl(cmd, res) {
  if (cmd.action === 'trigger_game_over') {
    const { roomId, winner } = cmd;
    const entry = rooms.get(roomId);
    if (!entry) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Room not found', rooms: Array.from(rooms.keys()) }));
      return;
    }
    const loser = winner === entry.playerId ? 'bot-pve-001' : entry.playerId;
    gameNs.to(roomId).emit('game_over', {
      winner,
      loser,
      endReason: 'all_units_destroyed',
      eloDelta: { [winner]: 20 },
      newElo: { [winner]: 1020 },
      rewards: {
        [winner]: { minerals: 150, gas: 75, xp: 300, eloDelta: 20, bonuses: [] },
      },
    });
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (cmd.action === 'get_rooms') {
    const roomList = Array.from(rooms.entries()).map(([id, entry]) => ({
      id,
      playerId: entry.playerId,
    }));
    res.writeHead(200);
    res.end(JSON.stringify({ rooms: roomList }));
    return;
  }

  if (cmd.action === 'reset') {
    rooms.clear();
    gameSocketsByRoom.clear();
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(400);
  res.end(JSON.stringify({ error: 'Unknown action' }));
}

server.listen(PORT, () => {
  process.stdout.write(`Mock game server running on port ${PORT}\n`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
