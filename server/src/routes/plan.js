import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiQuota, perUser } from '../middleware/security.js';
import { validateBody } from '../utils/validate.js';
import { planNoteSchema, planSchema } from '../validators/planValidators.js';
import { makePlan, planNote } from '../controllers/planController.js';

const router = Router();

router.post('/', requireAuth, perUser(40), aiQuota, validateBody(planSchema), makePlan);
router.post('/note', requireAuth, perUser(80), aiQuota, validateBody(planNoteSchema), planNote);

export default router;
