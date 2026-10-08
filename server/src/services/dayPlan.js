import { dishes } from '../data/mumbaiMenu.js';
import { SPICE_WORD, dietAllows, effectiveCriteria, reasonsFor, score } from './ranking.js';
import { nearbyPicks } from './nearby.js';

// "Plan my whole day": one pick per meal that together fit a day's budget,
// match the saved taste, and don't repeat a restaurant or lean on one cuisine.
// Like the chat picks, every dish, price and time comes from the data.

export const MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];

export const MEALS = {
  breakfast: { label: 'Breakfast', time: '8 – 10 am', share: 0.18, query: 'breakfast' },
  lunch: { label: 'Lunch', time: '1 – 2 pm', share: 0.32, query: 'lunch thali' },
  snack: { label: 'Evening snack', time: '5 – 6 pm', share: 0.15, query: 'chaat snacks' },
  dinner: { label: 'Dinner', time: '8 – 9 pm', share: 0.35, query: 'dinner' },
};

export const DAY_MOODS = {
  balanced: { label: 'Balanced', moods: [] },
  light: { label: 'Light day', moods: ['light'] },
  comfort: { label: 'Comfort day', moods: ['comfort'] },
  spicy: { label: 'Spicy day', moods: ['spicy'] },
  street: { label: 'Street food day', moods: ['street'] },
};

const DAY_BUDGET_FROM_PREF = { low: 600, mid: 1000, high: 1800 };

// Which sample dishes suit which meal. Lunch and dinner take any full meal.
const BREAKFAST = new Set(['bun-maska-chai', 'idli-sambar', 'rava-upma', 'masala-dosa', 'mysore-masala-dosa', 'akuri-toast', 'misal-pav', 'egg-white-wrap', 'vada-pav-2', 'puran-poli']);
const SNACK = new Set([
  'sev-puri', 'bhel-puri', 'ragda-pattice', 'vada-pav-2', 'masala-pav', 'pav-bhaji', 'veg-momos', 'chicken-momos', 'tandoori-momos',
  'paneer-tikka-roll', 'chicken-tikka-roll', 'egg-chicken-frankie', 'baida-roti', 'bun-maska-chai', 'chicken-koliwada', 'mushroom-tikka',
  'gulab-jamun', 'rasmalai', 'jalebi-rabdi', 'kulfi-falooda', 'caramel-custard',
]);
const NOT_A_MEAL = new Set(['sev-puri', 'bhel-puri', 'masala-pav', 'bun-maska-chai', 'vada-pav-2', 'idli-sambar', 'rava-upma', 'akuri-toast', 'egg-white-wrap']);

function suits(meal, d) {
  if (meal === 'breakfast') return BREAKFAST.has(d.id);
  if (meal === 'snack') return SNACK.has(d.id);
  return d.cuisine !== 'Desserts' && !NOT_A_MEAL.has(d.id);
}

const CANDIDATES = 9;
const CHEAP = 4;
const OPTIONS = 3;

function decorate(d, c) {
  return {
    ...d,
    source: 'sample',
    match: Math.min(99, Math.round(52 + 47 * score(d, c).total)),
    spiceLabel: SPICE_WORD[d.spice - 1],
    reasons: reasonsFor(d, c, false),
  };
}

// Variety: a repeated cuisine or a second fiery meal costs a little score.
function comboPenalty(chosen, moodKey) {
  let p = 0;
  const cuisines = chosen.map((x) => x.d.cuisine);
  p += 0.15 * (cuisines.length - new Set(cuisines).size);
  const fiery = chosen.filter((x) => x.d.spice >= 4).length;
  if (moodKey !== 'spicy' && fiery > 1) p += 0.1 * (fiery - 1);
  return p;
}

