import Conversation from '../models/Conversation.js';
import { aiEnabled, aiAllowedFor, explainMood, readScene, snapOrder } from '../services/ai.js';
import { contextFor } from '../services/context.js';
import { OUTINGS } from '../services/outing.js';
import { findOutings, findPicks, toPublic } from './chatController.js';
import { tr } from '../i18n.js';

// Snap My Mood: a photo of where the user is (plus an optional line) becomes
// 4–5 ideas — dishes to order and places nearby — and a chat they can carry on.
// The photo is read once by Claude and never stored.

const DAILY_LIMIT = 20;
const snaps = new Map(); // user id → times in the last day

function tooMany(userId) {
  const now = Date.now();
  const times = (snaps.get(userId) ?? []).filter((t) => now - t < 24 * 60 * 60 * 1000);
  if (times.length >= DAILY_LIMIT) return true;
  snaps.set(userId, [...times, now]);
  if (snaps.size > 5000) snaps.delete(snaps.keys().next().value);
  return false;
}

// The setting → soft wishes for the ranking. Nothing here is a hard filter.
const VIBE_MOODS = { cozy: 'comfort', relaxed: 'comfort', quiet: 'light', work: 'light', lively: 'street', festive: 'sweet', romantic: 'sweet' };
const COMPANY = { two: 2, group: 4 };

export function slotsFromScene(scene) {
  const moods = [...new Set(scene.vibe.map((v) => VIBE_MOODS[v]).filter(Boolean))];
  if (scene.rain && !moods.includes('comfort')) moods.push('comfort');
  return {
    craving: scene.craving,
    moods: moods.slice(0, 2),
    drink: scene.drink,
    people: COMPANY[scene.company] ?? null,
  };
}

// Where to suggest going, from the setting.
export function outingFor(scene) {
  if (scene.vibe.includes('romantic')) return 'date';
  if (scene.vibe.includes('scenic') || scene.setting === 'car' || scene.setting === 'travel') return 'outdoors';
  if (scene.vibe.includes('lively') || scene.vibe.includes('festive') || scene.timeOfDay === 'night') return 'dinner';
  if (scene.vibe.some((v) => v === 'quiet' || v === 'cozy' || v === 'relaxed')) return 'chill';
  return 'cafe';
}

const idea = (p, kind) =>
  kind === 'place'
    ? { id: p.id, type: 'place to go', name: p.name, kind: p.restaurant, area: p.area, googleRating: p.rating, driveMinutesNow: p.travelMin, distanceKm: p.distanceKm, openNow: p.openNow }
    : p.source === 'places'
      ? { id: p.id, type: 'restaurant to order from', name: p.name, kind: p.restaurant, area: p.area, googleRating: p.rating, distanceKm: p.distanceKm, typicalDishes: p.ideas }
      : { id: p.id, type: 'dish to order', name: p.name, restaurant: p.restaurant, price: p.price, deliveryMinutes: p.eta, cuisine: p.cuisine };

