import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createOneOnOne, listMyOneOnOnes, listBetweenTwoUsers, listReceivedRequests, listSentRequests, approveOneOnOne, requestReschedule, acceptReschedule, rejectReschedule, completeOneOnOne } from '../controllers/oneonone.controller';

const router = Router();

// Create a one-on-one meeting (authenticated)
router.post('/', authMiddleware, createOneOnOne);

// List all one-on-ones for current user (authenticated)
router.get('/my', authMiddleware, listMyOneOnOnes);

// List one-on-one requests I received (requestedUid == me)
router.get('/requests', authMiddleware, listReceivedRequests);

// List one-on-one requests I sent (requesterUid == me)
router.get('/sent', authMiddleware, listSentRequests);

// List one-on-ones between current user and other user (authenticated)
router.get('/between', authMiddleware, listBetweenTwoUsers);

// Approve a pending one-on-one (requested user only)
router.patch('/:id/approve', authMiddleware, approveOneOnOne);

// Reschedule proposal endpoints
router.patch('/:id/reschedule', authMiddleware, requestReschedule);
router.patch('/:id/reschedule/accept', authMiddleware, acceptReschedule);
router.patch('/:id/reschedule/reject', authMiddleware, rejectReschedule);

// Complete a scheduled one-on-one with proof photo (requester only)
router.patch('/:id/complete', authMiddleware, completeOneOnOne);

export default router;
