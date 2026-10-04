import mongoose from 'mongoose';

// One row per destination ("phone:9876543210" or "email:a@b.com"): the current
// code (hashed) plus request counters.
const otpSchema = new mongoose.Schema({
  target: { type: String, required: true, unique: true },
  codeHash: { type: String, default: null },
  codeExpiresAt: { type: Date },
  attempts: { type: Number, default: 0 },
  sendCount: { type: Number, default: 0 },
  windowStart: { type: Date, required: true },
  lastSentAt: { type: Date, required: true },
  // MongoDB deletes the row itself once this passes.
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export default mongoose.model('Otp', otpSchema);
