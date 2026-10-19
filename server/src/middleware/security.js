import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

// Security for every request: safe response headers, which websites may call
// the API from a browser, and request limits that stop floods and protect the
// paid services behind Chatora (Claude, Google). Limits live in memory, which
// is right for one server; with more servers they'd move to a shared store.

// Security headers. Audio clips are played by the app (and the web preview from
// another origin), so resources may be loaded cross-origin.
export const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Browsers may call the API only from the company website (its contact form)
// and, while developing, from localhost. The phone apps send no Origin header,
// so CORS doesn't apply to them.
const WEBSITE = ['https://www.karisglobalretail.com', 'https://karisglobalretail.com'];
const extra = String(process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const isDev = process.env.NODE_ENV !== 'production';

export function originAllowed(origin) {
  if (!origin) return true;
  if (WEBSITE.includes(origin) || extra.includes(origin)) return true;
  return isDev && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export const corsPolicy = cors({
  origin: (origin, done) => done(null, originAllowed(origin)),
  maxAge: 600,
});

const tooMany = (error) => (req, res, next, options) => res.status(options.statusCode).json({ success: false, code: 'RATE_LIMITED', error });

const base = { standardHeaders: 'draft-8', legacyHeaders: false };

// Everything under /api, per address: plenty for a person, too little for a flood.
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_API || 600),
  handler: tooMany('Too many requests. Please wait a few minutes and try again.'),
});

// Sign-in, per address: slows down anyone guessing or spamming accounts.
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_AUTH || 30),
  handler: tooMany('Too many sign-in attempts. Please wait 15 minutes and try again.'),
});

// Per signed-in person, per hour, for one kind of request. Use after requireAuth.
export function perUser(limit, error = 'You’re going a bit fast. Please wait a few minutes and try again.') {
  return rateLimit({
    ...base,
    windowMs: 60 * 60 * 1000,
    limit,
    keyGenerator: (req) => `user:${req.user._id}`,
    handler: tooMany(error),
  });
}

// Everything that calls Claude, per person per day, shared across features:
// the cap that protects the Claude bill if an account is abused.
export const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 200);
const aiUse = new Map(); // "user:day" → count

export function aiQuota(req, res, next) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${req.user._id}:${day}`;
  const used = aiUse.get(key) ?? 0;
  if (used >= AI_DAILY_LIMIT) {
    return res.status(429).json({ success: false, code: 'AI_DAILY_LIMIT', error: 'Chatora has had a busy day with you! The daily limit resets at midnight (UTC). You can still browse your saved picks.' });
  }
  aiUse.set(key, used + 1);
  if (aiUse.size > 20000) aiUse.delete(aiUse.keys().next().value);
  next();
}
