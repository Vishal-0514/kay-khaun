import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  inMemoryPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  reload,
  getIdToken,
  signOut,
} from 'firebase/auth';
import { api } from './api';
import { t } from './i18n';

// Sign-in works like KARIS: Firebase checks the email + password (or Google),
// sends the verification and password-reset emails, then hands us an ID token
// that our server swaps for a Kya Khaun session. Firebase's web SDK runs in
// Expo Go, app builds and the browser preview alike. These are the Firebase
// web app's public settings (not secrets).
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(config.apiKey && config.projectId && config.appId);
export const NOT_SET_UP = "Sign-in isn't set up yet. Add the Firebase settings to mobile/.env.";

// Our own session is what keeps someone signed in, so Firebase only needs its
// session for the few minutes of signing in — kept in memory.
function auth() {
  if (getApps().length === 0) {
    const app = initializeApp(config);
    return initializeAuth(app, { persistence: inMemoryPersistence });
  }
  return getAuth();
}

const FRIENDLY = {
  'auth/invalid-email': "That email address doesn't look right.",
  'auth/email-already-in-use': 'An account with this email already exists. Log in instead.',
  'auth/weak-password': 'Choose a password with at least 8 characters.',
  'auth/invalid-credential': "That email and password don't match. Check them and try again.",
  'auth/wrong-password': "That email and password don't match. Check them and try again.",
  'auth/user-not-found': "That email and password don't match. Check them and try again.",
  'auth/user-disabled': 'This account has been switched off.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'No internet connection. Check it and try again.',
  'auth/account-exists-with-different-credential': 'This email already has an account. Log in with your email and password.',
};

function friendly(err) {
  const error = new Error(t(FRIENDLY[err?.code] ?? err?.response?.data?.error ?? err?.message ?? 'Something went wrong. Please try again.'));
  error.code = err?.code ?? err?.response?.data?.code;
  return error;
}

async function run(fn) {
  if (!firebaseReady) throw new Error(NOT_SET_UP);
  try {
    return await fn(auth());
  } catch (err) {
    throw friendly(err);
  }
}

// Swaps the Firebase sign-in for a Kya Khaun session. The server only accepts
// verified email addresses. Resolves with { accessToken, refreshToken, user, isNew }.
async function exchange(a, name) {
  const idToken = await getIdToken(a.currentUser, true); // fresh, so it includes "email verified"
  const { data } = await api.post('/auth/firebase', { idToken, ...(name ? { name } : {}) });
  await signOut(a).catch(() => {});
  return data;
}

// New account: Firebase emails a verification link; they can carry on once
// they've tapped it (see confirmEmailVerified).
export function signUpWithEmail({ name, email, password }) {
  return run(async (a) => {
    const { user } = await createUserWithEmailAndPassword(a, email.trim(), password);
    await updateProfile(user, { displayName: name.trim() });
    await sendEmailVerification(user);
  });
}

// Resolves with a session when the email is verified, or
// { needsVerification: true } (a fresh link has been sent) when it isn't.
export function signInWithEmail({ email, password }) {
  return run(async (a) => {
    const { user } = await signInWithEmailAndPassword(a, email.trim(), password);
    if (!user.emailVerified) {
      await sendEmailVerification(user).catch(() => {}); // may be rate-limited; the earlier link still works
      return { needsVerification: true };
    }
    return exchange(a);
  });
}

// "I've verified" on the check-your-inbox screen. Resolves with a session once
// the link has been tapped, or null if not yet.
export function confirmEmailVerified() {
  return run(async (a) => {
    if (!a.currentUser) throw new Error('Please log in again.');
    await reload(a.currentUser);
    if (!a.currentUser.emailVerified) return null;
    return exchange(a, a.currentUser.displayName);
  });
}

export function resendVerificationEmail() {
  return run(async (a) => {
    if (!a.currentUser) throw new Error('Please log in again.');
    await sendEmailVerification(a.currentUser);
  });
}

export function sendPasswordReset(email) {
  return run((a) => sendPasswordResetEmail(a, email.trim()));
}

// Google's account picker gives an ID token; Firebase turns it into its own
// sign-in (Google addresses are already verified). Resolves with a session.
export function signInWithGoogleToken(googleIdToken) {
  return run(async (a) => {
    await signInWithCredential(a, GoogleAuthProvider.credential(googleIdToken));
    return exchange(a);
  });
}

export async function endFirebaseSession() {
  if (!firebaseReady) return;
  await signOut(auth()).catch(() => {});
}