export async function snap(req, res) {
  if (aiEnabled && !aiAllowedFor(req.user)) {
    return res.status(403).json({ success: false, code: 'AI_CONSENT', error: 'Snap My Mood uses AI. Turn on "Use AI" in Profile to use it.' });
  }
  if (!aiEnabled) return res.status(503).json({ success: false, code: 'AI_OFF', error: "Snap My Mood isn't switched on yet." });
  if (tooMany(String(req.user._id))) return res.status(429).json({ success: false, error: "That's a lot of snaps for one day. Tell Chatora in words instead, or try again tomorrow." });

  const { image, mediaType, note, location } = req.body;
  let scene;
  try {
    scene = await readScene({ image, mediaType, note });
  } catch (err) {
    console.error('Snap My Mood could not read the photo:', err.message);
    return res.status(502).json({ success: false, error: "I couldn't read that photo. Try again, or tell me in words what you feel like." });
  }
  if (!scene.usable) {
    return res.json({ success: true, unusable: true, message: tr("I couldn't make out a place in that photo. Try a photo of where you're sitting, or tell me in words.") });
  }

  // Ideas: at home or work, 5 dishes to order. Anywhere else, 3 places to go first,
  // then 2 dishes (they may be out already, so delivery comes second).
  const slots = slotsFromScene(scene);
  const ctx = await contextFor(slots, location);
  if (scene.rain && !ctx.weather) ctx.weather = { kind: 'rain', tempC: null, text: null };
  const goingOut = !['home', 'office'].includes(scene.setting) && location;
  const [food, places] = await Promise.all([
    findPicks({ ...slots, branch: 'order' }, req.user, location, ctx),
    goingOut ? findOutings({ ...slots, branch: 'out', outing: outingFor(scene) }, req.user, location, ctx) : { picks: [] },
  ]);
  const outings = places.picks.slice(0, 3);
  const picks = food.picks.slice(0, outings.length ? 2 : 5);
  if (!picks.length && !outings.length) {
    return res.json({ success: true, unusable: true, message: tr("I couldn't find anything that fits right now. Tell me in words what you feel like.") });
  }

  let words = { message: scene.summary, reasons: {} };
  try {
    words = await explainMood({ scene, note, userName: req.user.name, ideas: [...outings.map((p) => idea(p, 'place')), ...picks.map((p) => idea(p, 'food'))] });
  } catch (err) {
    console.error('Claude could not explain the snap ideas:', err.message);
  }
  const withWhy = (p) => (words.reasons[p.id] ? { ...p, reasons: [{ icon: 'spark', text: words.reasons[p.id] }, ...p.reasons].slice(0, 4) } : p);
  const finalPicks = picks.map(withWhy);
  const finalOutings = outings.map(withWhy);

  // A chat they can carry on: "something cheaper", "order the second one"…
  const conv = new Conversation({ user: req.user._id, title: tr('From a photo'), slots });
  conv.messages.push({ role: 'user', text: note?.trim() || tr("Here's where I am. What should I have?") });
  conv.messages.push({
    role: 'ai',
    text: words.message,
    kind: 'mood',
    options: [
      { id: 'order', label: 'Order in' },
      { id: 'cook', label: 'Cook at home' },
      { id: 'out', label: 'Go out' },
    ],
    picks: finalPicks.map(({ id, source, name, restaurant, price, eta, rating, distanceKm, priceLabel, match, people, groupPrice }) => ({ id, source, name, restaurant, price, eta, rating, distanceKm, priceLabel, match, people, groupPrice })),
    outings: finalOutings.map(({ id, placeId, outing, name, restaurant, area, rating, travelMin, distanceKm }) => ({ id, placeId, outing, name, restaurant, area, rating, travelMin, distanceKm })),
  });
  await conv.save();

  res.json({
    success: true,
    scene: { summary: scene.summary, setting: scene.setting, outing: goingOut ? outingFor(scene) : null, outingLabel: goingOut ? tr(OUTINGS[outingFor(scene)].label) : null },
    conversation: toPublic(conv, req.user),
    picks: finalPicks,
    outings: finalOutings,
  });
}

// Snap Your Order: the photo → 8 dishes that suit the place (4 veg, 4 non-veg).
// The app asks "Veg or non-veg?" while this runs and shows the matching half;
// tapping a dish finds restaurants for it. The photo is read once, never stored.
export async function order(req, res) {
  if (aiEnabled && !aiAllowedFor(req.user)) {
    return res.status(403).json({ success: false, code: 'AI_CONSENT', error: 'Snap Your Order uses AI. Turn on "Use AI" in Settings to use it.' });
  }
  if (!aiEnabled) return res.status(503).json({ success: false, code: 'AI_OFF', error: "Snap Your Order isn't switched on yet." });
  if (tooMany(String(req.user._id))) return res.status(429).json({ success: false, error: "That's a lot of snaps for one day. Tell Chatora in words instead, or try again tomorrow." });

  const { image, mediaType, note } = req.body;
  let result;
  try {
    result = await snapOrder({ image, mediaType, note });
  } catch (err) {
    console.error('Snap Your Order could not read the photo:', err.message);
    return res.status(502).json({ success: false, error: "I couldn't read that photo. Try again, or tell me in words what you feel like." });
  }
  if (!result.usable || !result.dishes.length) {
    return res.json({ success: true, unusable: true, message: tr("I couldn't make out a place in that photo. Try a photo of where you're sitting, or tell me in words.") });
  }
  res.json({ success: true, summary: result.summary, dishes: result.dishes });
}
