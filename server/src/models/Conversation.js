import mongoose from 'mongoose';

const pickSchema = new mongoose.Schema(
  { id: String, name: String, restaurant: String, price: Number, eta: Number, match: Number },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  { id: String, name: String, time: Number, level: String, have: Number, total: Number },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'ai'], required: true },
    text: { type: String, required: true },
    // ai messages: 'question' asks for something, 'picks' carries dishes to order,
    // 'recipes' carries things to cook, 'info' is plain text
    kind: { type: String, enum: ['text', 'question', 'picks', 'recipes', 'info'], default: 'text' },
    options: [{ _id: false, id: String, label: String }],
    picks: [pickSchema],
    recipes: [recipeSchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One chat about one meal decision. `slots` is the "order slip" so far.
const conversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'New chat' },
    slots: {
      craving: { type: String, default: null },
      moods: [String],
      cuisines: [String],
      dishWords: [String],
      diet: { type: String, default: null },
      budgetMax: { type: Number, default: null },
      budgetStrict: { type: Boolean, default: null },
      timeMax: { type: Number, default: null },
      branch: { type: String, default: null },
      avoid: [String],
      // Cook at home: pantry ids of what they have (unknown items as 'x-name').
      ingredients: [String],
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Conversation', conversationSchema);
