import request from 'supertest';
import app from '../src/app';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('includes X-Trace-Id header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-trace-id']).toBeDefined();
    expect(res.headers['x-trace-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe('GET /nonexistent', () => {
  it('returns 404 with standard error envelope', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.statusCode).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.message).toBeDefined();
    expect(res.body.traceId).toBeDefined();
  });
});

describe('X-Trace-Id header', () => {
  it('is present on every response', async () => {
    const healthRes = await request(app).get('/health');
    expect(healthRes.headers['x-trace-id']).toBeDefined();

    const notFoundRes = await request(app).get('/does-not-exist');
    expect(notFoundRes.headers['x-trace-id']).toBeDefined();
  });

  it('echoes back client-provided X-Trace-Id', async () => {
    const customTraceId = '11111111-2222-3333-4444-555555555555';
    const res = await request(app)
      .get('/health')
      .set('X-Trace-Id', customTraceId);
    expect(res.headers['x-trace-id']).toBe(customTraceId);
  });
});
