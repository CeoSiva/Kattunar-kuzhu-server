import { Router } from 'express';
import { createMeeting, listMeetings, listMeetingsWithUserStatus } from '../controllers/meetings.controller';
import { authMiddleware } from '../middleware/auth';
import { markAttendance } from '../controllers/attendance.controller';

const router = Router();

// Create a meeting
router.post('/', createMeeting);

// List meetings (optional filters: ?status=scheduled|completed|cancelled&type=general|special|training)
router.get('/', listMeetings);

// List meetings enriched with current user's attendance status (hasMarked, markedAt)
router.get('/user', authMiddleware, listMeetingsWithUserStatus);

// Mark attendance for a meeting
router.post('/:id/attendance', authMiddleware, markAttendance);

export default router;
