import { z } from 'zod';
import { DAY_MOODS, MEAL_ORDER } from '../services/dayPlan.js';
import { locationSchema } from './chatValidators.js';

export const planSchema = z.object({
  budget: z.number().int().min(150, 'A day needs at least ₹150').max(10000).optional(),
  meals: z.array(z.enum(MEAL_ORDER)).min(1, 'Pick at least one meal').max(4).optional(),
  mood: z.enum(Object.keys(DAY_MOODS)).optional(),
  location: locationSchema.optional(),
});

const text = (max) => z.string().trim().min(1).max(max);

// What's showing on the plan after swaps / cook at home.
export const planNoteSchema = z.object({
  budget: z.number().int().min(150).max(10000),
  moodLabel: text(40),
  meals: z
    .array(
      z.object({
        label: text(30),
        cook: z.boolean(),
        name: text(120),
        restaurant: text(120).optional(),
        price: z.number().int().min(0).max(20000).nullable().optional(),
        priceLabel: text(60).nullable().optional(),
        cuisine: text(60).nullable().optional(),
      })
    )
    .min(1)
    .max(4),
});
