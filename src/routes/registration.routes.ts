import { Router } from 'express';
import { createOrUpdateRegistration, getRegistrationByUid, updateRegistrationStatus } from '../controllers/registration.controller';

const router = Router();

// Create or update a registration (idempotent per firebaseUid)
router.post('/', createOrUpdateRegistration);

// Get registration by firebaseUid
router.get('/:firebaseUid', getRegistrationByUid);

// Update registration status (admin/backoffice use)
router.patch('/:firebaseUid/status', updateRegistrationStatus);

export default router;
