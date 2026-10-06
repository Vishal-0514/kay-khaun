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

// One account can be reached by email + password or Google (same email = same
// person). phone is kept only for accounts made before phone login was removed.
const userSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true, unique: true, sparse: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    googleId: { type: String, unique: true, sparse: true },
    // bcrypt hash; never sent anywhere (select: false). Empty for Google-only accounts.
    passwordHash: { type: String, select: false },
    name: { type: String, trim: true, default: '' },
    avatarUrl: { type: String },
    preferences: { type: preferencesSchema, default: () => ({}) },
    // Off means the app stores no learned taste and ignores what it had.
    memoryEnabled: { type: Boolean, default: true },
    onboarded: { type: Boolean, default: false },
    // Created by "Skip login (testing only)"; never available in production.
    isGuest: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
