import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const PLACEHOLDER = 'your-firebase-project-id';
const PROVIDERS = new Set(['password', 'google.com']);

export function firebaseConfigured() {
  const id = process.env.FIREBASE_PROJECT_ID;
  return Boolean(id && id !== PLACEHOLDER);
}

// Checking an ID token only needs the project ID (Google's public keys do the
// rest) — no service-account secret has to live on the server.
// Deleting a Firebase account does need one: FIREBASE_SERVICE_ACCOUNT (the
// service-account JSON, optional).
function serviceAccount() {
  try {
    return process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
  } catch {
    console.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON; Firebase accounts will not be deleted.');
    return null;
  }
}

function auth() {
  if (getApps().length === 0) {
    const account = serviceAccount();
    initializeApp(account ? { credential: cert(account), projectId: process.env.FIREBASE_PROJECT_ID } : { projectId: process.env.FIREBASE_PROJECT_ID });
  }
  return getAuth();
}

// Removes the Firebase sign-in record too. Returns false when it couldn't
// (no service account set): the Kya Khaun data is gone either way.
export async function deleteFirebaseUser(uid) {
  if (!uid || !firebaseConfigured() || !serviceAccount()) return false;
  try {
    await auth().deleteUser(uid);
    return true;
  } catch (err) {
    if (err.code === 'auth/user-not-found') return true;
    console.error('Could not delete the Firebase account:', err.message);
    return false;
  }
}

// Verifies a Firebase ID token from an email/password or Google sign-in.
// Returns { uid, email, name, emailVerified }, or null when the token isn't
// genuine (or comes from a sign-in method Kya Khaun doesn't offer).
export async function verifyFirebaseIdToken(idToken) {
  if (!firebaseConfigured()) return null;
  try {
    const decoded = await auth().verifyIdToken(idToken);
    if (!PROVIDERS.has(decoded.firebase?.sign_in_provider) || !decoded.email) return null;
    return {
      uid: decoded.uid,
      email: decoded.email.toLowerCase(),
      name: decoded.name || '',
      emailVerified: decoded.email_verified === true,
    };
  } catch {
    return null;
  }
}
