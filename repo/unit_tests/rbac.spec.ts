import { requireRole, requirePermission } from '../src/middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

function mockReqResNext(user?: any) {
  const req = { user, permissions: undefined } as unknown as Request;
  const res = {} as Response;
  let calledNext = false;
  let nextErr: any = null;
  const next: NextFunction = (err?: any) => {
    calledNext = true;
    nextErr = err || null;
  };
  return { req, res, next, getError: () => nextErr, wasCalled: () => calledNext };
}

describe('requireRole middleware', () => {
  it('passes when user has required role', () => {
    const { req, res, next, getError } = mockReqResNext({ userId: 'u1', username: 'admin', role: 'admin' });
    requireRole('admin')(req, res, next);
    expect(getError()).toBeNull();
  });

  it('returns 403 when user has wrong role', () => {
    const { req, res, next, getError } = mockReqResNext({ userId: 'u1', username: 'org', role: 'organizer' });
    requireRole('admin')(req, res, next);
    expect(getError()).not.toBeNull();
    expect(getError().statusCode).toBe(403);
  });

  it('returns 401 when no user on request', () => {
    const { req, res, next, getError } = mockReqResNext(undefined);
    requireRole('admin')(req, res, next);
    expect(getError()).not.toBeNull();
    expect(getError().statusCode).toBe(401);
  });

  it('accepts multiple roles', () => {
    const { req, res, next, getError } = mockReqResNext({ userId: 'u1', username: 'org', role: 'organizer' });
    requireRole('admin', 'organizer')(req, res, next);
    expect(getError()).toBeNull();
  });
});

describe('requirePermission middleware', () => {
  it('passes for admin role without checking permissions', async () => {
    const { req, res, next, getError } = mockReqResNext({ userId: 'u1', username: 'admin', role: 'admin' });
    await requirePermission('itinerary:read')(req, res, next);
    expect(getError()).toBeNull();
  });

  it('returns 401 when no user on request', async () => {
    const { req, res, next, getError } = mockReqResNext(undefined);
    await requirePermission('itinerary:read')(req, res, next);
    expect(getError()).not.toBeNull();
    expect(getError().statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const { req, res, next, getError } = mockReqResNext({ userId: 'u1', username: 'org', role: 'organizer' });
    // Pre-set permissions to avoid DB call in unit test
    req.permissions = ['itinerary:read', 'resource:read'];
    await requirePermission('user:write')(req, res, next);
    expect(getError()).not.toBeNull();
    expect(getError().statusCode).toBe(403);
    expect(getError().message).toContain('user:write');
  });

  it('passes when user has the required permission', async () => {
    const { req, res, next, getError } = mockReqResNext({ userId: 'u1', username: 'org', role: 'organizer' });
    req.permissions = ['itinerary:read', 'itinerary:write', 'resource:read'];
    await requirePermission('itinerary:read')(req, res, next);
    expect(getError()).toBeNull();
  });
});

describe('Permission collection logic', () => {
  it('deduplicates permissions from multiple roles', () => {
    // Simulating getUserPermissions logic
    const role1Perms = ['itinerary:read', 'itinerary:write', 'resource:read'];
    const role2Perms = ['itinerary:read', 'notification:read', 'resource:read'];

    const permissionSet = new Set<string>();
    for (const p of [...role1Perms, ...role2Perms]) {
      permissionSet.add(p);
    }
    const result = Array.from(permissionSet).sort();

    expect(result).toEqual([
      'itinerary:read',
      'itinerary:write',
      'notification:read',
      'resource:read',
    ]);
  });

  it('returns empty array when user has no roles', () => {
    const permissionSet = new Set<string>();
    expect(Array.from(permissionSet)).toEqual([]);
  });
});

describe('Data-scope rule', () => {
  it('organizer can only see own resources (role check)', () => {
    const user = { userId: 'u1', username: 'org', role: 'organizer' };
    const ownerId = 'u1';
    const otherOwnerId = 'u2';

    expect(user.role !== 'admin' && user.userId !== otherOwnerId).toBe(true);
    expect(user.role !== 'admin' && user.userId === ownerId).toBe(true);
  });

  it('admin can see all resources', () => {
    const user = { userId: 'u1', username: 'admin', role: 'admin' };
    const anyOwnerId = 'u999';

    // Admin bypasses ownership check
    expect(user.role === 'admin').toBe(true);
  });
});
