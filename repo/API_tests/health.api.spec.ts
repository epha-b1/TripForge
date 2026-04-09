import request from 'supertest';
import app from '../src/app';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('includes canonical X-Request-Id header (UUID v4 shape)', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('also exposes the deprecated X-Trace-Id alias for backwards compatibility', async () => {
    const res = await request(app).get('/health');
    // Same value on both headers — deprecated alias is kept until clients migrate.
    expect(res.headers['x-trace-id']).toBe(res.headers['x-request-id']);
  });
});

describe('GET /nonexistent', () => {
  it('returns 404 with the canonical error envelope (statusCode/code/message/requestId)', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.statusCode).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.message).toBeDefined();
    expect(res.body.requestId).toBeDefined();
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
    // Legacy alias still present.
    expect(res.body.traceId).toBe(res.body.requestId);
  });
});

describe('Request ID propagation', () => {
  it('is present on every response (success + 404)', async () => {
    const healthRes = await request(app).get('/health');
    expect(healthRes.headers['x-request-id']).toBeDefined();

    const notFoundRes = await request(app).get('/does-not-exist');
    expect(notFoundRes.headers['x-request-id']).toBeDefined();
  });

  it('echoes a client-supplied X-Request-Id verbatim', async () => {
    const customId = '11111111-2222-3333-4444-555555555555';
    const res = await request(app).get('/health').set('X-Request-Id', customId);
    expect(res.headers['x-request-id']).toBe(customId);
    // Deprecated alias header still mirrors the same value.
    expect(res.headers['x-trace-id']).toBe(customId);
  });

  it('still accepts the legacy X-Trace-Id request header for clients mid-migration', async () => {
    const customId = '22222222-3333-4444-5555-666666666666';
    const res = await request(app).get('/health').set('X-Trace-Id', customId);
    expect(res.headers['x-request-id']).toBe(customId);
  });
});
