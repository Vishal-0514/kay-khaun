import mongoose from 'mongoose';
import { foodItemSchema } from './FoodItem.js';

export const ACTIVITY_KINDS = ['opened', 'ordered', 'not_for_me', 'plan'];

// What someone did with a pick. It feeds taste learning, and 'ordered' and
// 'plan' show up in History. Only recorded while "Remember my taste" is on.
const planMealSchema = new mongoose.Schema(
  { meal: String, label: String, cook: Boolean, item: foodItemSchema, recipe: { id: String, name: String, time: Number, level: String } },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ACTIVITY_KINDS, required: true },
    item: foodItemSchema, // every kind except 'plan'
    app: { type: String, enum: ['zomato', 'swiggy', null], default: null }, // 'ordered': where they went
    plan: {
      budget: Number,
      total: Number,
      moodLabel: String,
      meals: [planMealSchema],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
