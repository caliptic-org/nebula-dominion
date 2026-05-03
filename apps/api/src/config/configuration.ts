export default () => {
  const jwtSecret = process.env.API_JWT_SECRET || process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('API_JWT_SECRET must be set and at least 32 characters long');
  }

  const jwtRefreshSecret = process.env.API_JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET;
  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
    throw new Error('API_JWT_REFRESH_SECRET must be set and at least 32 characters long');
  }

  const corsOrigins = process.env.CORS_ORIGINS;
  if (process.env.NODE_ENV === 'production' && !corsOrigins) {
    throw new Error('CORS_ORIGINS must be set in production');
  }

  return {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'nebula',
    password: process.env.DB_PASSWORD || 'nebula_password',
    database: process.env.DB_DATABASE || 'nebula_dominion',
    ssl: process.env.DB_SSL === 'true',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: jwtRefreshSecret,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  },

  cors: {
    origins: corsOrigins ? corsOrigins.split(',') : ['http://localhost:3000'],
  },

  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10),
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
  },
  };
};
