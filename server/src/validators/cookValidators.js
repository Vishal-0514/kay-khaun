import { z } from 'zod';
import { MOODS } from '../data/mumbaiMenu.js';
import { SCAN_MEDIA_TYPES } from '../services/ai.js';

export const findRecipesSchema = z.object({
  ingredients: z.array(z.string().trim().min(1).max(40)).min(1, 'Add at least one ingredient').max(40),
  mood: z.enum(MOODS).optional(),
  timeMax: z.number().int().min(5).max(240).optional(),
});

// About 4 MB of base64 — the app shrinks photos to ~1024px first, so real ones are far smaller.
export const scanSchema = z.object({
  image: z.string().min(100).max(5_500_000).regex(/^[A-Za-z0-9+/=\s]+$/, 'Image must be base64'),
  mediaType: z.enum(SCAN_MEDIA_TYPES),
});
