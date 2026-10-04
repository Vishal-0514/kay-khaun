import { OAuth2Client } from 'google-auth-library';

// The app signs in with Google on the phone and sends us the ID token. We check
// Google's signature and that the token was issued to one of our client IDs.
const audiences = (process.env.GOOGLE_CLIENT_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const client = new OAuth2Client();

export const googleConfigured = audiences.length > 0;

export async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({ idToken, audience: audiences });
  const p = ticket.getPayload();
  if (!p?.sub || !p.email || !p.email_verified) {
    throw Object.assign(new Error('Google did not confirm this email address.'), { status: 401 });
  }
  return { googleId: p.sub, email: p.email.toLowerCase(), name: p.name || '', avatarUrl: p.picture };
}
