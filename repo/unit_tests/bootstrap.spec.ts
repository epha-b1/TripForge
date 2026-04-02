import { loadEnvironment } from '../src/config/environment';
import { AppError, VALIDATION_ERROR, NOT_FOUND } from '../src/utils/errors';
import { logger } from '../src/utils/logger';

describe('Bootstrap — environment config', () => {
  it('loads environment config without throwing', () => {
    expect(() => loadEnvironment()).not.toThrow();
    const config = loadEnvironment();
    expect(config.port).toBeDefined();
    expect(typeof config.port).toBe('number');
    expect(config.jwtSecret).toBeDefined();
    expect(config.encryptionKey).toBeDefined();
    expect(config.accessTokenTtl).toBeDefined();
    expect(config.refreshTokenTtl).toBeDefined();
  });
});

describe('Bootstrap — AppError', () => {
  it('sets statusCode and code correctly', () => {
    const err = new AppError(400, VALIDATION_ERROR, 'Bad input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Bad input');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('sets 404 NOT_FOUND correctly', () => {
    const err = new AppError(404, NOT_FOUND, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });
});

describe('Bootstrap — logger', () => {
  it('creates logger instance without throwing', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });
});
