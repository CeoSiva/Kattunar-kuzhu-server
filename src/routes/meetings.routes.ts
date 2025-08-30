import { Router } from 'express';
import { createMeeting, listMeetings } from '../controllers/meetings.controller';

const router = Router();

// Create a meeting
router.post('/', createMeeting);

// List meetings (optional filters: ?status=scheduled|completed|cancelled&type=general|special|training)
router.get('/', listMeetings);

export default router;
