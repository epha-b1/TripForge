export class PrismaClient {
  $connect = jest.fn().mockResolvedValue(undefined);
  $disconnect = jest.fn().mockResolvedValue(undefined);
  auditLog = { create: jest.fn(), findMany: jest.fn() };
  user = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
  securityQuestion = {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  device = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  };
  refreshToken = {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  passwordHistory = {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  idempotencyKey = {
    create: jest.fn(),
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  };
  role = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  };
  permissionPoint = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  };
  menu = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };
  menuPermissionPoint = {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  rolePermissionPoint = {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  userRole = {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
  };
}
