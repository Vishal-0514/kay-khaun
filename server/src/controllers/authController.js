import User from '../models/User.js';
import { requestOtp, checkOtp, RESEND_AFTER_SECONDS } from '../services/otpService.js';
import { smsMode, emailMode } from '../services/otpSender.js';
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

function sendOtpFor(channel) {
  return async (req, res) => {
    const destination = req.body[channel];
    const result = await requestOtp(channel, destination);
    if (!result.ok) {
      return res.status(result.status).json({ success: false, error: result.error, retryAfter: result.retryAfter });
    }
    const printed = (channel === 'phone' ? smsMode : emailMode) === 'console';
    res.json({ success: true, retryAfter: RESEND_AFTER_SECONDS, devConsole: printed });
  };
}

function verifyOtpFor(channel) {
  return async (req, res) => {
    const destination = req.body[channel];
    const check = await checkOtp(channel, destination, req.body.code);
    if (!check.ok) {
      return res.status(check.status).json({ success: false, error: check.error });
    }
    let user = await User.findOne({ [channel]: destination });
    const isNew = !user;
    if (!user) user = await User.create({ [channel]: destination });
    await signedIn(res, user, isNew);
  };
}

export const sendPhoneOtp = sendOtpFor('phone');
export const verifyPhoneOtp = verifyOtpFor('phone');
export const sendEmailOtp = sendOtpFor('email');
export const verifyEmailOtp = verifyOtpFor('email');

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

// Testing only: a throwaway account so the app can be tried without an OTP.
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
