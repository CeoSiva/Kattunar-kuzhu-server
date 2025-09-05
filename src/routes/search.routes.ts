import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { searchMembers } from '../controllers/search.controller';

const router = Router();

// Search members by member name, business name, or business category
// GET /api/search/members?query=...&limit=20
router.get('/members', authMiddleware, searchMembers);

export default router;
