import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../utils/validate.js';
import { songsSchema } from '../validators/songValidators.js';
import { songs } from '../controllers/songController.js';

// POST /api/songs → 3–4 real songs for a meal (Snap Your Food, Get Your Song)
const router = Router();
router.post('/', requireAuth, validateBody(songsSchema), songs);

export default router;
