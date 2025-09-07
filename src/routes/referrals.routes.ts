import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createReferral, listGivenReferrals, listTakenReferrals, updateReferralStatus, confirmReferral, submitThankNote, requestThankNote } from '../controllers/referrals.controller';

const router = Router();

// Create a new referral
router.post('/', authMiddleware, createReferral);

// Lists
router.get('/given', authMiddleware, listGivenReferrals);
router.get('/taken', authMiddleware, listTakenReferrals);

// Update status
router.patch('/:id/status', authMiddleware, updateReferralStatus);

// Confirm referral (receiver only)
router.patch('/:id/confirm', authMiddleware, confirmReferral);

// Submit thank note (receiver only)
router.patch('/:id/thank-note', authMiddleware, submitThankNote);

// Request thank note (giver only)
router.patch('/:id/request-thank', authMiddleware, requestThankNote);

export default router;
