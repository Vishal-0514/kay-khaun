import Conversation from '../models/Conversation.js';
import { aiEnabled, aiAllowedFor, understand, explainPicks, explainRecipes, explainOutings } from '../services/ai.js';
import { parseWithKeywords } from '../services/intent.js';
import { recommend } from '../services/ranking.js';
import { nearbyPicks } from '../services/nearby.js';
import { placesEnabled } from '../services/places.js';
import { prefsOf, tasteOf } from '../services/taste.js';
import { currentOccasion, findOccasion, occasionSlots } from '../data/occasions.js';
import { currentLang, tr } from '../i18n.js';
import { suggestRecipes } from '../services/cooking.js';
import { findIngredientsInText, labelOf, normalizeAll } from '../data/pantry.js';
import { contextFacts, contextFor, drinkLabel, withHints } from '../services/context.js';
import { OUTINGS, OUTING_OPTIONS, outingPicks } from '../services/outing.js';

const BRANCH_OPTIONS = [
  { id: 'order', label: 'Order in' },
  { id: 'cook', label: 'Cook at home' },
  { id: 'out', label: 'Go out' },
];
const SCAN_OPTION = { id: 'scan', label: 'Scan my fridge' };

// Ordering: Chatora asks only what it doesn't know yet, one thing at a time:
// what they feel like, then veg or non-veg, then the budget.
const CRAVING_OPTIONS = [
  { id: 'mood-spicy', label: 'Something spicy' },
  { id: 'mood-comfort', label: 'Comfort food' },
  { id: 'mood-light', label: 'Something healthy' },
  { id: 'mood-street', label: 'Street food' },
  { id: 'mood-sweet', label: 'Something sweet' },
  { id: 'dish-biryani', label: 'Biryani' },
];
const DIET_OPTIONS = [
  { id: 'diet-veg', label: 'Veg' },
  { id: 'diet-nonveg', label: 'Non-veg' },
  { id: 'diet-any', label: 'Anything is fine' },
];
const BUDGET_OPTIONS = [
  { id: 'budget-200', label: 'Under ₹200' },
  { id: 'budget-300', label: 'Under ₹300' },
  { id: 'budget-500', label: 'Under ₹500' },
  { id: 'budget-1000', label: 'Under ₹1000' },
  { id: 'budget-any', label: 'Any budget' },
];
// A short answer to the question just asked: "anything", "koi bhi", "doesn't matter".
const ANY_ANSWER = /(^|[^a-z])(any|anything|either|both|dono|koi bhi|kuch bhi|chalega|doesn'?t matter|no preference|no budget|any budget|whatever)([^a-z]|$)/i;

// Sweets, desserts and drinks: never ask veg or non-veg, and never show meat.
const SWEET = /sweet|dessert|mithai|meetha|halwa|kheer|jamun|rasmalai|rasgulla|kulfi|ice ?cream|cake|pastry|jalebi|ladoo|laddu|barfi|peda|shrikhand|payasam|falooda|brownie|waffle|donut|chocolate|shake|lassi|chai|coffee|juice|smoothie/i;
export function isSweetish(slots) {
  if (slots.moods?.includes('sweet') || slots.cuisines?.includes('Desserts')) return true;
  const words = [slots.craving, ...(slots.dishWords ?? [])].filter(Boolean).join(' ');
  return Boolean(words) && SWEET.test(words) && !/chicken|mutton|fish|prawn|egg|keema|meat/i.test(words);
}

// The diet to search with: sweets are always veg; "anything" means no filter.
export function searchDiet(slots) {
  if (isSweetish(slots)) return 'veg';
  return slots.diet && slots.diet !== 'any' ? slots.diet : null;
}

const hasFoodWish = (slots) => Boolean(slots.craving || slots.moods?.length || slots.cuisines?.length || slots.dishWords?.length || slots.drink);

// What to ask next before showing picks, or null when there's enough to search.
export function nextOrderQuestion(slots) {
  if (!hasFoodWish(slots)) return { asking: 'craving', text: tr('What are you in the mood for?'), options: CRAVING_OPTIONS };
  if (!slots.diet && !isSweetish(slots)) return { asking: 'diet', text: tr('Veg or non-veg?'), options: DIET_OPTIONS };
  if (!slots.budgetMax && !slots.budgetAny) return { asking: 'budget', text: tr("What's your budget?"), options: BUDGET_OPTIONS };
  return null;
}
const HISTORY_TURNS = 8;

// New values from this message override the slip; "avoid" and the kitchen only ever grow.
function mergeSlots(slots, intent) {
  for (const key of ['craving', 'diet', 'budgetMax', 'budgetStrict', 'budgetAny', 'budgetPerPerson', 'people', 'timeMax', 'branch', 'drink', 'outing']) {
    if (intent[key] !== null && intent[key] !== undefined) slots[key] = intent[key];
  }
  for (const key of ['moods', 'cuisines', 'dishWords']) {
    if (intent[key]?.length) slots[key] = intent[key];
  }
  for (const key of ['avoid', 'ingredients']) {
    if (intent[key]?.length) slots[key] = [...new Set([...(slots[key] ?? []), ...intent[key]])];
  }
}

function slipView(slots) {
  const budget = slots.budgetMax ?? null;
  return {
    craving: slots.craving || [...(slots.moods ?? []), ...(slots.cuisines ?? [])].slice(0, 2).join(', ') || null,
    diet: searchDiet(slots) ?? slots.diet ?? null,
    budget,
    budgetFromProfile: false,
    people: slots.people > 1 ? slots.people : null,
    budgetPerPerson: slots.people > 1 && slots.budgetMax ? Boolean(slots.budgetPerPerson) : null,
    time: slots.timeMax ?? null,
    branch: slots.branch ?? null,
    ingredients: (slots.ingredients ?? []).map(labelOf),
    drink: drinkLabel(slots.drink),
    outing: slots.branch === 'out' && OUTINGS[slots.outing] ? tr(OUTINGS[slots.outing].label) : null,
  };
}

const kitchenOf = (slots) => (slots.ingredients ?? []).map((id) => ({ id, label: labelOf(id) }));
const listWords = (words) => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`);

// Plain wording, used only when Claude is unavailable.
const backupText = {
  ask: (heard) => tr(heard ? 'Got it. Would you like to order in, cook at home, or go out?' : "Let's find you something. Would you like to order in, cook at home, or go out?"),
  get askOuting() {
    return tr("Let's go out! What are you in the mood for — a café, dinner, somewhere chill, live music, a date, outdoors or a long drive?");
  },
  get needLocation() {
    return tr('To find places near you, I need your location. Turn on location for Kya Khaun, then ask me again.');
  },
  get noOutings() {
    return tr("I couldn't find a good place for that nearby right now. Try a different kind of outing?");
  },
  outings: ({ picks }) => {
    const top = picks[0];
    const time = top.travelMin ? tr('{n} min away', { n: top.travelMin }) : tr('{km} km away', { km: top.distanceKm });
    return tr('Try {name} ({time}). Here are {n} places — tap Directions to go.', { name: top.name, time, n: picks.length });
  },
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
  if (aiAllowedFor(user)) {
    try {
      const history = conv.messages.slice(-HISTORY_TURNS).map((m) => ({ role: m.role, text: m.text }));
      const intent = await understand({ text, history, slip: slipView(conv.slots.toObject()) });
      return { ...intent, ingredients: normalizeAll(intent.ingredients).map((i) => i.id), source: 'ai' };
    } catch (err) {
      console.error('Claude could not read the message, using keywords:', err.message);
    }
  }
  const intent = parseWithKeywords(text);
  // Once they've chosen to cook, a plain list ("eggs, bread, onion") is their kitchen.
  if (!intent.ingredients.length && (intent.branch ?? conv.slots.branch) === 'cook') intent.ingredients = findIngredientsInText(text);
  if ((intent.branch ?? conv.slots.branch) !== 'out') intent.outing = null;
  const aboutFood = Boolean(intent.craving || intent.cuisines.length || intent.diet || intent.budgetMax || intent.timeMax || intent.branch || intent.ingredients.length || intent.drink || intent.outing);
  return { ...intent, aboutFood, language: 'english', reply: null, source: 'keywords' };
}

// Final answer + one reason per dish: Claude's words when possible.
async function describePicks(result, { text, intent, conv, user, ctx }) {
  const fallback = { message: backupText.picks(result), reasons: {} };
  if (!aiEnabled || intent.source !== 'ai') return fallback;
  try {
    return await explainPicks({
      text,
      language: intent.language,
      slip: slipView(conv.slots.toObject()),
      picks: result.picks,
      relaxed: result.relaxed,
      userName: user.name,
      taste: prefsOf(user),
      moment: contextFacts(ctx),
    });
  } catch (err) {
    console.error('Claude could not explain the picks, using templates:', err.message);
    return fallback;
  }
}

async function describeRecipes(recipes, { text, intent, conv, user, ctx }) {
  const fallback = { message: backupText.recipes(recipes), reasons: {} };
  if (!aiEnabled || intent.source !== 'ai') return fallback;
  try {
    return await explainRecipes({
      text,
      language: intent.language,
      haveLabels: slipView(conv.slots.toObject()).ingredients,
      recipes,
      userName: user.name,
      taste: prefsOf(user),
      moment: contextFacts(ctx),
    });
  } catch (err) {
    console.error('Claude could not explain the recipes, using templates:', err.message);
    return fallback;
  }
}

// Go Out: places for the outing, with drive times. Empty if it can't search.
export async function findOutings(slots, user, location, ctx) {
  if (!placesEnabled || !location) return { picks: [] };
  try {
    return await outingPicks(slots, await tasteOf(user), location, { weather: ctx?.weather ?? null });
  } catch (err) {
    console.error('Go Out search failed:', err.message);
    return { picks: [] };
  }
}

async function describeOutings(result, { text, intent, conv, user, ctx }) {
  const fallback = { message: backupText.outings(result), reasons: {} };
  if (!aiEnabled || intent.source !== 'ai') return fallback;
  try {
    return await explainOutings({
      text,
      language: intent.language,
      slip: slipView(conv.slots.toObject()),
      outing: result.outing,
      picks: result.picks,
      userName: user.name,
      moment: contextFacts(ctx),
    });
  } catch (err) {
    console.error('Claude could not explain the outings, using templates:', err.message);
    return fallback;
  }
}

// Real nearby places when we know where they are and Google is set up;
// otherwise the sample Mumbai menu (handy for building and testing).
// ctx: the drink and weather (services/context.js); looked up here when not given.
export async function findPicks(slots, user, location, ctx) {
  const taste = await tasteOf(user);
  slots = withHints({ ...slots, diet: searchDiet(slots) }, ctx ?? (await contextFor(slots, location)));
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

export function toPublic(conv, user) {
  return {
    id: conv._id,
    title: conv.title,
    slip: slipView(conv.slots),
    messages: conv.messages.map((m) => ({ id: m._id, role: m.role, text: m.text, kind: m.kind, options: m.options, picks: m.picks, recipes: m.recipes, outings: m.outings, at: m.createdAt })),
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
  const asked = conv.slots.asking;
  if (asked === 'diet' && !intent.diet && ANY_ANSWER.test(text)) intent.diet = 'any';
  if (asked === 'budget' && !intent.budgetMax && ANY_ANSWER.test(text)) intent.budgetAny = true;
  if (intent.budgetMax) intent.budgetAny = false;
  // Picking a craving from the buttons ("Something sweet") counts as a wish even without Claude.
  if (asked === 'craving' && !intent.craving && !intent.moods?.length && intent.aboutFood !== false) intent.craving = text.slice(0, 60);
  mergeSlots(conv.slots, intent);
  conv.slots.asking = null;
  if (conv.title === 'New chat' && conv.slots.craving) conv.title = conv.slots.craving.slice(0, 40).replace(/^\p{Ll}/u, (c) => c.toUpperCase());
  if (conv.title === 'New chat' && conv.slots.branch === 'cook') conv.title = 'Cooking at home';
  if (conv.title === 'New chat' && conv.slots.branch === 'out') conv.title = OUTINGS[conv.slots.outing] ? `Going out: ${OUTINGS[conv.slots.outing].label}` : 'Going out';

  const slots = conv.slots.toObject();
  const hasWish = Boolean(slots.craving || slots.moods?.length || slots.cuisines?.length || slots.dishWords?.length || slots.branch || slots.ingredients?.length || slots.drink || slots.outing);
  const ctx = await contextFor(slots, location);
  let reply;
  let picks = [];
  let recipes = [];
  let outings = [];

  if (!intent.aboutFood && !hasWish) {
    reply = { kind: 'info', text: intent.reply ?? backupText.offTopic };
  } else if (!slots.branch) {
    reply = { kind: 'question', text: intent.reply ?? backupText.ask(slipView(slots).craving), options: BRANCH_OPTIONS };
  } else if (slots.branch === 'out') {
    if (!slots.outing) {
      reply = { kind: 'question', text: intent.reply ?? backupText.askOuting, options: OUTING_OPTIONS };
    } else if (!location || !placesEnabled) {
      reply = { kind: 'info', text: backupText.needLocation };
    } else {
      const result = await findOutings(slots, req.user, location, ctx);
      if (!result.picks.length) {
        reply = { kind: 'info', text: backupText.noOutings, options: OUTING_OPTIONS };
      } else {
        const words = await describeOutings(result, { text, intent, conv, user: req.user, ctx });
        outings = result.picks.map((p) => (words.reasons[p.id] ? { ...p, reasons: [{ icon: 'spark', text: words.reasons[p.id] }, ...p.reasons].slice(0, 4) } : p));
        reply = { kind: 'outings', text: words.message };
      }
    }
  } else if (slots.branch === 'cook') {
    if (!slots.ingredients?.length) {
      reply = { kind: 'question', text: intent.reply ?? backupText.askKitchen, options: [SCAN_OPTION] };
    } else {
      const found = suggestRecipes(withHints(slots, ctx), await tasteOf(req.user));
      if (!found.length) {
        reply = {
          kind: 'info',
          text: "I couldn't find a recipe with just those. Add a few more things you have, or shall I find something to order?",
          options: [SCAN_OPTION, { id: 'order', label: 'Order in' }],
        };
      } else {
        const words = await describeRecipes(found, { text, intent, conv, user: req.user, ctx });
        recipes = found.map((r) => (words.reasons[r.id] ? { ...r, reason: words.reasons[r.id] } : r));
        reply = { kind: 'recipes', text: words.message };
      }
    }
  } else if (nextOrderQuestion(slots)) {
    const q = nextOrderQuestion(slots);
    conv.slots.asking = q.asking;
    reply = { kind: 'question', text: q.text, options: q.options };
  } else {
    const result = await findPicks(slots, req.user, location, ctx);
    if (!result.picks.length) {
      reply = { kind: 'info', text: "I couldn't find anything that fits. Try a different craving or a bigger budget?" };
    } else {
      const words = await describePicks(result, { text, intent, conv, user: req.user, ctx });
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
    outings: outings.map(({ id, placeId, outing, name, restaurant, area, rating, travelMin, distanceKm }) => ({ id, placeId, outing, name, restaurant, area, rating, travelMin, distanceKm })),
  });
  await conv.save();

  res.json({ success: true, conversation: toPublic(conv, req.user), picks, recipes, outings, kitchen: kitchenOf(slots), understoodBy: intent.source });
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
  const recipes = slots.branch === 'cook' && slots.ingredients?.length ? suggestRecipes(withHints(slots, await contextFor(slots, null)), await tasteOf(req.user)) : [];
  const outings = slots.branch === 'out' && slots.outing ? (await findOutings(slots, req.user, location, await contextFor(slots, location))).picks : [];
  res.json({ success: true, conversation: toPublic(conv, req.user), picks, recipes, outings, kitchen: kitchenOf(slots) });
}

// One-tap picks without a chat: Home's mood circles and "Chatora's pick".
// Home's mood circles, Chatora's pick, and the festival / season special.
export async function quickPicks(req, res) {
  const { mood, occasion, dish, dishName, diet, location } = req.body;
  const special = occasion ? findOccasion(occasion) : null;
  // A festival dish ("Sabudana khichdi") or any dish by name finds restaurants that serve it.
  const slots = special
    ? { ...occasionSlots(special, dish), branch: 'order' }
    : dishName
      ? { craving: dishName, dishWords: [dishName.toLowerCase()], diet: diet && diet !== 'any' ? diet : null, moods: [], cuisines: [], branch: 'order' }
      : { moods: mood ? [mood] : [], branch: 'order' };
  const result = await findPicks(slots, req.user, location);
  res.json({ success: true, picks: result.picks, relaxed: result.relaxed });
}

// Order for a Group: places that suit everyone. All veg → pure veg places; a
// mixed group → places with both (no filter). The budget is per person.
const GROUP_QUERY = { friends: 'restaurant for groups of friends', family: 'family restaurant', office: 'restaurant for office group lunch', party: 'party restaurant for groups' };
export function groupSlots({ people, veg, budgetPerHead, kind = 'friends', cuisine }) {
  return {
    branch: 'order',
    people,
    budgetMax: budgetPerHead ?? null,
    budgetPerPerson: true,
    budgetStrict: false,
    diet: veg >= people ? 'veg' : null,
    cuisines: cuisine ? [cuisine] : [],
    moods: [],
    dishWords: [],
    hintQuery: cuisine ? null : GROUP_QUERY[kind],
    hintWords: [],
    hintMoods: [],
    hintCuisines: [],
    craving: tr('Group of {n}', { n: people }),
  };
}

export async function groupPicks(req, res) {
  const { people, veg, budgetPerHead, location } = req.body;
  // No weather or drink hints here: the group search says what to look for.
  const result = await findPicks(groupSlots(req.body), req.user, location, {});
  res.json({
    success: true,
    picks: result.picks,
    group: { people, veg, nonveg: people - veg, budgetPerHead: budgetPerHead ?? null, total: budgetPerHead ? budgetPerHead * people : null },
  });
}

// Today's festival (or the season) for Home, with the dishes people eat for it, or null.
export function occasionNow(req, res) {
  const o = currentOccasion();
  const hi = currentLang() === 'hi';
  res.json({
    success: true,
    occasion: o && {
      id: o.id,
      kind: o.kind,
      title: hi ? o.hiTitle ?? o.title : o.title,
      subtitle: hi ? o.hiSubtitle ?? o.subtitle : o.subtitle,
      icon: o.icon,
      note: o.note ? tr(o.note) : null,
      veg: o.diet === 'veg',
      dishes: (o.dishes ?? []).map((x) => ({ id: x.id, name: hi ? x.hi : x.name, icon: x.icon })),
    },
  });
}

// Lets the app show whether Chatora is running on Claude.
export function status(req, res) {
  res.json({ success: true, ai: aiEnabled, places: placesEnabled });
}
