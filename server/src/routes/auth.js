import { Router } from 'express';
import { validateBody } from '../utils/validate.js';
import { signUpSchema, logInSchema, forgotSchema, resetSchema, googleSchema, refreshSchema } from '../validators/authValidators.js';
import {
  emailSignUp,
  emailLogIn,
  forgotPassword,
  resetPassword,
  googleSignIn,
  refresh,
  logout,
  guestSignIn,
} from '../controllers/authController.js';

const router = Router();

router.post('/email/sign-up', validateBody(signUpSchema), emailSignUp);
router.post('/email/log-in', validateBody(logInSchema), emailLogIn);
router.post('/password/forgot', validateBody(forgotSchema), forgotPassword);
router.post('/password/reset', validateBody(resetSchema), resetPassword);
router.post('/google', validateBody(googleSchema), googleSignIn);
router.post('/guest', guestSignIn);
router.post('/refresh', validateBody(refreshSchema), refresh);
router.post('/logout', validateBody(refreshSchema), logout);

export default router;
