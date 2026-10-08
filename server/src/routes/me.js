import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../utils/validate.js';
import { activitySchema, savePlanSchema, saveSchema } from '../validators/meValidators.js';
import {
  clearHistory,
  clearLearned,
  getLearned,
  listHistory,
  listSaved,
  recordActivity,
  removeHistory,
  saveItem,
  savePlan,
  unsaveItem,
} from '../controllers/meController.js';

const router = Router();
router.use(requireAuth);

router.get('/saved', listSaved);
router.put('/saved', validateBody(saveSchema), saveItem);
router.delete('/saved/:itemId', unsaveItem);

router.post('/activity', validateBody(activitySchema), recordActivity);

router.get('/history', listHistory);
router.post('/history/plan', validateBody(savePlanSchema), savePlan);
router.delete('/history/:id', removeHistory);
router.delete('/history', clearHistory);

router.get('/learned', getLearned);
router.delete('/learned', clearLearned);

export default router;
