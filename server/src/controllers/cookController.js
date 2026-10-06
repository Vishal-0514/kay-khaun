import { aiEnabled, scanKitchen } from '../services/ai.js';
import { suggestRecipes, recipeDetail } from '../services/cooking.js';
import { catalogue, normalizeAll } from '../data/pantry.js';

const prefsOf = (user) => (user.memoryEnabled ? user.preferences?.toObject?.() ?? user.preferences ?? {} : {});

// Names for the kitchen screen's quick-add chips and type-ahead.
export function listIngredients(req, res) {
  res.json({ success: true, ingredients: catalogue, scanAvailable: aiEnabled });
}

// "Here's what I have" -> recipes, straight from the kitchen screen.
export function findRecipes(req, res) {
  const { ingredients, mood, timeMax } = req.body;
  const kitchen = normalizeAll(ingredients);
  const recipes = suggestRecipes({ ingredients: kitchen.map((i) => i.id), moods: mood ? [mood] : [], timeMax }, prefsOf(req.user));
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
