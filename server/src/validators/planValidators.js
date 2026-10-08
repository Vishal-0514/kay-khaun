import { z } from 'zod';
import { DAY_MOODS, MEAL_ORDER } from '../services/dayPlan.js';
import { locationSchema } from './chatValidators.js';

export const planSchema = z.object({
  budget: z.number().int().min(150, 'A day needs at least ₹150').max(10000).optional(),
  meals: z.array(z.enum(MEAL_ORDER)).min(1, 'Pick at least one meal').max(4).optional(),
  mood: z.enum(Object.keys(DAY_MOODS)).optional(),
  location: locationSchema.optional(),
});
