import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import Otp from '../models/Otp.js';
import { deliverCode } from './otpSender.js';

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_AFTER_MS = 30 * 1000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_ATTEMPTS = 5;

export const RESEND_AFTER_SECONDS = RESEND_AFTER_MS / 1000;

const fail = (status, error, extra = {}) => ({ ok: false, status, error, ...extra });
const targetOf = (channel, destination) => `${channel}:${destination}`;

// channel is 'phone' or 'email'; destination is the 10-digit number or the email.
export async function requestOtp(channel, destination) {
  const target = targetOf(channel, destination);
  const now = Date.now();
  let doc = await Otp.findOne({ target });
  if (doc && now > doc.windowStart.getTime() + WINDOW_MS) doc = null;

  if (doc) {
    const waitMs = doc.lastSentAt.getTime() + RESEND_AFTER_MS - now;
    if (waitMs > 0) {
      const retryAfter = Math.ceil(waitMs / 1000);
      return fail(429, `Please wait ${retryAfter}s before requesting another code.`, { retryAfter });
    }
    if (doc.sendCount >= MAX_SENDS_PER_WINDOW) {
      return fail(429, 'Too many codes requested. Please try again in an hour.');
    }
  }

  const code = String(crypto.randomInt(100000, 1000000));
  try {
    await deliverCode(channel, destination, code);
  } catch (err) {
    console.error('OTP delivery failed:', err.message);
    return fail(502, 'We could not send the code right now. Please try again in a moment.');
  }

  const windowStart = doc ? doc.windowStart : new Date(now);
  await Otp.findOneAndUpdate(
    { target },
    {
      codeHash: await bcrypt.hash(code, 8),
      codeExpiresAt: new Date(now + CODE_TTL_MS),
      attempts: 0,
      sendCount: (doc ? doc.sendCount : 0) + 1,
      windowStart,
      lastSentAt: new Date(now),
      expiresAt: new Date(windowStart.getTime() + WINDOW_MS),
    },
    { upsert: true }
  );
  return { ok: true };
}

export async function checkOtp(channel, destination, code) {
  const target = targetOf(channel, destination);
  // Count the attempt first, in one step, so parallel guesses can't dodge the limit.
  const doc = await Otp.findOneAndUpdate({ target, codeHash: { $ne: null } }, { $inc: { attempts: 1 } }, { new: true });
  if (!doc || doc.codeExpiresAt < new Date()) {
    return fail(400, 'This code has expired. Please request a new one.');
  }
  if (doc.attempts > MAX_ATTEMPTS) {
    return fail(429, 'Too many wrong attempts. Please request a new code.');
  }
  if (!(await bcrypt.compare(code, doc.codeHash))) {
    return fail(400, "That code isn't right. Please check and try again.");
  }

  await Otp.updateOne({ target }, { codeHash: null });
  return { ok: true };
}
