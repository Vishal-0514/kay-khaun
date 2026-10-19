import { aiEnabled, aiAllowedFor, scanKitchen, suggestSwap } from '../services/ai.js';
import { suggestRecipes, recipeDetail } from '../services/cooking.js';
import { catalogue, labelOf, normalizeAll } from '../data/pantry.js';
import { findRecipe } from '../data/recipes.js';
import { tr } from '../i18n.js';

import { tasteOf } from '../services/taste.js';

// Names for the kitchen screen's quick-add chips and type-ahead.
export function listIngredients(req, res) {
  res.json({ success: true, ingredients: catalogue, scanAvailable: aiAllowedFor(req.user) });
}

// "Here's what I have" -> recipes, straight from the kitchen screen.
export async function findRecipes(req, res) {
  const { ingredients, mood, timeMax } = req.body;
  const kitchen = normalizeAll(ingredients);
  const recipes = suggestRecipes({ ingredients: kitchen.map((i) => i.id), moods: mood ? [mood] : [], timeMax }, await tasteOf(req.user));
  res.json({ success: true, kitchen, recipes });
}

// Full recipe, marked against what they have (?have=paneer,onion).
export function getRecipe(req, res) {
  const have = String(req.query.have ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 60);
  const recipe = recipeDetail(req.params.id, have);
  if (!recipe) return res.status(404).json({ success: false, error: 'Recipe not found' });
  res.json({ success: true, recipe });
}

// Photo of a fridge or kitchen -> ingredients. Needs Claude.
export async function scan(req, res) {
  if (aiEnabled && !aiAllowedFor(req.user)) {
    return res.status(403).json({ success: false, code: 'AI_CONSENT', error: 'Photo scan uses AI. Turn on "Use AI" in Profile to scan, or type what you have.' });
  }
  if (!aiEnabled) {
    return res.status(503).json({ success: false, code: 'AI_OFF', error: "Photo scan isn't switched on yet. Type what you have instead." });
  }
  let result;
  try {
    result = await scanKitchen(req.body);
  } catch (err) {
    console.error('Fridge scan failed:', err.message);
    return res.status(502).json({ success: false, error: "I couldn't read that photo. Try again in better light, or type what you have." });
  }
  if (!result.isKitchen || !result.items.length) {
    return res.json({ success: true, items: [], message: "I couldn't spot any ingredients there. Try a clearer photo of your fridge or shelf." });
  }
  // Map every name to the pantry; keep whether Claude was sure.
  const sureByName = new Map(result.items.map((i) => [i.name.toLowerCase(), i.sure]));
  const items = [];
  for (const { name } of result.items) {
    for (const item of normalizeAll([name])) {
      if (!items.some((i) => i.id === item.id)) items.push({ ...item, sure: sureByName.get(name.toLowerCase()) ?? true });
    }
  }
  res.json({ success: true, items });
}

// A swap for a missing ingredient: the recipe's own tip if it has one,
// otherwise Chatora (Claude) suggests one that fits their diet and avoid list.
const swaps = new Map(); // cache: same recipe + ingredient + kitchen + language → same answer
const SWAP_LIMIT = 30; // per person per hour
const swapTimes = new Map();

export async function swap(req, res) {
  const { recipeId, ingredientId, have } = req.body;
  const recipe = findRecipe(recipeId);
  const line = recipe?.ingredients.find(([id]) => id === ingredientId);
  if (!line) return res.status(404).json({ success: false, error: 'Ingredient not found in this recipe' });
  if (recipe.subs[ingredientId]) return res.json({ success: true, canSwap: true, swap: tr(recipe.subs[ingredientId]), source: 'recipe' });

  if (aiEnabled && !aiAllowedFor(req.user)) {
    return res.status(403).json({ success: false, code: 'AI_CONSENT', error: 'Swaps use AI. Turn on "Use AI" in Profile to ask Chatora.' });
  }
  if (!aiEnabled) return res.status(503).json({ success: false, code: 'AI_OFF', error: "Chatora can't suggest swaps right now." });

  // Diet and avoid always count here, even with taste memory off: a swap must be safe to eat.
  const prefs = req.user.preferences?.toObject?.() ?? req.user.preferences ?? {};
  const language = req.lang === 'hi' ? 'hindi' : 'english';
  const theyHave = [...new Set(have)].filter((id) => id !== ingredientId).map(labelOf).sort();
  const key = [recipeId, ingredientId, language, prefs.diet ?? '', (prefs.avoid ?? []).join('|'), theyHave.join('|')].join('#');
  const cached = swaps.get(key);
  if (cached) return res.json({ success: true, ...cached, source: 'ai' });

  const now = Date.now();
  const mine = (swapTimes.get(String(req.user._id)) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (mine.length >= SWAP_LIMIT) return res.status(429).json({ success: false, error: 'That’s a lot of swaps for one hour. Try again a little later.' });
  swapTimes.set(String(req.user._id), [...mine, now]);

  try {
    const out = await suggestSwap({
      recipe: recipe.name,
      ingredient: labelOf(ingredientId),
      quantity: line[1],
      theyHave,
      diet: prefs.diet ?? recipe.diet,
      avoid: prefs.avoid ?? [],
      language,
    });
    swaps.set(key, out);
    if (swaps.size > 3000) swaps.delete(swaps.keys().next().value);
    res.json({ success: true, ...out, source: 'ai' });
  } catch (err) {
    console.error('Swap failed:', err.message);
    res.status(502).json({ success: false, error: "Chatora couldn't think of a swap just now. Try again." });
  }
}
