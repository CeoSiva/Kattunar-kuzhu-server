import { Router } from 'express';
import { getOverview } from '../controllers/stats.controller';

const router = Router();

// Public overview stats (can be made authed later if needed)
router.get('/overview', getOverview);

export default router;
