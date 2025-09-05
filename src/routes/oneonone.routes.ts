import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createOneOnOne, listMyOneOnOnes, listBetweenTwoUsers } from '../controllers/oneonone.controller';

const router = Router();

// Create a one-on-one meeting (authenticated)
router.post('/', authMiddleware, createOneOnOne);

// List all one-on-ones for current user (authenticated)
router.get('/my', authMiddleware, listMyOneOnOnes);

// List one-on-ones between current user and other user (authenticated)
router.get('/between', authMiddleware, listBetweenTwoUsers);

export default router;
