import { z } from 'zod';
import { DIETS, BUDGETS } from '../models/User.js';

const shortList = z.array(z.string().trim().min(1).max(40)).max(20);

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'Please enter your name').max(60),
    preferences: z
      .object({
        diet: z.enum(DIETS),
        spice: z.number().int().min(1).max(5),
        cuisines: shortList,
        budget: z.enum(BUDGETS),
        avoid: shortList,
      })
      .partial(),
    memoryEnabled: z.boolean(),
    onboarded: z.boolean(),
    aiConsent: z.boolean(),
  })
  .partial()
  .strict();
