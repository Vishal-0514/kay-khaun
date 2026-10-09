import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../utils/validate.js';
import { reportSchema } from '../validators/reportValidators.js';
import { createReport } from '../controllers/reportController.js';

const router = Router();

router.post('/', requireAuth, validateBody(reportSchema), createReport);

export default router;
