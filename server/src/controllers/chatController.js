import Conversation from '../models/Conversation.js';
import { aiEnabled, understand, explainPicks } from '../services/ai.js';
import { parseWithKeywords } from '../services/intent.js';
import { recommend } from '../services/ranking.js';

const BRANCH_OPTIONS = [
  { id: 'order', label: 'Order in' },
  { id: 'cook', label: 'Cook at home' },
];
const HISTORY_TURNS = 8;

// New values from this message override the slip; "avoid" only ever grows.
function mergeSlots(slots, intent) {
  for (const key of ['craving', 'diet', 'budgetMax', 'budgetStrict', 'timeMax', 'branch']) {
    if (intent[key] !== null && intent[key] !== undefined) slots[key] = intent[key];
  }
  for (const key of ['moods', 'cuisines', 'dishWords']) {
    if (intent[key]?.length) slots[key] = intent[key];
  }
  if (intent.avoid?.length) slots.avoid = [...new Set([...(slots.avoid ?? []), ...intent.avoid])];
}

const prefsOf = (user) => (user.memoryEnabled ? user.preferences?.toObject?.() ?? user.preferences ?? {} : {});

function slipView(slots, user) {
  const p = prefsOf(user);
  const budget = slots.budgetMax ?? { low: 300, mid: 500, high: 900 }[p.budget] ?? null;
  return {
    craving: slots.craving || [...(slots.moods ?? []), ...(slots.cuisines ?? [])].slice(0, 2).join(', ') || null,
    diet: slots.diet ?? p.diet ?? null,
    budget,
    budgetFromProfile: !slots.budgetMax && Boolean(budget),
    time: slots.timeMax ?? null,
    branch: slots.branch ?? null,
  };
}

// Plain wording, used only when Claude is unavailable.
const backupText = {
  ask: (heard) => `${heard ? 'Got it.' : "Let's find you something."} Would you like to order in, or cook at home?`,
  offTopic: "I'm here to help you decide what to eat. Tell me what you feel like!",
  picks: ({ picks, relaxed }) => {
    const top = picks[0];
    const lead = relaxed === 'time' ? 'Nothing arrives that fast, so I widened the time a little. ' : relaxed === 'budget' ? 'Nothing fit the budget, so here are the closest options. ' : '';
    return `${lead}My top pick is ${top.name} from ${top.restaurant}: ₹${top.price}, about ${top.eta} min. Here are your top ${picks.length}.`;
  },
};

// Read the message: Claude first, keywords if Claude is missing or fails.
async function readMessage(text, conv, user) {
  if (aiEnabled) {
    try {
      const history = conv.messages.slice(-HISTORY_TURNS).map((m) => ({ role: m.role, text: m.text }));
      return { ...(await understand({ text, history, slip: slipView(conv.slots.toObject(), user) })), source: 'ai' };
    } catch (err) {
      console.error('Claude could not read the message, using keywords:', err.message);
    }
  }
  const intent = parseWithKeywords(text);
  const aboutFood = Boolean(intent.craving || intent.cuisines.length || intent.diet || intent.budgetMax || intent.timeMax || intent.branch);
  return { ...intent, aboutFood, language: 'english', reply: null, source: 'keywords' };
}

// Final answer + one reason per dish: Claude's words when possible.
async function describePicks(result, { text, intent, conv, user }) {
  const fallback = { message: backupText.picks(result), reasons: {} };
  if (!aiEnabled || intent.source !== 'ai') return fallback;
  try {
    return await explainPicks({
      text,
      language: intent.language,
      slip: slipView(conv.slots.toObject(), user),
      picks: result.picks,
      relaxed: result.relaxed,
      userName: user.name,
      taste: prefsOf(user),
    });
  } catch (err) {
    console.error('Claude could not explain the picks, using templates:', err.message);
    return fallback;
  }
}

