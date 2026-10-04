import { verifyAccessToken } from '../utils/tokens.js';
import User from '../models/User.js';

// Requires a valid "Authorization: Bearer <access token>" header. Attaches the
// signed-in user to req.user.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not signed in' });
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    // The app reacts to this code by using its refresh token, then retrying.
    return res.status(401).json({ success: false, code: 'TOKEN_EXPIRED', error: 'Session expired' });
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    return res.status(401).json({ success: false, error: 'This account no longer exists' });
  }
  req.user = user;
  next();
}
