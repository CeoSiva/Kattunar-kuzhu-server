import { Router } from 'express';
import { getStatusByPhone } from '../controllers/users.controller';

const router = Router();

// GET /api/users/status?phone=XXXXXXXXXX
router.get('/status', getStatusByPhone);

export default router;
