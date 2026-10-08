import mongoose from 'mongoose';
import { foodItemSchema } from './FoodItem.js';

export const ACTIVITY_KINDS = ['opened', 'ordered', 'not_for_me', 'plan'];

const recipeRefSchema = new mongoose.Schema({ id: String, name: String, time: Number, level: String }, { _id: false });
// One meal of a saved day: what was showing, whether they cook it, and the
// swaps it had, so the day reopens exactly as it was.
const planMealSchema = new mongoose.Schema(
  {
    meal: String,
    label: String,
    cook: Boolean,
    item: foodItemSchema,
    recipe: recipeRefSchema, // the recipe they cook (when cook is true)
    home: recipeRefSchema, // the home recipe for the showing pick
    options: [new mongoose.Schema({ item: foodItemSchema, home: recipeRefSchema }, { _id: false })],
  },
  { _id: false }
);

// What someone did with a pick. It feeds taste learning, and 'ordered' and
// 'plan' show up in History. Opens and orders are only recorded while
// "Remember my taste" is on; a saved day always is.
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
