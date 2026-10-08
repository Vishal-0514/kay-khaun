import mongoose from 'mongoose';

// A copy of a pick (sample dish or real place) as it was shown, so Saved and
// History still open after the picks have changed.
export const foodItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    source: String, // 'sample' | 'places'
    name: String,
    restaurant: String,
    area: String,
    cuisine: String,
    diet: String,
    price: Number,
    eta: Number,
    rating: Number,
    ratingCount: Number,
    spice: Number,
    spiceLabel: String,
    distanceKm: Number,
    priceLabel: String,
    ideas: [String],
    links: { zomato: String, swiggy: String, maps: String },
  },
  { _id: false }
);
