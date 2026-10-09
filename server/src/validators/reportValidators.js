import { z } from 'zod';
import { REPORT_KINDS, REPORT_REASONS } from '../models/Report.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/);

export const reportSchema = z
  .object({
    kind: z.enum(REPORT_KINDS),
    conversationId: objectId.optional(),
    messageId: objectId.optional(),
    // Plan notes aren't stored, so the app sends the text it showed.
    text: z.string().trim().min(1).max(2000).optional(),
    reason: z.enum(REPORT_REASONS),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((r) => (r.kind === 'chat' ? r.conversationId && r.messageId : r.text), { message: 'Tell us which reply you are reporting' });
