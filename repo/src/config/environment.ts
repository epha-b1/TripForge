/**
 * Environment configuration loader for TripForge.
 *
 * Security policy:
 *   - In non-test runtimes (NODE_ENV !== 'test'), missing or weak JWT_SECRET /
 *     ENCRYPTION_KEY values cause `loadEnvironment()` to throw — the process
 *     refuses to start, so a misconfigured deployment never silently falls back
 *     to a hardcoded default.
 *   - In NODE_ENV=test we accept controlled deterministic defaults so the
 *     unit/API test suites can run without setting envs in every shell.
 *
 * Quality requirements (production):
 *   - JWT_SECRET: minimum 32 characters, must not be a known insecure literal.
 *   - ENCRYPTION_KEY: exactly 32 characters (AES-256 key length); must not be
 *     a known insecure literal.
 */

export interface EnvironmentConfig {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  encryptionKey: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
}

export const MIN_JWT_SECRET_LENGTH = 32;
export const REQUIRED_ENCRYPTION_KEY_LENGTH = 32;

// Test-only deterministic defaults. These must NEVER apply outside NODE_ENV=test.
export const TEST_JWT_SECRET = 'test-only-jwt-secret-do-not-use-in-prod-32+chars';
export const TEST_ENCRYPTION_KEY = 'test_only_encryption_key_32bytes';

// The exact literal values that `docker-compose.yml` ships for the
// self-bootstrapping CI / dev stack. These are clearly marked
// `TEST_ONLY_NOT_FOR_PRODUCTION_*` in the compose file, but we still want
// the application to refuse to start if somebody copy-pastes them into a
// real deploy (audit-report-1 Finding #2 hardening). We treat them the
// same way as the legacy placeholder deny list below: they're allowed in
// NODE_ENV=test, forbidden everywhere else.
export const COMPOSE_TEST_JWT_SECRET =
  'TEST_ONLY_NOT_FOR_PRODUCTION_jwt_secret_padding_to_64_chars_xx';
export const COMPOSE_TEST_ENCRYPTION_KEY = 'TEST_ONLY_NOT_FOR_PRODUCTION__32';

// Historical placeholder literals — REJECTED UNCONDITIONALLY, even in
// NODE_ENV=test. These are values like `changeme` / `secret` that should
// never appear in any environment, ever.
export const HARD_DENY_SECRETS: ReadonlySet<string> = new Set<string>([
  'change_me_in_production',
  'change_me_32_chars_minimum_here_x',
  'changeme',
  'secret',
  'password',
  'jwt_secret',
  'encryption_key',
]);

// Test-only literals — rejected when `NODE_ENV !== 'test'`. Allowed
// inside test mode because `docker-compose.yml` explicitly sets
// `NODE_ENV: "test"` for the self-bootstrapping CI stack and wires
// these values through as TEST_ONLY_NOT_FOR_PRODUCTION defaults.
// Outside test mode (production / staging / bare `node dist/server.js`)
// they are rejected identically to the hard-deny set, so a production
// deploy that forgets to override every secret refuses to boot instead
// of silently inheriting the CI credentials. Audit-report-1 Finding #2
// hardening.
export const PRODUCTION_ONLY_DENY_SECRETS: ReadonlySet<string> = new Set<string>([
  COMPOSE_TEST_JWT_SECRET,
  COMPOSE_TEST_ENCRYPTION_KEY,
  TEST_JWT_SECRET,
  TEST_ENCRYPTION_KEY,
]);

// Backwards-compatible alias retained so any caller that imported
// `KNOWN_WEAK_SECRETS` still compiles. Equivalent to the hard-deny set
// (the strict, always-rejected tier).
export const KNOWN_WEAK_SECRETS = HARD_DENY_SECRETS;

/**
 * Is `value` a denied secret literal in the current runtime? Unified
 * gate used by both `validateJwtSecret` and `validateEncryptionKey` so
 * the two paths share identical tiered-deny semantics.
 */
function isDeniedSecret(value: string): boolean {
  if (HARD_DENY_SECRETS.has(value)) return true;
  if (!isTestEnv() && PRODUCTION_ONLY_DENY_SECRETS.has(value)) return true;
  return false;
}

export class EnvironmentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentConfigError';
  }
}

function isTestEnv(): boolean {
  return process.env.NODE_ENV === 'test';
}

function validateJwtSecret(value: string | undefined): string {
  if (!value || value.trim() === '') {
    if (isTestEnv()) return TEST_JWT_SECRET;
    throw new EnvironmentConfigError(
      'JWT_SECRET is required. Set a strong random value of at least ' +
        `${MIN_JWT_SECRET_LENGTH} characters before starting the server.`,
    );
  }

  if (isDeniedSecret(value)) {
    throw new EnvironmentConfigError(
      'JWT_SECRET is set to a known insecure placeholder or test-only value. ' +
        'Generate a strong random secret (e.g. `openssl rand -hex 32`).',
    );
  }

  if (value.length < MIN_JWT_SECRET_LENGTH) {
    throw new EnvironmentConfigError(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters ` +
        `(got ${value.length}). Generate a strong random secret.`,
    );
  }

  return value;
}

function validateEncryptionKey(value: string | undefined): string {
  if (!value || value.trim() === '') {
    if (isTestEnv()) return TEST_ENCRYPTION_KEY;
    throw new EnvironmentConfigError(
      'ENCRYPTION_KEY is required. Set a 32-character random value before ' +
        'starting the server (e.g. `openssl rand -base64 24 | cut -c1-32`).',
    );
  }

  if (isDeniedSecret(value)) {
    throw new EnvironmentConfigError(
      'ENCRYPTION_KEY is set to a known insecure placeholder or test-only value. ' +
        'Generate a strong random key.',
    );
  }

  if (value.length !== REQUIRED_ENCRYPTION_KEY_LENGTH) {
    throw new EnvironmentConfigError(
      `ENCRYPTION_KEY must be exactly ${REQUIRED_ENCRYPTION_KEY_LENGTH} ` +
        `characters (got ${value.length}). AES-256 requires a 32-byte key.`,
    );
  }

  return value;
}

function validateDatabaseUrl(value: string | undefined): string {
  if (!value || value.trim() === '') {
    if (isTestEnv()) {
      // Tests run inside the docker compose network where this resolves;
      // unit tests mock Prisma so the URL is never dialed.
      return 'mysql://tripforge:tripforge@db:3306/tripforge';
    }
    throw new EnvironmentConfigError('DATABASE_URL is required.');
  }
  return value;
}

export function loadEnvironment(): EnvironmentConfig {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    databaseUrl: validateDatabaseUrl(process.env.DATABASE_URL),
    jwtSecret: validateJwtSecret(process.env.JWT_SECRET),
    encryptionKey: validateEncryptionKey(process.env.ENCRYPTION_KEY),
    accessTokenTtl: parseInt(process.env.ACCESS_TOKEN_TTL || '1800', 10),
    refreshTokenTtl: parseInt(process.env.REFRESH_TOKEN_TTL || '1209600', 10),
  };
}

export const env = loadEnvironment();
