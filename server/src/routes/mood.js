import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiQuota } from '../middleware/security.js';
import { validateBody } from '../utils/validate.js';
import { snapSchema } from '../validators/moodValidators.js';
import { snap } from '../controllers/moodController.js';

// POST /api/mood/snap → ideas for where you are (Snap My Mood)
const router = Router();
router.post('/snap', requireAuth, aiQuota, validateBody(snapSchema), snap);

export default router;
