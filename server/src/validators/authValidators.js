import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const newPassword = z.string().min(8, 'Use at least 8 characters for your password').max(128, 'That password is too long');
const code = z.string().trim().regex(/^\d{6}$/, 'The code is 6 digits');

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Tell us your name').max(60),
  email,
  password: newPassword,
});
export const logInSchema = z.object({ email, password: z.string().min(1, 'Enter your password').max(128) });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ email, code, password: newPassword });
export const googleSchema = z.object({ idToken: z.string().min(20).max(4096) });
export const refreshSchema = z.object({ refreshToken: z.string().min(20).max(200) });
