import Activity from '../models/Activity.js';
import Saved from '../models/Saved.js';
import { tr } from '../i18n.js';

// Taste learning. What someone opens, orders, saves or marks "Not for me"
// becomes a gentle nudge in the ranking: liked dishes and cuisines rise,
// "Not for me" sinks. Recent actions count more (they fade over ~a month).
// Nothing is learned or used while "Remember my taste" is off.

const WEIGHT = { opened: 0.3, ordered: 1, not_for_me: -2.5 };
const SAVE_WEIGHT = 1.2;
const HALF_LIFE_DAYS = 30;
const LOOKBACK = 300;

// The saved taste profile, or nothing when memory is off.
export const prefsOf = (user) => (user.memoryEnabled ? user.preferences?.toObject?.() ?? user.preferences ?? {} : {});

// Squash a running score into -1..1 so one tap nudges and a habit counts.
const squash = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Math.tanh(v / 2.5)]));

export async function learnedFor(user) {
  if (!user.memoryEnabled) return null;
  const [acts, saved] = await Promise.all([
    Activity.find({ user: user._id, kind: { $in: Object.keys(WEIGHT) } })
      .sort({ createdAt: -1 })
      .limit(LOOKBACK)
      .select('kind item.id item.cuisine createdAt')
      .lean(),
    Saved.find({ user: user._id }).select('item.id item.cuisine').lean(),
  ]);

  const items = {};
  const cuisines = {};
  const add = (map, key, w) => {
    if (key) map[key] = (map[key] ?? 0) + w;
  };
  const ordered = new Set();
  const notForMe = new Set();
  const now = Date.now();
  for (const a of acts) {
    const fade = 0.5 ** ((now - new Date(a.createdAt).getTime()) / (HALF_LIFE_DAYS * 864e5));
    add(items, a.item?.id, WEIGHT[a.kind] * fade);
    // One "Not for me" is about that dish, so the cuisine only dips a little.
    add(cuisines, a.item?.cuisine, (a.kind === 'not_for_me' ? -0.4 : WEIGHT[a.kind]) * fade);
    if (a.kind === 'ordered') ordered.add(a.item.id);
    if (a.kind === 'not_for_me') notForMe.add(a.item.id);
  }
  for (const s of saved) {
    add(items, s.item.id, SAVE_WEIGHT);
    add(cuisines, s.item.cuisine, SAVE_WEIGHT * 0.6);
  }
  return {
    items: squash(items),
    cuisines: squash(cuisines),
    ordered,
    saved: new Set(saved.map((s) => s.item.id)),
    notForMe,
    signals: acts.length + saved.length,
  };
}

// Taste profile plus what's been learned: what ranking.js and nearby.js use.
export async function tasteOf(user) {
  const prefs = prefsOf(user);
  const learned = await learnedFor(user);
  return learned ? { ...prefs, learned } : prefs;
}

// How much one learned taste nudges a pick, and why (for the reasons list).
export function learnedNudge(learned, id, cuisine) {
  if (!learned) return { boost: 0, cuisineAff: 0, reason: null };
  const itemAff = learned.items[id] ?? 0;
  const cuisineAff = learned.cuisines[cuisine] ?? 0;
  let boost = 0.1 * itemAff;
  if (learned.notForMe.has(id) && !learned.saved.has(id)) boost -= 0.5;
  let reason = null;
  if (learned.saved.has(id)) reason = { icon: 'heart', text: tr('You saved this') };
  else if (learned.ordered.has(id)) reason = { icon: 'restart', text: tr('You ordered this before') };
  else if (cuisineAff >= 0.45 && cuisine) reason = { icon: 'heart', kind: 'cuisine', text: tr('You often go for {cuisine}', { cuisine: tr(cuisine) }) };
  return { boost, cuisineAff, reason };
}

// For Profile → "What I've learned".
export async function learnedSummary(user) {
  const learned = await learnedFor(user);
  if (!learned) return { enabled: false, cuisines: [], signals: 0 };
  const cuisines = Object.entries(learned.cuisines)
    .filter(([, v]) => v >= 0.25)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, v]) => ({ name, strength: Math.round(v * 100) / 100 }));
  return { enabled: true, cuisines, signals: learned.signals, notForMe: learned.notForMe.size };
}
