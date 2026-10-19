import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../utils/validate.js';
import { GENDERS, MAX_CHARS, clip, synthesize, ttsReady } from '../services/tts.js';

// Chatora's spoken replies.
//   GET  /api/voice/status      → is speaking available on this server
//   POST /api/voice/speak       → { text, voice } → { url } of a short-lived MP3
//   GET  /api/voice/clip/:id    → the MP3 (unguessable id, expires after 15 min)
const router = Router();

const speakSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  voice: z.enum(GENDERS).default('female'),
});

// At most 200 spoken replies per person per hour.
const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 200;
const recent = new Map();
function tooMany(userId) {
  const now = Date.now();
  const times = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  times.push(now);
  recent.set(userId, times);
  if (recent.size > 5000) recent.delete(recent.keys().next().value);
  return times.length > LIMIT;
}

router.get('/status', async (req, res) => res.json({ success: true, enabled: await ttsReady(), maxChars: MAX_CHARS }));

router.post('/speak', requireAuth, validateBody(speakSchema), async (req, res, next) => {
  if (!(await ttsReady())) return res.status(503).json({ success: false, error: 'Spoken replies are not available right now.' });
  if (tooMany(String(req.user._id))) return res.status(429).json({ success: false, error: 'Chatora has talked a lot this hour. Try again a little later.' });
  try {
    const id = await synthesize(req.body.text, req.body.voice);
    res.json({ success: true, url: `/api/voice/clip/${id}.mp3` });
  } catch (err) {
    next(err);
  }
});

router.get('/clip/:id.mp3', (req, res) => {
  const audio = /^[a-f0-9]{32}$/.test(req.params.id) ? clip(req.params.id) : null;
  if (!audio) return res.status(404).json({ success: false, error: 'Clip expired' });
  res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audio.length, 'Cache-Control': 'private, max-age=900' }).send(audio);
});

export default router;
