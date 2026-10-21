import { z } from 'zod';
import { CUISINES, MOODS } from '../data/mumbaiMenu.js';

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
  occasion: z.string().trim().max(40).optional(),
  dish: z.string().trim().max(40).optional(), // one of the occasion's dishes
  dishName: z.string().trim().min(1).max(60).optional(), // any dish by name (Snap Your Order)
  diet: z.enum(['veg', 'nonveg', 'egg', 'any']).optional(),
  location: locationSchema.optional(),
});

// Order for a Group: who's eating and what they can spend each.
export const GROUP_KINDS = ['friends', 'family', 'office', 'party'];
export const groupPicksSchema = z
  .object({
    people: z.number().int().min(2).max(50),
    veg: z.number().int().min(0).max(50), // how many of them are veg
    budgetPerHead: z.number().int().min(100).max(5000).nullable().optional(),
    kind: z.enum(GROUP_KINDS).default('friends'),
    cuisine: z.enum(CUISINES).nullable().optional(),
    location: locationSchema.optional(),
  })
  .refine((g) => g.veg <= g.people, { message: 'More veg people than people in the group', path: ['veg'] });
