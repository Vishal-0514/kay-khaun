import { z } from 'zod';

const text = (max) => z.string().trim().min(1).max(max);
const url = z.string().url().max(500);

// A pick as the app shows it. Unknown fields are dropped.
export const foodItemSchema = z.object({
  id: text(200),
  source: z.enum(['sample', 'places', 'recipe']).optional(),
  name: text(150),
  restaurant: text(150).optional(),
  area: text(100).nullable().optional(),
  cuisine: text(80).nullable().optional(),
  diet: z.enum(['veg', 'nonveg', 'egg']).nullable().optional(),
  price: z.number().min(0).max(20000).nullable().optional(),
  eta: z.number().min(0).max(300).nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  ratingCount: z.number().int().min(0).nullable().optional(),
  spice: z.number().int().min(1).max(5).nullable().optional(),
  spiceLabel: text(30).nullable().optional(),
  distanceKm: z.number().min(0).max(500).nullable().optional(),
  priceLabel: text(60).nullable().optional(),
  ideas: z.array(text(60)).max(6).optional(),
  links: z.object({ zomato: url.optional(), swiggy: url.optional(), maps: url.optional() }).optional(),
});

export const saveSchema = z.object({ item: foodItemSchema });

export const activitySchema = z.object({
  kind: z.enum(['opened', 'ordered', 'not_for_me']),
  item: foodItemSchema,
  app: z.enum(['zomato', 'swiggy']).optional(),
});

const recipeRef = z.object({ id: text(80), name: text(120), time: z.number().int().min(0).max(600), level: text(20) });

export const savePlanSchema = z.object({
  budget: z.number().int().min(0).max(10000),
  total: z.number().int().min(0).max(40000).nullable(),
  moodLabel: text(40),
  meals: z
    .array(
      z.object({
        meal: z.enum(['breakfast', 'lunch', 'snack', 'dinner']),
        label: text(30),
        cook: z.boolean(),
        item: foodItemSchema,
        recipe: recipeRef.nullable().optional(),
        home: recipeRef.nullable().optional(),
        options: z.array(z.object({ item: foodItemSchema, home: recipeRef.nullable().optional() })).max(3).optional(),
      })
    )
    .min(1)
    .max(4),
});
