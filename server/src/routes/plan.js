import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../utils/validate.js';
import { planSchema } from '../validators/planValidators.js';
import { makePlan } from '../controllers/planController.js';

const router = Router();

router.post('/', requireAuth, validateBody(planSchema), makePlan);

export default router;
