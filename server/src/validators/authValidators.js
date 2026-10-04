import { z } from 'zod';

// Indian mobile numbers: 10 digits, optionally prefixed with +91. Always stored
// as the bare 10 digits so "+919876543210" and "9876543210" are one account.
const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^(\+?91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'))
  .transform((value) => value.slice(-10));

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const code = z.string().trim().regex(/^\d{6}$/, 'The code is 6 digits');

export const sendPhoneOtpSchema = z.object({ phone });
export const verifyPhoneOtpSchema = z.object({ phone, code });
export const sendEmailOtpSchema = z.object({ email });
export const verifyEmailOtpSchema = z.object({ email, code });
export const googleSchema = z.object({ idToken: z.string().min(20).max(4096) });
export const refreshSchema = z.object({ refreshToken: z.string().min(20).max(200) });
