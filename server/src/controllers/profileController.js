import { toSafeUser } from './authController.js';

export async function getProfile(req, res) {
  res.json({ success: true, user: toSafeUser(req.user) });
}

// Partial update: only the fields sent are changed, including single preferences.
export async function updateProfile(req, res) {
  const { preferences, ...rest } = req.body;
  Object.assign(req.user, rest);
  if (preferences) {
    for (const [key, value] of Object.entries(preferences)) req.user.preferences[key] = value;
  }
  await req.user.save();
  res.json({ success: true, user: toSafeUser(req.user) });
}
