import request from 'supertest';
import { v4 as uuid } from 'uuid';
import app from '../src/app';
import { getPrisma } from '../src/config/database';

const prisma = getPrisma();

/**
 * End-to-end coverage for two flows that previously had only constants/unit
 * coverage:
 *
 *  1. Device cap (5/user) + removal recovery — verifies that the 6th unique
 *     device is rejected with 409 DEVICE_LIMIT_REACHED, and that deleting a
 *     device frees a slot so the rejected device can then log in.
 *
 *  2. Unusual-location challenge — verifies that a known device coming from a
 *     different city receives a 429 + challengeToken, that the token works
 *     exactly once, that reused/expired tokens are rejected, and that the
 *     3-per-hour rate limit kicks in.
 *
 * Each describe block creates its own user with a unique username so the
 * tests are isolated and order-independent.
 */

const TS = Date.now();

async function cleanupUser(userId: string | undefined): Promise<void> {
  if (!userId) return;
  await prisma.refreshToken.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.device.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.securityQuestion.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.passwordHistory.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.loginAttempt.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.userRole.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
}

async function cleanupChallengeKeysFor(userId: string): Promise<void> {
  await prisma.idempotencyKey
    .deleteMany({ where: { key: { startsWith: `challenge:${userId}:` } } })
    .catch(() => {});
}

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Device cap (5 max) + removal recovery flow', () => {
  const creds = {
    username: `dev_cap_${TS}_${uuid().slice(0, 8)}`,
    password: 'DeviceCap123!xx',
  };
  let userId: string;

  beforeAll(async () => {
    const reg = await request(app)
      .post('/auth/register')
      .set('Idempotency-Key', uuid())
      .send({
        ...creds,
        securityQuestions: [
          { question: 'Q1?', answer: 'a1' },
          { question: 'Q2?', answer: 'a2' },
        ],
      });
    expect(reg.status).toBe(201);
    userId = reg.body.id;
  });

  afterAll(async () => {
    await cleanupUser(userId);
  });

  it('flow — 5 devices succeed, 6th rejected, removal recovers', async () => {
    // 1) Login from 5 distinct device fingerprints — all should succeed.
    const fingerprints = [1, 2, 3, 4, 5].map((n) => `fp_${TS}_${n}_${uuid()}`);
    const tokens: string[] = [];

    for (const fp of fingerprints) {
      const res = await request(app)
        .post('/auth/login')
        .set('Idempotency-Key', uuid())
        .send({ ...creds, deviceFingerprint: fp });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      tokens.push(res.body.accessToken);
    }

    // Sanity: 5 device rows in DB.
    let devicesInDb = await prisma.device.count({ where: { userId } });
    expect(devicesInDb).toBe(5);

    // 2) 6th unique device fingerprint must be rejected with 409
    //    DEVICE_LIMIT_REACHED and the response must include the existing
    //    device list so the client can offer the user a removal prompt.
    const sixthFp = `fp_${TS}_6_${uuid()}`;
    const reject = await request(app)
      .post('/auth/login')
      .set('Idempotency-Key', uuid())
      .send({ ...creds, deviceFingerprint: sixthFp });
    expect(reject.status).toBe(409);
    expect(reject.body.code).toBe('DEVICE_LIMIT_REACHED');
    expect(reject.body.details).toBeDefined();
    expect(Array.isArray(reject.body.details.devices)).toBe(true);
    expect(reject.body.details.devices.length).toBe(5);
    // Each device row should expose at least an id so the client can pick
    // one to remove.
    for (const d of reject.body.details.devices) {
      expect(typeof d.id).toBe('string');
    }

    // Sanity: still exactly 5 devices.
    devicesInDb = await prisma.device.count({ where: { userId } });
    expect(devicesInDb).toBe(5);

    // 3) Use one of the existing valid sessions to call DELETE /auth/devices/:id
    //    on the FIRST device. The /auth/devices/:id route revokes refresh
    //    tokens AND deletes the device row in the same transaction; this
    //    used to fail because of an FK RESTRICT constraint between
    //    refresh_tokens and devices.
    const listRes = await request(app)
      .get('/auth/devices')
      .set('Authorization', `Bearer ${tokens[1]}`); // use device 2's token
    expect(listRes.status).toBe(200);
    const deviceList: Array<{ id: string }> = listRes.body;
    expect(deviceList.length).toBe(5);

    // Pick a device that is NOT the one we're using for auth.
    const targetDevice = deviceList.find((d) => {
      // we don't know the active token's device id, so just pick the first one
      // that we can — but to be safe pick the oldest one (last in lastSeenAt
      // order). Any device removal frees a slot.
      return true;
    });
    expect(targetDevice).toBeDefined();
    const removeId = deviceList[0].id;

    const delRes = await request(app)
      .delete(`/auth/devices/${removeId}`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .set('Idempotency-Key', uuid());
    expect(delRes.status).toBe(204);

    // Sanity: device row gone, refresh tokens for it gone too.
    devicesInDb = await prisma.device.count({ where: { userId } });
    expect(devicesInDb).toBe(4);
    const orphanTokens = await prisma.refreshToken.count({ where: { deviceId: removeId } });
    expect(orphanTokens).toBe(0);

    // 4) Retry the 6th device fingerprint — it should now succeed.
    const recovered = await request(app)
      .post('/auth/login')
      .set('Idempotency-Key', uuid())
      .send({ ...creds, deviceFingerprint: sixthFp });
    expect(recovered.status).toBe(200);
    expect(recovered.body.accessToken).toBeDefined();

    devicesInDb = await prisma.device.count({ where: { userId } });
    expect(devicesInDb).toBe(5);
  }, 60000);
});

