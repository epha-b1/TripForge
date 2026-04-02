import { getPrisma } from '../config/database';
import { AppError, VALIDATION_ERROR, NOT_FOUND, CONFLICT } from '../utils/errors';

export async function createRole(name: string, description?: string) {
  const prisma = getPrisma();

  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) {
    throw new AppError(409, CONFLICT, `Role "${name}" already exists`);
  }

  return prisma.role.create({
    data: { name, description },
  });
}

export async function listRoles() {
  const prisma = getPrisma();
  return prisma.role.findMany({
    include: {
      rolePermissionPoints: {
        include: { permissionPoint: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function assignPermissionsToRole(roleId: string, permissionPointIds: string[]) {
  const prisma = getPrisma();

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw new AppError(404, NOT_FOUND, 'Role not found');
  }

  // Verify all permission points exist
  const points = await prisma.permissionPoint.findMany({
    where: { id: { in: permissionPointIds } },
  });
  if (points.length !== permissionPointIds.length) {
    throw new AppError(400, VALIDATION_ERROR, 'One or more permission points not found');
  }

  // Remove existing and replace
  await prisma.rolePermissionPoint.deleteMany({ where: { roleId } });
  await prisma.rolePermissionPoint.createMany({
    data: permissionPointIds.map((ppId) => ({
      roleId,
      permissionPointId: ppId,
    })),
  });

  return prisma.role.findUnique({
    where: { id: roleId },
    include: {
      rolePermissionPoints: {
        include: { permissionPoint: true },
      },
    },
  });
}

export async function createPermissionPoint(code: string, description?: string) {
  const prisma = getPrisma();

  const existing = await prisma.permissionPoint.findUnique({ where: { code } });
  if (existing) {
    throw new AppError(409, CONFLICT, `Permission point "${code}" already exists`);
  }

  return prisma.permissionPoint.create({
    data: { code, description },
  });
}

export async function listPermissionPoints() {
  const prisma = getPrisma();
  return prisma.permissionPoint.findMany({ orderBy: { code: 'asc' } });
}

export async function createMenu(name: string, description?: string, permissionPointIds?: string[]) {
  const prisma = getPrisma();

  const existing = await prisma.menu.findUnique({ where: { name } });
  if (existing) {
    throw new AppError(409, CONFLICT, `Menu "${name}" already exists`);
  }

  return prisma.menu.create({
    data: {
      name,
      description,
      menuPermissionPoints: permissionPointIds
        ? {
            create: permissionPointIds.map((ppId) => ({
              permissionPointId: ppId,
            })),
          }
        : undefined,
    },
    include: {
      menuPermissionPoints: {
        include: { permissionPoint: true },
      },
    },
  });
}

export async function listMenus() {
  const prisma = getPrisma();
  return prisma.menu.findMany({
    include: {
      menuPermissionPoints: {
        include: { permissionPoint: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function assignRolesToUser(userId: string, roleIds: string[]) {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, NOT_FOUND, 'User not found');
  }

  const roles = await prisma.role.findMany({
    where: { id: { in: roleIds } },
  });
  if (roles.length !== roleIds.length) {
    throw new AppError(400, VALIDATION_ERROR, 'One or more roles not found');
  }

  // Remove existing and replace
  await prisma.userRole.deleteMany({ where: { userId } });
  await prisma.userRole.createMany({
    data: roleIds.map((roleId) => ({ userId, roleId })),
  });

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      userRoles: {
        include: { role: true },
      },
    },
  });
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const prisma = getPrisma();

  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissionPoints: {
            include: { permissionPoint: true },
          },
        },
      },
    },
  });

  const permissionSet = new Set<string>();
  for (const ur of userRoles) {
    for (const rpp of ur.role.rolePermissionPoints) {
      permissionSet.add(rpp.permissionPoint.code);
    }
  }

  return Array.from(permissionSet).sort();
}
