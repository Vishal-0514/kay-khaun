import { Router } from 'express';
import { z } from 'zod';
import ContactMessage, { CONTACT_TOPICS } from '../models/ContactMessage.js';
import { validateBody } from '../utils/validate.js';

// POST /api/contact: the company website's contact form (no sign-in).
const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name.').max(100),
  email: z.string().trim().email('Please enter a valid email address.').max(200),
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(10, 'Please write a message of at least 10 characters.').max(3000),
  website: z.string().max(200).optional(), // honeypot: people leave it empty, bots fill it in
});

// At most 5 messages per address per hour.
const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 5;
const recent = new Map();
function tooMany(ip) {
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  times.push(now);
  recent.set(ip, times);
  if (recent.size > 5000) recent.delete(recent.keys().next().value);
  return times.length > LIMIT;
}

router.post('/', validateBody(contactSchema), async (req, res) => {
  const { website, ...message } = req.body;
  if (website) return res.json({ success: true }); // quietly drop bots
  if (tooMany(req.ip)) return res.status(429).json({ success: false, error: 'Too many messages. Please try again in an hour, or email us.' });
  await ContactMessage.create(message);
  console.log(`Contact form (${message.topic}) from ${message.email}`);
  res.status(201).json({ success: true });
});

export default router;
