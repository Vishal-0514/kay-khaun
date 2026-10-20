import { z } from 'zod';
import { ORDER_APPS } from '../services/orderPages.js';

const text = (max) => z.string().trim().max(max);

export const orderPageSchema = z.object({
  app: z.enum(ORDER_APPS),
  id: text(200).optional(), // Google place id
  name: text(120).min(1),
  area: text(80).optional(),
  city: text(60).optional(),
});
