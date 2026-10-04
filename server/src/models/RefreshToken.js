import mongoose from 'mongoose';

// Long-lived sessions. Only a SHA-256 hash of the token is stored, so a leaked
// database can't be used to log in. Each refresh swaps the token for a new one.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export default mongoose.model('RefreshToken', refreshTokenSchema);
