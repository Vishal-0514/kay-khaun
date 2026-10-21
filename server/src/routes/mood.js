import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiQuota } from '../middleware/security.js';
import { validateBody } from '../utils/validate.js';
import { snapSchema } from '../validators/moodValidators.js';
import { order, snap } from '../controllers/moodController.js';

// POST /api/mood/snap  → ideas for where you are (Snap My Mood, older app versions)
// POST /api/mood/order → dishes that fit where you are (Snap Your Order)
const router = Router();
router.post('/snap', requireAuth, aiQuota, validateBody(snapSchema), snap);
router.post('/order', requireAuth, aiQuota, validateBody(snapSchema), order);

export default router;
