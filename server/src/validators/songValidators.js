import { z } from 'zod';
import { SCAN_MEDIA_TYPES, SONG_LANGUAGES } from '../services/ai.js';

// A photo of the food, or the dish they picked — at least one.
export const songsSchema = z
  .object({
    image: z.string().min(100).max(5_500_000).regex(/^[A-Za-z0-9+/=\s]+$/, 'Image must be base64').optional(),
    mediaType: z.enum(SCAN_MEDIA_TYPES).optional(),
    dish: z.object({ name: z.string().trim().min(1).max(120), cuisine: z.string().trim().max(60).optional() }).optional(),
    language: z.enum(SONG_LANGUAGES).default('both'),
    note: z.string().trim().max(200).optional(),
  })
  .refine((b) => (b.image && b.mediaType) || b.dish, 'Send a photo of the food or a dish');
