import Conversation from '../models/Conversation.js';
import Report from '../models/Report.js';

// POST /api/reports: flag something Chatora wrote. For chats the server takes
// the text from the saved message itself, so a report can't be made up.
export async function createReport(req, res) {
  const { kind, conversationId, messageId, reason, note = '' } = req.body;
  let text = req.body.text;
  if (kind === 'chat') {
    const conv = await Conversation.findOne({ _id: conversationId, user: req.user._id }).select({ messages: { $elemMatch: { _id: messageId } } });
    const message = conv?.messages?.[0];
    if (!message || message.role !== 'ai') return res.status(404).json({ success: false, error: 'Message not found' });
    text = message.text;
  }
  await Report.create({ user: req.user._id, kind, conversation: conversationId ?? null, messageId: messageId ?? null, text, reason, note });
  console.warn(`Report (${reason}) from ${req.user._id}: ${text.slice(0, 120)}`);
  res.status(201).json({ success: true });
}
