import { env } from './environment';

export const authConfig = {
  accessTokenTtl: env.accessTokenTtl,
  refreshTokenTtl: env.refreshTokenTtl,
  algorithm: 'HS256' as const,
  jwtSecret: env.jwtSecret,
};
