import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import { listUsers, getUser, updateUser, deleteUser } from '../controllers/users.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', requireRole('admin'), listUsers);
router.get('/:id', getUser);
router.patch('/:id', requireRole('admin'), updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);

export default router;
