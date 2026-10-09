import Conversation from '../models/Conversation.js';
import { aiEnabled, understand, explainPicks, explainRecipes } from '../services/ai.js';
import { parseWithKeywords } from '../services/intent.js';
import { recommend } from '../services/ranking.js';
import { nearbyPicks } from '../services/nearby.js';
import { placesEnabled } from '../services/places.js';
import { prefsOf, tasteOf } from '../services/taste.js';
import { currentOccasion, findOccasion } from '../data/occasions.js';
import { tr } from '../i18n.js';
import { suggestRecipes } from '../services/cooking.js';
import { findIngredientsInText, labelOf, normalizeAll } from '../data/pantry.js';

const BRANCH_OPTIONS = [
  { id: 'order', label: 'Order in' },
  { id: 'cook', label: 'Cook at home' },
];
const SCAN_OPTION = { id: 'scan', label: 'Scan my fridge' };
const HISTORY_TURNS = 8;

// New values from this message override the slip; "avoid" and the kitchen only ever grow.
function mergeSlots(slots, intent) {
  for (const key of ['craving', 'diet', 'budgetMax', 'budgetStrict', 'budgetPerPerson', 'people', 'timeMax', 'branch']) {
    if (intent[key] !== null && intent[key] !== undefined) slots[key] = intent[key];
  }
  for (const key of ['moods', 'cuisines', 'dishWords']) {
    if (intent[key]?.length) slots[key] = intent[key];
  }
  for (const key of ['avoid', 'ingredients']) {
    if (intent[key]?.length) slots[key] = [...new Set([...(slots[key] ?? []), ...intent[key]])];
  }
}

function slipView(slots, user) {
  const p = prefsOf(user);
  const budget = slots.budgetMax ?? { low: 300, mid: 500, high: 900 }[p.budget] ?? null;
  return {
    craving: slots.craving || [...(slots.moods ?? []), ...(slots.cuisines ?? [])].slice(0, 2).join(', ') || null,
    diet: slots.diet ?? p.diet ?? null,
    budget,
    budgetFromProfile: !slots.budgetMax && Boolean(budget),
    people: slots.people > 1 ? slots.people : null,
    budgetPerPerson: slots.people > 1 && slots.budgetMax ? Boolean(slots.budgetPerPerson) : null,
    time: slots.timeMax ?? null,
    branch: slots.branch ?? null,
    ingredients: (slots.ingredients ?? []).map(labelOf),
  };
}

