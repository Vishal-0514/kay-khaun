import mongoose from 'mongoose';

export const DIETS = ['veg', 'nonveg', 'egg'];
export const BUDGETS = ['low', 'mid', 'high'];

// What the user tells us in "Your taste", and later what the app learns.
const preferencesSchema = new mongoose.Schema(
  {
    diet: { type: String, enum: DIETS },
    spice: { type: Number, min: 1, max: 5 },
    cuisines: [{ type: String, trim: true }],
    budget: { type: String, enum: BUDGETS },
    avoid: [{ type: String, trim: true }],
  },
  { _id: false }
);

// One account per email. People sign in through Firebase (email + password or
// Google); firebaseUid links the Firebase account. phone is only on accounts
// made before phone login was removed.
const userSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true, unique: true, sparse: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    firebaseUid: { type: String, unique: true, sparse: true },
    name: { type: String, trim: true, default: '' },
    avatarUrl: { type: String },
    preferences: { type: preferencesSchema, default: () => ({}) },
    // Off means the app stores no learned taste and ignores what it had.
    memoryEnabled: { type: Boolean, default: true },
    onboarded: { type: Boolean, default: false },
    // Did they agree to Chatora using AI (Claude)? null = not asked yet. Without
    // it the app still works, with keyword matching and plain wording.
    aiConsent: { type: Boolean, default: null },
    aiConsentAt: { type: Date, default: null },
    // Created by "Skip login (testing only)"; never available in production.
    isGuest: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Signed-in requests remember a user for a few seconds (middleware/auth.js).
// Any change to the account clears that memory at once.
const changeListeners = new Set();
export const onUserChange = (fn) => changeListeners.add(fn);
const changed = (doc) => doc?._id && changeListeners.forEach((fn) => fn(String(doc._id)));
userSchema.post('save', changed);
userSchema.post('deleteOne', { document: true, query: false }, changed);
userSchema.post(['findOneAndUpdate', 'findOneAndDelete'], changed);
userSchema.post(['updateOne', 'updateMany', 'deleteOne', 'deleteMany'], { document: false, query: true }, function () {
  const id = this.getFilter()?._id;
  if (id) changeListeners.forEach((fn) => fn(String(id)));
  else changeListeners.forEach((fn) => fn(null)); // unknown which: forget everyone
});

export default mongoose.model('User', userSchema);
