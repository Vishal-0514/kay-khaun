import { z } from 'zod';
import { MOODS } from '../data/mumbaiMenu.js';

export const sendMessageSchema = z.object({
  conversationId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  text: z.string().trim().min(1, 'Type what you feel like eating').max(500),
});

export const quickPicksSchema = z.object({
  mood: z.enum(MOODS).optional(),
});
