export default () => ({
  port: parseInt(process.env.PORT || '3002', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'nebula-dominion-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'nebula_dominion',
    ssl: process.env.DB_SSL === 'true',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
    poolIdleTimeoutMs: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '10000', 10),
    poolConnectionTimeoutMs: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS || '5000', 10),
    statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10),
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
});
