import { verifyAccessToken } from '../utils/tokens.js';
import User, { onUserChange } from '../models/User.js';

// Who's signed in, remembered for 30 seconds so busy screens don't ask the
// database on every request (the free database tier caps operations per
// second). Each request gets its own copy; any account change clears it.
const TTL = 30 * 1000;
const known = new Map(); // id → { at, data }
onUserChange((id) => (id ? known.delete(id) : known.clear()));

async function findUser(id) {
  const hit = known.get(id);
  if (hit && Date.now() - hit.at < TTL) return User.hydrate(hit.data);
  const data = await User.findById(id).lean();
  if (!data) return null;
  known.set(id, { at: Date.now(), data });
  if (known.size > 10000) known.delete(known.keys().next().value);
  return User.hydrate(data);
}

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

  const user = await findUser(String(payload.sub));
  if (!user) {
    return res.status(401).json({ success: false, error: 'This account no longer exists' });
  }
  req.user = user;
  next();
}
