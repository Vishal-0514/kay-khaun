import mongoose from 'mongoose';

// A restaurant's own page on Zomato or Swiggy, found once and remembered, so
// the next person who taps "Zomato" goes straight there. "Not on Zomato" is
// remembered too (for less time, in case they join). Entries expire by themselves.
const orderPageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // "zomato:<Google place id>"
    url: { type: String, default: null }, // null = not found on that app
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export default mongoose.model('OrderPage', orderPageSchema);
