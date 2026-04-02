export type UserRole = 'admin' | 'organizer';

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface DeviceInfo {
  fingerprint?: string;
  lastKnownCity?: string;
}
