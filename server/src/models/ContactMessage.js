import mongoose from 'mongoose';

export const CONTACT_TOPICS = ['business', 'karis', 'kya-khaun', 'privacy', 'other'];

// A message from the company website's contact form.
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    topic: { type: String, enum: CONTACT_TOPICS, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['new', 'answered'], default: 'new' },
  },
  { timestamps: true }
);

export default mongoose.model('ContactMessage', contactMessageSchema);
