import { Router } from 'express';
import { getOverview, getRequirementProgress, getUserOverview } from '../controllers/stats.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public overview stats (can be made authed later if needed)
router.get('/overview', getOverview);

// Requirement progress (weekly/monthly)
router.get('/requirements/progress', getRequirementProgress);

// Authenticated user-specific overview
router.get('/overview/user', authMiddleware, getUserOverview);

export default router;