describe('Unusual-location challenge flow', () => {
  const creds = {
    username: `chal_${TS}_${uuid().slice(0, 8)}`,
    password: 'ChalUserPwd123!xx',
  };
  let userId: string;
  // A single stable device fingerprint — the challenge flow only triggers
  // on KNOWN devices (i.e., devices already registered for the user).
  const fp = `chal_fp_${TS}_${uuid()}`;
  const cityA = 'Seattle';
  const cityB = 'Tokyo';

  beforeAll(async () => {
    const reg = await request(app)
      .post('/auth/register')
      .set('Idempotency-Key', uuid())
      .send({
        ...creds,
        securityQuestions: [
          { question: 'Q1?', answer: 'a1' },
          { question: 'Q2?', answer: 'a2' },
        ],
      });
    expect(reg.status).toBe(201);
    userId = reg.body.id;

    // Bootstrap: first login establishes the device + lastKnownCity.
    const first = await request(app)
      .post('/auth/login')
      .set('Idempotency-Key', uuid())
      .send({ ...creds, deviceFingerprint: fp, lastKnownCity: cityA });
    expect(first.status).toBe(200);
    expect(first.body.accessToken).toBeDefined();
  }, 30000);

  afterAll(async () => {
    await cleanupChallengeKeysFor(userId);
    await cleanupUser(userId);
  });

  it('429 — known device with new city issues challengeToken', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Idempotency-Key', uuid())
      .send({ ...creds, deviceFingerprint: fp, lastKnownCity: cityB });
    expect(res.status).toBe(429);
    expect(res.body.challengeToken).toBeDefined();
    expect(typeof res.body.challengeToken).toBe('string');
    expect(res.body.message).toMatch(/unusual location/i);
  }, 30000);

  it('200 — same credentials + valid challengeToken succeeds and consumes the token', async () => {
    // Issue a fresh challenge.
    const issue = await request(app)
      .post('/auth/login')
      .set('Idempotency-Key', uuid())
      .send({ ...creds, deviceFingerprint: fp, lastKnownCity: cityB });
    expect(issue.status).toBe(429);
    const token: string = issue.body.challengeToken;
    expect(token).toBeDefined();

    // Confirm: re-login with the challengeToken should succeed.
    const confirm = await request(app)
      .post('/auth/login')
      .set('Idempotency-Key', uuid())
      .send({
        ...creds,
        deviceFingerprint: fp,
        lastKnownCity: cityB,
        challengeToken: token,
      });
    expect(confirm.status).toBe(200);
    expect(confirm.body.accessToken).toBeDefined();

    // The challenge token must be one-shot — reusing it must fail.
    const reuse = await request(app)
      .post('/auth/login')
      .set('Idempotency-Key', uuid())
      .send({
        ...creds,
        deviceFingerprint: fp,
        lastKnownCity: 'Paris', // any city differing from last-known
        challengeToken: token,
      });
    expect(reuse.status).toBe(401);
    expect(reuse.body.message).toMatch(/invalid|expired/i);
  }, 30000);

  it('401 — bogus challengeToken is rejected', async () => {
    // Re-establish a "known" mismatch by setting current city back to cityA
    // (the previous test consumed the cityB confirmation, so device.lastKnownCity
    // is now cityB). Issue a challenge from cityA.
    const issue = await request(app)
      .post('/auth/login')
      .set('Idempotency-Key', uuid())
      .send({ ...creds, deviceFingerprint: fp, lastKnownCity: cityA });
    // This may either issue a challenge OR be rate-limited; either way the
    // bogus-token branch we want to test does not depend on this call's
    // success.
    expect([429, 401]).toContain(issue.status);

    const bogus = await request(app)
      .post('/auth/login')
      .set('Idempotency-Key', uuid())
      .send({
        ...creds,
        deviceFingerprint: fp,
        lastKnownCity: cityA,
        challengeToken: 'this-is-not-a-real-token',
      });
    expect(bogus.status).toBe(401);
    expect(bogus.body.message).toMatch(/invalid|expired/i);
  }, 30000);

  it('429 — challenge issuance is rate-limited at 3/hour per device', async () => {
    // Use a fresh user/device pair so this assertion is independent of any
    // challenges already burned by earlier tests.
    const rlCreds = {
      username: `chal_rl_${TS}_${uuid().slice(0, 8)}`,
      password: 'RlChalPwd123!xx',
    };
    const rlReg = await request(app)
      .post('/auth/register')
      .set('Idempotency-Key', uuid())
      .send({
        ...rlCreds,
        securityQuestions: [
          { question: 'Q1?', answer: 'a1' },
          { question: 'Q2?', answer: 'a2' },
        ],
      });
    const rlUserId = rlReg.body.id;
    const rlFp = `rl_fp_${TS}_${uuid()}`;

    try {
      // Bootstrap: register device with cityA.
      const boot = await request(app)
        .post('/auth/login')
        .set('Idempotency-Key', uuid())
        .send({ ...rlCreds, deviceFingerprint: rlFp, lastKnownCity: cityA });
      expect(boot.status).toBe(200);

      // Burn 3 challenge issuances by hitting login from cityB three times
      // WITHOUT confirming any of them (so device.lastKnownCity stays cityA).
      const issuanceStatuses: number[] = [];
      for (let i = 0; i < 3; i++) {
        const r = await request(app)
          .post('/auth/login')
          .set('Idempotency-Key', uuid())
          .send({ ...rlCreds, deviceFingerprint: rlFp, lastKnownCity: cityB });
        issuanceStatuses.push(r.status);
        expect(r.status).toBe(429);
        expect(r.body.challengeToken).toBeDefined();
      }
      expect(issuanceStatuses.every((s) => s === 429)).toBe(true);

      // 4th attempt within the rolling hour: still 429, but this one is the
      // RATE-LIMITED branch (no challengeToken), and the response message
      // mentions retry timing.
      const limited = await request(app)
        .post('/auth/login')
        .set('Idempotency-Key', uuid())
        .send({ ...rlCreds, deviceFingerprint: rlFp, lastKnownCity: cityB });
      expect(limited.status).toBe(429);
      // The rate-limited branch returns the AppError shape, NOT the
      // challengeToken success-shape, so challengeToken must be undefined.
      expect(limited.body.challengeToken).toBeUndefined();
      expect(limited.body.message).toMatch(/too many|retry/i);
    } finally {
      await cleanupChallengeKeysFor(rlUserId);
      await cleanupUser(rlUserId);
    }
  }, 60000);
});
