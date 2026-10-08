import { recipes, findRecipe } from '../data/recipes.js';
import { BASICS, labelOf } from '../data/pantry.js';
import { normalizeAvoid } from './ranking.js';
import { learnedNudge } from './taste.js';

// Picks recipes from what the user has at home. Like ranking.js it is
// deterministic: names, times, ingredients and steps all come from the data.

function dietAllows(want, recipeDiet) {
  if (!want || want === 'nonveg') return true;
  if (want === 'egg') return recipeDiet !== 'nonveg';
  return recipeDiet === 'veg';
}

// Which of this recipe's ingredients the user has, is missing, or is a pantry basic.
function stock(recipe, have) {
  const owned = recipe.core.filter((id) => have.has(id));
  const missing = recipe.core.filter((id) => !have.has(id));
  const extras = recipe.ingredients.filter(([id, , optional]) => optional && have.has(id)).map(([id]) => id);
  return { owned, missing, extras };
}

function reasonFor({ owned, missing, extras }, recipe, c) {
  const used = [...owned, ...extras].slice(0, 3).map((id) => labelOf(id).toLowerCase());
  if (!missing.length) return used.length ? `You have everything — uses your ${listWords(used)}` : 'You have everything for this';
  if (c.moods.some((m) => recipe.moods.includes(m))) return `Uses your ${listWords(used)}, and fits your mood`;
  return `Uses your ${listWords(used)}`;
}

const listWords = (words) => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`);

// slots: { ingredients, moods, dishWords, diet, timeMax, avoid } from the chat (or the kitchen screen).
// prefs: the saved taste profile (or {}).
export function suggestRecipes(slots, prefs = {}, { limit = 6 } = {}) {
  const have = new Set(slots.ingredients ?? []);
  const c = {
    diet: slots.diet ?? prefs.diet ?? null,
    avoid: [...new Set([...(slots.avoid ?? []), ...normalizeAvoid(prefs.avoid)])],
    moods: slots.moods ?? [],
    dishWords: (slots.dishWords ?? []).map((w) => w.toLowerCase()),
    timeMax: slots.timeMax ?? null,
    spice: prefs.spice ?? 3,
    favCuisines: prefs.cuisines ?? [],
    learned: prefs.learned ?? null,
  };

  const scored = [];
  for (const r of recipes) {
    if (!dietAllows(c.diet, r.diet) || r.contains.some((x) => c.avoid.includes(x))) continue;
    const s = stock(r, have);
    // Must use something they have, and need at most two extra things.
    if (!s.owned.length || s.missing.length > 2 || s.owned.length < Math.ceil(r.core.length / 2)) continue;

    const coverage = s.owned.length / r.core.length;
    const uses = Math.min(1, (s.owned.length + s.extras.length * 0.5) / 4);
    let taste = 0.5;
    if (c.moods.length) taste = c.moods.some((m) => r.moods.includes(m)) ? 1 : 0.25;
    taste = taste * 0.75 + 0.25 * (1 - Math.abs(r.spice - c.spice) / 4);
    const nameHit = c.dishWords.some((w) => r.name.toLowerCase().includes(w));
    if (nameHit) taste = Math.min(1, taste + 0.4);
    const time = c.timeMax ? (r.time <= c.timeMax ? 1 : 0.2) : 1 - Math.min(1, r.time / 90);
    // Taste learning: cuisines they go for (from orders, saves and recipes they open).
    const nudge = learnedNudge(c.learned, `recipe-${r.id}`, r.cuisine);
    const personal = Math.max(0, Math.min(1, (c.favCuisines.includes(r.cuisine) ? 1 : 0.5) + 0.4 * nudge.cuisineAff));

    // A mood they asked for counts for more; missing the star of the dish counts against.
    const wT = c.moods.length || nameHit ? 0.3 : 0.2;
    let total = (0.55 - wT) * coverage + 0.15 * uses + wT * taste + 0.12 * time + 0.08 * personal + 0.1 * coverage;
    if (c.moods.some((m) => r.moods.includes(m))) total += 0.15;
    total += nudge.boost;
    if (!have.has(r.core[0])) total *= 0.7;
    scored.push({ r, s, total });
  }

  // Recipes missing their star ingredient (egg bhurji with no eggs) only fill in
  // when there aren't enough proper matches.
  scored.sort((a, b) => b.total - a.total);
  const hasStar = scored.filter((x) => have.has(x.r.core[0]));
  const list = hasStar.length >= 3 ? hasStar : [...hasStar, ...scored.filter((x) => !have.has(x.r.core[0]))];
  return list.slice(0, limit).map(({ r, s }) => toCard(r, s, reasonFor(s, r, c)));
}

// The list shape: everything the Recipes screen and chat card show.
function toCard(r, s, reason) {
  return {
    id: r.id,
    name: r.name,
    time: r.time,
    level: r.level,
    serves: r.serves,
    diet: r.diet,
    cuisine: r.cuisine,
    have: s.owned.length,
    total: r.core.length,
    missing: s.missing.map((id) => ({ id, label: labelOf(id) })),
    reason,
  };
}

// Full recipe for the recipe and cook screens, marked against what they have.
export function recipeDetail(id, haveIds = []) {
  const r = findRecipe(id);
  if (!r) return null;
  const have = new Set(haveIds);
  const s = stock(r, have);
  const status = (ingId, optional) => (BASICS.has(ingId) ? 'basic' : have.has(ingId) ? 'have' : optional ? 'optional' : 'missing');
  const qtyOf = Object.fromEntries(r.ingredients.map(([ingId, qty]) => [ingId, qty]));
  const skipped = new Set(r.ingredients.filter(([ingId, , optional]) => optional && !have.has(ingId)).map(([ingId]) => ingId));

  return {
    ...toCard(r, s, reasonFor(s, r, { moods: [] })),
    spice: r.spice,
    moods: r.moods,
    ingredients: r.ingredients.map(([ingId, qty, optional]) => ({
      id: ingId,
      label: labelOf(ingId),
      qty,
      optional: Boolean(optional),
      status: status(ingId, optional),
      sub: !have.has(ingId) ? r.subs[ingId] ?? null : null,
    })),
    steps: r.steps.map(([text, extra = {}], i) => {
      // A tip about something they're missing beats a general tip.
      const subTip = (extra.uses ?? []).map((u) => !have.has(u) && !BASICS.has(u) && r.subs[u]).find(Boolean);
      return {
        n: i + 1,
        text,
        timer: extra.timer ?? null,
        uses: (extra.uses ?? []).filter((u) => qtyOf[u] && !skipped.has(u)).map((u) => `${labelOf(u)} · ${qtyOf[u]}`),
        tip: subTip || extra.tip || null,
      };
    }),
  };
}
