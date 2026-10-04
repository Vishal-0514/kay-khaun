import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../utils/validate.js';
import { updateProfileSchema } from '../validators/profileValidators.js';
import { getProfile, updateProfile } from '../controllers/profileController.js';

const router = Router();

router.get('/', requireAuth, getProfile);
router.patch('/', requireAuth, validateBody(updateProfileSchema), updateProfile);

export default router;
