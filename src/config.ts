import 'dotenv/config';

const readSecret = (name: string, developmentFallback: string) => {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') throw new Error(`${name} is required in production`);
  return developmentFallback;
};
export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
  databaseUrl: readSecret('DATABASE_URL', 'postgresql://nexora:nexora@localhost:5432/nexora?schema=public'),
  accessTokenSecret: readSecret('ACCESS_TOKEN_SECRET', 'nexora-development-access-secret-change-me'),
  refreshTokenSecret: readSecret('REFRESH_TOKEN_SECRET', 'nexora-development-refresh-secret-change-me'),
  mfaRecoverySecret: readSecret('MFA_RECOVERY_SECRET', 'nexora-development-mfa-recovery-secret-change-me'),
  marketDataRestUrl: process.env.MARKET_DATA_REST_URL ?? 'https://data-api.binance.vision',
  marketDataStreamUrl: process.env.MARKET_DATA_STREAM_URL ?? 'wss://stream.binance.com:9443/ws',
  marketDataTimeoutMs: Number(process.env.MARKET_DATA_TIMEOUT_MS ?? 8_000),
};