function toPublic(conv, user) {
  return {
    id: conv._id,
    title: conv.title,
    slip: slipView(conv.slots, user),
    messages: conv.messages.map((m) => ({ id: m._id, role: m.role, text: m.text, kind: m.kind, options: m.options, picks: m.picks, at: m.createdAt })),
    updatedAt: conv.updatedAt,
  };
}

export async function sendMessage(req, res) {
  const { conversationId, text } = req.body;
  let conv = conversationId ? await Conversation.findOne({ _id: conversationId, user: req.user._id }) : null;
  if (conversationId && !conv) return res.status(404).json({ success: false, error: 'Chat not found' });
  if (!conv) conv = new Conversation({ user: req.user._id });

  const intent = await readMessage(text, conv, req.user);
  conv.messages.push({ role: 'user', text });
  mergeSlots(conv.slots, intent);
  if (conv.title === 'New chat' && conv.slots.craving) conv.title = conv.slots.craving.slice(0, 40);

  const slots = conv.slots.toObject();
  const hasWish = Boolean(slots.craving || slots.moods?.length || slots.cuisines?.length || slots.dishWords?.length || slots.branch);
  let reply;
  let picks = [];

  if (!intent.aboutFood && !hasWish) {
    reply = { kind: 'info', text: intent.reply ?? backupText.offTopic };
  } else if (!slots.branch) {
    reply = { kind: 'question', text: intent.reply ?? backupText.ask(slipView(slots, req.user).craving), options: BRANCH_OPTIONS };
  } else if (slots.branch === 'cook') {
    reply = {
      kind: 'info',
      text: 'Cooking from your fridge is the next part we are building. Shall I find something to order instead?',
      options: [{ id: 'order', label: 'Order in' }],
    };
  } else {
    const result = recommend(slots, prefsOf(req.user));
    if (!result.picks.length) {
      reply = { kind: 'info', text: "I couldn't find anything that fits. Try a different craving or a bigger budget?" };
    } else {
      const words = await describePicks(result, { text, intent, conv, user: req.user });
      picks = result.picks.map((p) => (words.reasons[p.id] ? { ...p, reasons: [{ icon: 'spark', text: words.reasons[p.id] }, ...p.reasons].slice(0, 4) } : p));
      reply = { kind: 'picks', text: words.message };
    }
  }

  conv.messages.push({
    role: 'ai',
    text: reply.text,
    kind: reply.kind,
    options: reply.options ?? [],
    picks: picks.map(({ id, name, restaurant, price, eta, match }) => ({ id, name, restaurant, price, eta, match })),
  });
  await conv.save();

  res.json({ success: true, conversation: toPublic(conv, req.user), picks, understoodBy: intent.source });
}

export async function listConversations(req, res) {
  const list = await Conversation.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(30).select('title updatedAt');
  res.json({ success: true, conversations: list.map((c) => ({ id: c._id, title: c.title, updatedAt: c.updatedAt })) });
}

export async function getConversation(req, res) {
  const conv = /^[a-f0-9]{24}$/.test(req.params.id) ? await Conversation.findOne({ _id: req.params.id, user: req.user._id }) : null;
  if (!conv) return res.status(404).json({ success: false, error: 'Chat not found' });
  // Re-run the picks so the results screen can reopen a past chat.
  const slots = conv.slots.toObject();
  const picks = slots.branch === 'order' ? recommend(slots, prefsOf(req.user)).picks : [];
  res.json({ success: true, conversation: toPublic(conv, req.user), picks });
}

// One-tap picks without a chat: Home's mood circles and "Chatora's pick".
export async function quickPicks(req, res) {
  const { mood } = req.body;
  const result = recommend({ moods: mood ? [mood] : [], branch: 'order' }, prefsOf(req.user));
  res.json({ success: true, picks: result.picks, relaxed: result.relaxed });
}

// Lets the app show whether Chatora is running on Claude.
export function status(req, res) {
  res.json({ success: true, ai: aiEnabled });
}
