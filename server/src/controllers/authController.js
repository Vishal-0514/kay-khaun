import User from '../models/User.js';
import { firebaseConfigured, verifyFirebaseIdToken } from '../services/firebaseAuth.js';
import { issueSession, rotateRefreshToken, revokeRefreshToken, signAccessToken } from '../utils/tokens.js';

// Strips fields the client never needs to see.
export function toSafeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email ?? null,
    avatarUrl: user.avatarUrl ?? null,
    preferences: user.preferences ?? {},
    memoryEnabled: user.memoryEnabled,
    onboarded: user.onboarded,
    aiConsent: user.aiConsent ?? null,
    isGuest: user.isGuest,
  };
}

async function signedIn(res, user, isNew) {
  const session = await issueSession(user);
  res.json({ success: true, ...session, isNew, user: toSafeUser(user) });
}

// POST /api/auth/firebase — people sign in with Firebase in the app (email +
// password, or Google), and the app sends Firebase's ID token here. We only
// accept verified email addresses, and one email is one Kya Khaun account
// whichever way they sign in. The answer is our own session (access + refresh).
export async function firebaseSignIn(req, res) {
  const { idToken, name } = req.body;
  if (!firebaseConfigured()) {
    return res.status(503).json({ success: false, error: "Sign-in isn't set up on the server yet (FIREBASE_PROJECT_ID)." });
  }
  const account = await verifyFirebaseIdToken(idToken);
  if (!account) {
    return res.status(401).json({ success: false, error: "We couldn't confirm your sign-in. Please try again." });
  }
  if (!account.emailVerified) {
    return res.status(403).json({
      success: false,
      code: 'EMAIL_NOT_VERIFIED',
      error: 'Please verify your email address first — check your inbox for our link.',
    });
  }

  // Same Firebase account, or an account already made with this email
  // (e.g. signed up with a password, now signing in with Google).
  let user = (await User.findOne({ firebaseUid: account.uid })) ?? (await User.findOne({ email: account.email }));
  const isNew = !user;
  if (!user) {
    user = await User.create({ email: account.email, name: name || account.name || '', firebaseUid: account.uid });
  } else {
    let changed = false;
    if (!user.firebaseUid) {
      user.firebaseUid = account.uid;
      changed = true;
    }
    if (!user.name && (name || account.name)) {
      user.name = name || account.name;
      changed = true;
    }
    if (changed) await user.save();
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
