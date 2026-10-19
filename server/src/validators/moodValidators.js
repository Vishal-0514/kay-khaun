import { z } from 'zod';
import { SCAN_MEDIA_TYPES } from '../services/ai.js';
import { locationSchema } from './chatValidators.js';

// Snap My Mood: a photo of where they are, an optional line, and where they are.
// About 4 MB of base64 at most; the app shrinks photos to ~1024px first.
export const snapSchema = z.object({
  image: z.string().min(100).max(5_500_000).regex(/^[A-Za-z0-9+/=\s]+$/,'Image must be base64'),
  mediaType: z.enum(SCAN_MEDIA_TYPES),
  note: z.string().trim().max(200).optional(),
  location: locationSchema.optional(),
});
