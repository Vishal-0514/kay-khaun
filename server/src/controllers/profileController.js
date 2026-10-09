import { toSafeUser } from './authController.js';
import Activity from '../models/Activity.js';
import Conversation from '../models/Conversation.js';
import RefreshToken from '../models/RefreshToken.js';
import Report from '../models/Report.js';
import Saved from '../models/Saved.js';
import { deleteFirebaseUser } from '../services/firebaseAuth.js';

export async function getProfile(req, res) {
  res.json({ success: true, user: toSafeUser(req.user) });
}

// Partial update: only the fields sent are changed, including single preferences.
export async function updateProfile(req, res) {
  const { preferences, ...rest } = req.body;
  Object.assign(req.user, rest);
  if (rest.aiConsent !== undefined) req.user.aiConsentAt = new Date();
  if (preferences) {
    for (const [key, value] of Object.entries(preferences)) req.user.preferences[key] = value;
  }
  await req.user.save();
  res.json({ success: true, user: toSafeUser(req.user) });
}

// DELETE /api/profile: deletes the account and everything stored about it,
// straight away (App Store and Play both require this inside the app).
// Reports they sent are kept for safety review but no longer point to them.
export async function deleteAccount(req, res) {
  const user = req.user._id;
  await Promise.all([
    Conversation.deleteMany({ user }),
    Activity.deleteMany({ user }),
    Saved.deleteMany({ user }),
    RefreshToken.deleteMany({ user }),
    Report.updateMany({ user }, { $set: { user: null } }),
  ]);
  await req.user.deleteOne();
  const firebaseDeleted = await deleteFirebaseUser(req.user.firebaseUid);
  res.json({ success: true, firebaseDeleted });
}
