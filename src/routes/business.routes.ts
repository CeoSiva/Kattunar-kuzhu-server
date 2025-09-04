import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getMyBusiness, updateMyBusiness } from '../controllers/business.controller';

const router = Router();

router.get('/me', authMiddleware, getMyBusiness);
router.put('/me', authMiddleware, updateMyBusiness);

export default router;
