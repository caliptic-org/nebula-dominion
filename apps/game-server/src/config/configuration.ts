export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://nebula:nebula@localhost:5432/nebula_dominion',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'nebula-dominion-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  matchmaking: {
    initialEloRange: parseInt(process.env.MATCHMAKING_INITIAL_ELO_RANGE || '100', 10),
    eloExpansionRate: parseInt(process.env.MATCHMAKING_ELO_EXPANSION_RATE || '50', 10),
    expansionIntervalMs: parseInt(process.env.MATCHMAKING_EXPANSION_INTERVAL_MS || '10000', 10),
    maxWaitMs: parseInt(process.env.MATCHMAKING_MAX_WAIT_MS || '120000', 10),
    tickIntervalMs: parseInt(process.env.MATCHMAKING_TICK_INTERVAL_MS || '2000', 10),
  },
  game: {
    roomTtlSeconds: parseInt(process.env.GAME_ROOM_TTL_SECONDS || '3600', 10),
    reconnectWindowMs: parseInt(process.env.RECONNECT_WINDOW_MS || '30000', 10),
    maxActionsPerSecond: parseInt(process.env.MAX_ACTIONS_PER_SECOND || '10', 10),
    maxRoundDurationMs: parseInt(process.env.MAX_ROUND_DURATION_MS || '30000', 10),
  },
});
