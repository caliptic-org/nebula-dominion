export default () => {
  const jwtSecret = process.env.GAME_SERVER_JWT_SECRET || process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('GAME_SERVER_JWT_SECRET must be set and at least 32 characters long');
  }

  const corsOrigins = process.env.CORS_ORIGINS;
  if (process.env.NODE_ENV === 'production' && !corsOrigins) {
    throw new Error('CORS_ORIGINS must be set in production');
  }

  return {
    port: parseInt(process.env.PORT || '3001', 10),
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    database: {
      url: process.env.DATABASE_URL || 'postgresql://nebula:nebula@localhost:5432/nebula_dominion',
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      logging: process.env.DB_LOGGING === 'true',
      ssl: process.env.DB_SSL === 'true',
      // Auto-run pending migrations on bootstrap. Defaults to true so the
      // game-server schema is provisioned without an external init step;
      // set DB_RUN_MIGRATIONS=false to opt out (e.g. in tests).
      runMigrations: process.env.DB_RUN_MIGRATIONS !== 'false',
    },
    jwt: {
      secret: jwtSecret,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    cors: {
      origins: corsOrigins ? corsOrigins.split(',') : ['http://localhost:3000'],
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
  };
};
