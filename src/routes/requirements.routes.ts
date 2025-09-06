import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createRequirement, listMyRequirements, listPublicRequirements, createRequirementResponse, listRequirementResponses } from '../controllers/requirements.controller';

const router = Router();

// Public feed of requirements
router.get('/public', listPublicRequirements);

// My requirements (auth)
router.get('/me', authMiddleware, listMyRequirements);

// Create requirement (auth)
router.post('/', authMiddleware, createRequirement);

// Responses
router.post('/:id/responses', authMiddleware, createRequirementResponse);
router.get('/:id/responses', listRequirementResponses);

export default router;
