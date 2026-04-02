import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  changePasswordHandler,
  recoverHandler,
  getMeHandler,
  getDevicesHandler,
  removeDeviceHandler,
} from '../controllers/auth.controller';

const router = Router();

// Public endpoints
router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/refresh', refreshHandler);
router.post('/recover', recoverHandler);

// Protected endpoints
router.post('/logout', authMiddleware, logoutHandler);
router.patch('/change-password', authMiddleware, changePasswordHandler);
router.get('/me', authMiddleware, getMeHandler);
router.get('/devices', authMiddleware, getDevicesHandler);
router.delete('/devices/:id', authMiddleware, removeDeviceHandler);

export default router;
