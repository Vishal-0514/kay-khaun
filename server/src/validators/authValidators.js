import { z } from 'zod';

export const firebaseSchema = z.object({
  idToken: z.string().min(20).max(4096),
  // Sent once, right after sign-up, so the account gets the name they typed.
  name: z.string().trim().min(1).max(60).optional(),
});
export const refreshSchema = z.object({ refreshToken: z.string().min(20).max(200) });