function samplePlan({ budget, meals, mood }, prefs) {
  const shareSum = meals.reduce((s, m) => s + MEALS[m].share, 0);
  const base = effectiveCriteria({ moods: DAY_MOODS[mood].moods }, prefs);

  const perMeal = meals.map((meal) => {
    const c = { ...base, budgetMax: Math.round((budget * MEALS[meal].share) / shareSum), budgetStrict: false };
    const all = dishes
      .filter((d) => suits(meal, d) && dietAllows(c.diet, d.diet) && !d.contains.some((x) => c.avoid.includes(x)))
      .map((d) => ({ d, s: score(d, c).total }))
      .sort((a, b) => b.s - a.s);
    // The best-tasting few, plus the cheapest few so a tight budget can still fit.
    const cheap = [...all].sort((a, b) => a.d.price - b.d.price).slice(0, CHEAP);
    const ranked = [...new Set([...all.slice(0, CANDIDATES), ...cheap])].sort((a, b) => b.s - a.s);
    return { meal, c, ranked };
  });

  // Try every combination of the candidates (at most 13^4) and keep the
  // best-scoring day that fits the budget without repeating a restaurant.
  let best = null;
  let cheapest = null;
  const chosen = [];
  const walk = (i, spent) => {
    if (i === perMeal.length) {
      const value = chosen.reduce((s, x) => s + x.s, 0) - comboPenalty(chosen, mood);
      if (spent <= budget && (!best || value > best.value)) best = { value, picks: [...chosen], spent };
      if (!cheapest || spent < cheapest.spent) cheapest = { value, picks: [...chosen], spent };
      return;
    }
    for (const x of perMeal[i].ranked) {
      if (chosen.some((y) => y.d.restaurant === x.d.restaurant)) continue;
      chosen.push(x);
      walk(i + 1, spent + x.d.price);
      chosen.pop();
    }
  };
  walk(0, 0);

  const result = best ?? cheapest;
  if (!result) return { meals: [], spent: 0, overBudget: false };
  const used = new Set(result.picks.map((x) => x.d.restaurant));
  return {
    overBudget: !best,
    spent: result.spent,
    meals: perMeal.map(({ meal, c, ranked }, i) => {
      const pick = result.picks[i].d;
      const options = ranked
        .filter((x) => x.d.id !== pick.id && (!used.has(x.d.restaurant) || x.d.restaurant === pick.restaurant))
        .slice(0, OPTIONS)
        .map((x) => decorate(x.d, c));
      return { meal, ...mealInfo(meal), budget: c.budgetMax, pick: decorate(pick, c), options };
    }),
  };
}

// With real places there are no dish prices, only a price range, so the plan
// shows each meal's share of the budget and the range of the place.
async function placesPlan({ budget, meals, mood }, prefs, location) {
  const shareSum = meals.reduce((s, m) => s + MEALS[m].share, 0);
  const results = await Promise.all(
    meals.map((meal) => {
      const budgetMax = Math.round((budget * MEALS[meal].share) / shareSum);
      const slots = { dishWords: [MEALS[meal].query], moods: DAY_MOODS[mood].moods, budgetMax, budgetStrict: false };
      return nearbyPicks(slots, prefs, location, { limit: 6 }).then((picks) => ({ meal, budgetMax, picks }));
    })
  );
  const used = new Set();
  return {
    overBudget: false,
    spent: null,
    meals: results.map(({ meal, budgetMax, picks }) => {
      const fresh = picks.filter((p) => !used.has(p.id));
      const pool = fresh.length ? fresh : picks;
      const [pick, ...rest] = pool;
      if (pick) used.add(pick.id);
      return { meal, ...mealInfo(meal), budget: budgetMax, pick: pick ?? null, options: rest.slice(0, OPTIONS) };
    }).filter((m) => m.pick),
  };
}

function mealInfo(meal) {
  const { label, time } = MEALS[meal];
  return { label, time };
}

export async function planDay({ budget, meals, mood = 'balanced', location }, prefs, { usePlaces = false } = {}) {
  const chosenMeals = MEAL_ORDER.filter((m) => (meals?.length ? meals : MEAL_ORDER).includes(m));
  const dayBudget = budget ?? DAY_BUDGET_FROM_PREF[prefs.budget] ?? 1000;
  const input = { budget: dayBudget, meals: chosenMeals, mood: DAY_MOODS[mood] ? mood : 'balanced' };
  const plan = usePlaces && location ? await placesPlan(input, prefs, location) : samplePlan(input, prefs);
  return { ...input, moodLabel: DAY_MOODS[input.mood].label, ...plan };
}
