import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiQuota, perUser } from '../middleware/security.js';
import { validateBody } from '../utils/validate.js';
import { findRecipesSchema, scanSchema, swapSchema } from '../validators/cookValidators.js';
import { listIngredients, findRecipes, getRecipe, scan, swap } from '../controllers/cookController.js';

const router = Router();

router.get('/ingredients', requireAuth, listIngredients);
router.post('/recipes', requireAuth, validateBody(findRecipesSchema), findRecipes);
router.get('/recipes/:id', requireAuth, getRecipe);
router.post('/scan', requireAuth, perUser(20, 'That’s a lot of photos for one hour. Try again a little later, or type what you have.'), aiQuota, validateBody(scanSchema), scan);
router.post('/swap', requireAuth, aiQuota, validateBody(swapSchema), swap);

export default router;
