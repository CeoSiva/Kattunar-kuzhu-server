import { Router } from 'express';
import { getStatusByPhone, getMe, updateMe } from '../controllers/users.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/users/status?phone=XXXXXXXXXX
router.get('/status', getStatusByPhone);

// Authenticated user routes
router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateMe);

export default router;
