import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requestOtp, checkOtp, RESEND_AFTER_SECONDS } from '../services/otpService.js';
import { emailMode } from '../services/otpSender.js';
import { verifyGoogleIdToken, googleConfigured } from '../services/googleAuth.js';
import { issueSession, rotateRefreshToken, revokeRefreshToken, signAccessToken } from '../utils/tokens.js';

// Strips fields the client never needs to see.
export function toSafeUser(user) {
  return {
    id: user._id,
    name: user.name,
    phone: user.phone ?? null,
    email: user.email ?? null,
    avatarUrl: user.avatarUrl ?? null,
    preferences: user.preferences ?? {},
    memoryEnabled: user.memoryEnabled,
    onboarded: user.onboarded,
    isGuest: user.isGuest,
  };
}

async function signedIn(res, user, isNew) {
  const session = await issueSession(user);
  res.json({ success: true, ...session, isNew, user: toSafeUser(user) });
}

// ---------- email + password ----------

// Slows down password guessing: after 8 wrong tries an email is locked for 15 minutes.
// In memory is enough for one server; move to the database if we run several.
const FAIL_LIMIT = 8;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map(); // email -> { count, until }

function lockedFor(email) {
  const f = failures.get(email);
  if (!f) return 0;
  if (f.until && f.until > Date.now()) return Math.ceil((f.until - Date.now()) / 60000);
  if (f.until) failures.delete(email);
  return 0;
}

function noteFailure(email) {
  const f = failures.get(email) ?? { count: 0, until: 0 };
  f.count += 1;
  if (f.count >= FAIL_LIMIT) f.until = Date.now() + LOCK_MS;
  failures.set(email, f);
}

export async function emailSignUp(req, res) {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email }).select('+passwordHash');
  if (existing) {
    const error = existing.passwordHash
      ? 'An account with this email already exists. Log in instead.'
      : 'This email already has an account (made with Google). Continue with Google, or use "Forgot password" to add a password.';
    return res.status(409).json({ success: false, code: 'EMAIL_TAKEN', error });
  }
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
  await signedIn(res, user, true);
}

export async function emailLogIn(req, res) {
  const { email, password } = req.body;
  const minutes = lockedFor(email);
  if (minutes) return res.status(429).json({ success: false, error: `Too many wrong tries. Please wait ${minutes} min, or reset your password.` });

  const user = await User.findOne({ email }).select('+passwordHash');
  if (user && !user.passwordHash) {
    return res.status(401).json({ success: false, error: 'This email signs in with Google. Tap "Continue with Google", or use "Forgot password" to add a password.' });
  }
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    noteFailure(email);
    return res.status(401).json({ success: false, error: "That email and password don't match. Check them and try again." });
  }
  failures.delete(email);
  await signedIn(res, user, false);
}

// Always answers the same way, so nobody can use it to find out who has an account.
export async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    const result = await requestOtp('email', email);
    if (!result.ok) return res.status(result.status).json({ success: false, error: result.error, retryAfter: result.retryAfter });
  }
  res.json({ success: true, retryAfter: RESEND_AFTER_SECONDS, devConsole: emailMode === 'console' });
}

export async function resetPassword(req, res) {
  const { email, code, password } = req.body;
  const check = await checkOtp('email', email, code);
  if (!check.ok) return res.status(check.status).json({ success: false, error: check.error });
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ success: false, error: 'This code has expired. Please request a new one.' });
  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  failures.delete(email);
  await signedIn(res, user, false);
}

export async function googleSignIn(req, res) {
  if (!googleConfigured) {
    return res.status(503).json({ success: false, error: 'Google sign-in is not set up on the server yet (GOOGLE_CLIENT_IDS).' });
  }
  let profile;
  try {
    profile = await verifyGoogleIdToken(req.body.idToken);
  } catch (err) {
    return res.status(401).json({ success: false, error: err.status ? err.message : 'Google sign-in could not be verified.' });
  }

  // Same Google account, or an account already made with this verified email.
  let user = await User.findOne({ $or: [{ googleId: profile.googleId }, { email: profile.email }] });
  const isNew = !user;
  if (!user) {
    user = await User.create(profile);
  } else {
    user.googleId = profile.googleId;
    if (!user.name) user.name = profile.name;
    if (!user.avatarUrl) user.avatarUrl = profile.avatarUrl;
    await user.save();
  }
  await signedIn(res, user, isNew);
}

// Testing only: a throwaway account so the app can be tried without signing up.
export const guestLoginEnabled = process.env.ALLOW_GUEST_LOGIN === 'true' && process.env.NODE_ENV !== 'production';

export async function guestSignIn(req, res) {
  if (!guestLoginEnabled) return res.status(404).json({ success: false, error: 'Not available' });
  const user = await User.create({ isGuest: true });
  await signedIn(res, user, true);
}

export async function refresh(req, res) {
  const rotated = await rotateRefreshToken(req.body.refreshToken);
  if (!rotated) {
    return res.status(401).json({ success: false, error: 'Please sign in again.' });
  }
  const user = await User.findById(rotated.userId);
  if (!user) {
    await revokeRefreshToken(rotated.refreshToken);
    return res.status(401).json({ success: false, error: 'This account no longer exists' });
  }
  res.json({ success: true, accessToken: signAccessToken(user), refreshToken: rotated.refreshToken, user: toSafeUser(user) });
}

export async function logout(req, res) {
  await revokeRefreshToken(req.body.refreshToken);
  res.json({ success: true });
}
