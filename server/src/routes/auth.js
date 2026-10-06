import { Router } from 'express';
import { validateBody } from '../utils/validate.js';
import { firebaseSchema, refreshSchema } from '../validators/authValidators.js';
import { firebaseSignIn, refresh, logout, guestSignIn } from '../controllers/authController.js';

const router = Router();

router.post('/firebase', validateBody(firebaseSchema), firebaseSignIn);
router.post('/guest', guestSignIn);
router.post('/refresh', validateBody(refreshSchema), refresh);
router.post('/logout', validateBody(refreshSchema), logout);

export default router;
