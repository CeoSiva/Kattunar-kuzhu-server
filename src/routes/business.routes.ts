import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getMyBusiness, updateMyBusiness, getBusinessByUid } from '../controllers/business.controller';

const router = Router();

router.get('/me', authMiddleware, getMyBusiness);
router.put('/me', authMiddleware, updateMyBusiness);
router.get('/by-uid', getBusinessByUid);

export default router;
