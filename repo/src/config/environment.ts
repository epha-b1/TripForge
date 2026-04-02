export interface EnvironmentConfig {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  encryptionKey: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
}

export function loadEnvironment(): EnvironmentConfig {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    databaseUrl: process.env.DATABASE_URL || 'mysql://tripforge:tripforge@db:3306/tripforge',
    jwtSecret: process.env.JWT_SECRET || 'change_me_in_production',
    encryptionKey: process.env.ENCRYPTION_KEY || 'change_me_32_chars_minimum_here_x',
    accessTokenTtl: parseInt(process.env.ACCESS_TOKEN_TTL || '1800', 10),
    refreshTokenTtl: parseInt(process.env.REFRESH_TOKEN_TTL || '1209600', 10),
  };
}

export const env = loadEnvironment();
