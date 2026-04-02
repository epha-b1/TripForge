import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import {
  createRoleHandler,
  listRolesHandler,
  assignPermissionsHandler,
  createPermissionPointHandler,
  listPermissionPointsHandler,
  createMenuHandler,
  listMenusHandler,
  assignRolesToUserHandler,
} from '../controllers/rbac.controller';

const rolesRouter = Router();
rolesRouter.use(authMiddleware);
rolesRouter.get('/', listRolesHandler);
rolesRouter.post('/', requireRole('admin'), createRoleHandler);
rolesRouter.post('/:id/permissions', requireRole('admin'), assignPermissionsHandler);

const permissionPointsRouter = Router();
permissionPointsRouter.use(authMiddleware);
permissionPointsRouter.get('/', listPermissionPointsHandler);
permissionPointsRouter.post('/', requireRole('admin'), createPermissionPointHandler);

const menusRouter = Router();
menusRouter.use(authMiddleware);
menusRouter.get('/', listMenusHandler);
menusRouter.post('/', requireRole('admin'), createMenuHandler);

const userRolesRouter = Router();
userRolesRouter.use(authMiddleware);
userRolesRouter.post('/:id/roles', requireRole('admin'), assignRolesToUserHandler);

export { rolesRouter, permissionPointsRouter, menusRouter, userRolesRouter };
