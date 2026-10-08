import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../utils/validate.js';
import { planNoteSchema, planSchema } from '../validators/planValidators.js';
import { makePlan, planNote } from '../controllers/planController.js';

const router = Router();

router.post('/', requireAuth, validateBody(planSchema), makePlan);
router.post('/note', requireAuth, validateBody(planNoteSchema), planNote);

export default router;
