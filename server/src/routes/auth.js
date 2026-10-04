import { Router } from 'express';
import { validateBody } from '../utils/validate.js';
import {
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
  googleSchema,
  refreshSchema,
} from '../validators/authValidators.js';
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  sendEmailOtp,
  verifyEmailOtp,
  googleSignIn,
  refresh,
  logout,
  guestSignIn,
} from '../controllers/authController.js';

const router = Router();

router.post('/phone/send-otp', validateBody(sendPhoneOtpSchema), sendPhoneOtp);
router.post('/phone/verify-otp', validateBody(verifyPhoneOtpSchema), verifyPhoneOtp);
router.post('/email/send-otp', validateBody(sendEmailOtpSchema), sendEmailOtp);
router.post('/email/verify-otp', validateBody(verifyEmailOtpSchema), verifyEmailOtp);
router.post('/google', validateBody(googleSchema), googleSignIn);
router.post('/guest', guestSignIn);
router.post('/refresh', validateBody(refreshSchema), refresh);
router.post('/logout', validateBody(refreshSchema), logout);

export default router;
