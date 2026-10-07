import { z } from 'zod';
import { MOODS } from '../data/mumbaiMenu.js';

// Where the user is, for real nearby restaurants. Optional: without it (or
// without a Google key) the server falls back to the sample Mumbai menu.
export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: z.string().trim().max(60).optional(),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  text: z.string().trim().min(1, 'Type what you feel like eating').max(500),
  location: locationSchema.optional(),
});

export const quickPicksSchema = z.object({
  mood: z.enum(MOODS).optional(),
  location: locationSchema.optional(),
});
