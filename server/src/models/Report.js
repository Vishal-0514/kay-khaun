import mongoose from 'mongoose';

export const REPORT_REASONS = ['wrong', 'unsafe', 'offensive', 'other'];
export const REPORT_KINDS = ['chat', 'plan'];

// "Report this reply": someone flagged something Chatora (the AI) wrote.
// The text is copied in, so the report still makes sense if the chat is deleted.
const reportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    kind: { type: String, enum: REPORT_KINDS, required: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, default: null },
    messageId: { type: mongoose.Schema.Types.ObjectId, default: null },
    text: { type: String, required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    note: { type: String, default: '' },
    status: { type: String, enum: ['open', 'reviewed'], default: 'open' },
  },
  { timestamps: true }
);

export default mongoose.model('Report', reportSchema);
