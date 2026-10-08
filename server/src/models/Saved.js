import mongoose from 'mongoose';
import { foodItemSchema } from './FoodItem.js';

// Dishes and places someone tapped ♡ on. Kept even when "Remember my taste"
// is off, because saving is something they asked for directly.
const savedSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    item: { type: foodItemSchema, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

savedSchema.index({ user: 1, 'item.id': 1 }, { unique: true });
savedSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Saved', savedSchema);