const kitchenOf = (slots) => (slots.ingredients ?? []).map((id) => ({ id, label: labelOf(id) }));
const listWords = (words) => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`);

// Plain wording, used only when Claude is unavailable.
const backupText = {
  ask: (heard) => tr(heard ? 'Got it. Would you like to order in, or cook at home?' : "Let's find you something. Would you like to order in, or cook at home?"),
  get offTopic() {
    return tr("I'm here to help you decide what to eat. Tell me what you feel like!");
  },
  get askKitchen() {
    return tr('Nice, let\'s cook! What do you have at home? Type a few things like "eggs, onion, bread", or scan your fridge.');
  },
  picks: ({ picks, relaxed }) => {
    const top = picks[0];
    if (top.source === 'places') {
      const extra = top.rating ? tr(' (★{r}, {km} km away)', { r: top.rating.toFixed(1), km: top.distanceKm }) : tr(' ({km} km away)', { km: top.distanceKm });
      return tr('My top pick is {name}{extra}. Here are your top {n} — tap one to order on Zomato or Swiggy.', { name: top.name, extra, n: picks.length });
    }
    const lead = relaxed === 'time' ? tr('Nothing arrives that fast, so I widened the time a little. ') : relaxed === 'budget' ? tr('Nothing fit the budget, so here are the closest options. ') : '';
    const cost = top.people > 1 ? tr('₹{price} each (about ₹{total} for {n})', { price: top.price, total: top.groupPrice, n: top.people }) : `₹${top.price}`;
    return tr('{lead}My top pick is {name} from {restaurant}: {cost}, about {eta} min. Here are your top {n}.', { lead, name: top.name, restaurant: top.restaurant, cost, eta: top.eta, n: picks.length });
  },
  recipes: (recipes) => {
    const top = recipes[0];
    const need = top.missing.length ? tr(" You'll just need {list}.", { list: listWords(top.missing.map((m) => m.label.toLowerCase())) }) : '';
    const count = recipes.length === 1 ? tr('Here is 1 recipe for what you have.') : tr('Here are {n} recipes for what you have.', { n: recipes.length });
    return tr('You can make {name} in about {time} min.{need} {count}', { name: top.name, time: top.time, need, count });
  },
};

// Read the message: Claude first, keywords if Claude is missing or fails.
async function readMessage(text, conv, user) {
  if (aiEnabled) {
    try {
      const history = conv.messages.slice(-HISTORY_TURNS).map((m) => ({ role: m.role, text: m.text }));
      const intent = await understand({ text, history, slip: slipView(conv.slots.toObject(), user) });
      return { ...intent, ingredients: normalizeAll(intent.ingredients).map((i) => i.id), source: 'ai' };
    } catch (err) {
      console.error('Claude could not read the message, using keywords:', err.message);
    }
  }
  const intent = parseWithKeywords(text);
  // Once they've chosen to cook, a plain list ("eggs, bread, onion") is their kitchen.
  if (!intent.ingredients.length && (intent.branch ?? conv.slots.branch) === 'cook') intent.ingredients = findIngredientsInText(text);
  const aboutFood = Boolean(intent.craving || intent.cuisines.length || intent.diet || intent.budgetMax || intent.timeMax || intent.branch || intent.ingredients.length);
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

async function describeRecipes(recipes, { text, intent, conv, user }) {
  const fallback = { message: backupText.recipes(recipes), reasons: {} };
  if (!aiEnabled || intent.source !== 'ai') return fallback;
  try {
    return await explainRecipes({
      text,
      language: intent.language,
      haveLabels: slipView(conv.slots.toObject(), user).ingredients,
      recipes,
      userName: user.name,
      taste: prefsOf(user),
    });
  } catch (err) {
    console.error('Claude could not explain the recipes, using templates:', err.message);
    return fallback;
  }
}

// Real nearby places when we know where they are and Google is set up;
// otherwise the sample Mumbai menu (handy for building and testing).
async function findPicks(slots, user, location) {
  const taste = await tasteOf(user);
  if (placesEnabled && location) {
    try {
      const result = await nearbyPicks(slots, taste, location);
      if (result.picks.length) return result;
    } catch (err) {
      console.error('Nearby search failed, using the sample menu:', err.message);
    }
  }
  return recommend(slots, taste);
}

function toPublic(conv, user) {
  return {
    id: conv._id,
    title: conv.title,
    slip: slipView(conv.slots, user),
    messages: conv.messages.map((m) => ({ id: m._id, role: m.role, text: m.text, kind: m.kind, options: m.options, picks: m.picks, recipes: m.recipes, at: m.createdAt })),
    updatedAt: conv.updatedAt,
  };
}

export async function sendMessage(req, res) {
  const { conversationId, text, location } = req.body;
  let conv = conversationId ? await Conversation.findOne({ _id: conversationId, user: req.user._id }) : null;
  if (conversationId && !conv) return res.status(404).json({ success: false, error: 'Chat not found' });
  if (!conv) conv = new Conversation({ user: req.user._id });

  const intent = await readMessage(text, conv, req.user);
  conv.messages.push({ role: 'user', text });
  mergeSlots(conv.slots, intent);
  if (conv.title === 'New chat' && conv.slots.craving) conv.title = conv.slots.craving.slice(0, 40).replace(/^\p{Ll}/u, (c) => c.toUpperCase());
  if (conv.title === 'New chat' && conv.slots.branch === 'cook') conv.title = 'Cooking at home';

  const slots = conv.slots.toObject();
  const hasWish = Boolean(slots.craving || slots.moods?.length || slots.cuisines?.length || slots.dishWords?.length || slots.branch || slots.ingredients?.length);
  let reply;
  let picks = [];
  let recipes = [];

  if (!intent.aboutFood && !hasWish) {
    reply = { kind: 'info', text: intent.reply ?? backupText.offTopic };
  } else if (!slots.branch) {
    reply = { kind: 'question', text: intent.reply ?? backupText.ask(slipView(slots, req.user).craving), options: BRANCH_OPTIONS };
  } else if (slots.branch === 'cook') {
    if (!slots.ingredients?.length) {
      reply = { kind: 'question', text: intent.reply ?? backupText.askKitchen, options: [SCAN_OPTION] };
    } else {
      const found = suggestRecipes(slots, await tasteOf(req.user));
      if (!found.length) {
        reply = {
          kind: 'info',
          text: "I couldn't find a recipe with just those. Add a few more things you have, or shall I find something to order?",
          options: [SCAN_OPTION, { id: 'order', label: 'Order in' }],
        };
      } else {
        const words = await describeRecipes(found, { text, intent, conv, user: req.user });
        recipes = found.map((r) => (words.reasons[r.id] ? { ...r, reason: words.reasons[r.id] } : r));
        reply = { kind: 'recipes', text: words.message };
      }
    }
  } else {
    const result = await findPicks(slots, req.user, location);
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
    picks: picks.map(({ id, source, name, restaurant, price, eta, rating, distanceKm, priceLabel, match, people, groupPrice }) => ({ id, source, name, restaurant, price, eta, rating, distanceKm, priceLabel, match, people, groupPrice })),
    recipes: recipes.map(({ id, name, time, level, have, total }) => ({ id, name, time, level, have, total })),
  });
  await conv.save();

  res.json({ success: true, conversation: toPublic(conv, req.user), picks, recipes, kitchen: kitchenOf(slots), understoodBy: intent.source });
}

// Recent chats, newest first: title, what Chatora last said and what it led to.
// ?before=<ISO date> loads the next page.
export async function listConversations(req, res) {
  const filter = { user: req.user._id, 'messages.0': { $exists: true } };
  const before = new Date(String(req.query.before ?? ''));
  if (!Number.isNaN(before.getTime())) filter.updatedAt = { $lt: before };
  const PAGE = 20;
  const list = await Conversation.find(filter)
    .sort({ updatedAt: -1 })
    .limit(PAGE + 1)
    .select({ title: 1, updatedAt: 1, 'slots.branch': 1, messages: { $slice: -1 } })
    .lean();
  const conversations = list.slice(0, PAGE).map((c) => {
    const last = c.messages[0];
    return {
      id: c._id,
      title: c.title,
      updatedAt: c.updatedAt,
      branch: c.slots?.branch ?? null,
      last: last ? { role: last.role, text: last.text.slice(0, 120), kind: last.kind, count: last.picks?.length || last.recipes?.length || 0 } : null,
    };
  });
  res.json({ success: true, conversations, more: list.length > PAGE });
}

export async function deleteConversation(req, res) {
  const ok = /^[a-f0-9]{24}$/.test(req.params.id) && (await Conversation.deleteOne({ _id: req.params.id, user: req.user._id })).deletedCount;
  if (!ok) return res.status(404).json({ success: false, error: 'Chat not found' });
  res.json({ success: true });
}

export async function clearConversations(req, res) {
  const { deletedCount } = await Conversation.deleteMany({ user: req.user._id });
  res.json({ success: true, deleted: deletedCount });
}

export async function getConversation(req, res) {
  const conv = /^[a-f0-9]{24}$/.test(req.params.id) ? await Conversation.findOne({ _id: req.params.id, user: req.user._id }) : null;
  if (!conv) return res.status(404).json({ success: false, error: 'Chat not found' });
  // Re-run the picks so the results screens can reopen a past chat.
  const slots = conv.slots.toObject();
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const location = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, city: String(req.query.city ?? '') } : null;
  const picks = slots.branch === 'order' ? (await findPicks(slots, req.user, location)).picks : [];
  const recipes = slots.branch === 'cook' && slots.ingredients?.length ? suggestRecipes(slots, await tasteOf(req.user)) : [];
  res.json({ success: true, conversation: toPublic(conv, req.user), picks, recipes, kitchen: kitchenOf(slots) });
}

// One-tap picks without a chat: Home's mood circles and "Chatora's pick".
// Home's mood circles, Chatora's pick, and the festival / season special.
export async function quickPicks(req, res) {
  const { mood, occasion, location } = req.body;
  const special = occasion ? findOccasion(occasion) : null;
  const slots = special ? { ...special.slots, branch: 'order' } : { moods: mood ? [mood] : [], branch: 'order' };
  const result = await findPicks(slots, req.user, location);
  res.json({ success: true, picks: result.picks, relaxed: result.relaxed });
}

// Today's festival or season special for Home, or null.
export function occasionNow(req, res) {
  const o = currentOccasion();
  res.json({ success: true, occasion: o && { id: o.id, title: tr(o.title), subtitle: tr(o.subtitle), icon: o.icon } });
}

// Lets the app show whether Chatora is running on Claude.
export function status(req, res) {
  res.json({ success: true, ai: aiEnabled, places: placesEnabled });
}
