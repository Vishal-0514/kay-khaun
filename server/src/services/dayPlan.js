import { dishes } from '../data/mumbaiMenu.js';
import { recipes } from '../data/recipes.js';
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

// "Or cook it at home": which home recipes suit which meal.
const COOK_BREAKFAST = new Set(['kanda-poha', 'upma', 'besan-chilla', 'aloo-paratha', 'masala-omelette', 'bread-omelette', 'veg-sandwich', 'egg-bhurji', 'banana-milkshake']);
const COOK_SNACK = new Set(['veg-sandwich', 'masala-maggi', 'bread-omelette', 'batata-bhaji', 'paneer-capsicum-salad', 'kanda-poha', 'masala-chaas', 'banana-milkshake', 'sooji-halwa']);
const COOK_NOT_A_MEAL = new Set([...COOK_BREAKFAST, 'onion-raita', 'masala-chaas', 'sooji-halwa', 'rice-kheer', 'masala-maggi']);
COOK_NOT_A_MEAL.delete('egg-bhurji');
COOK_NOT_A_MEAL.delete('aloo-paratha');
const PLAIN_WORDS = new Set(['masala', 'with', 'veg', 'and', 'the', 'pcs', 'half', 'dry', 'style', 'home', 'mumbai', 'bombay', '2', '3', '8']);
const words = (text) => text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !PLAIN_WORDS.has(w))
    .map((w) => (w.length > 4 ? w.replace(/s$/, '') : w)); // prawns → prawn

function cookSuits(meal, r) {
  if (meal === 'breakfast') return COOK_BREAKFAST.has(r.id);
  if (meal === 'snack') return COOK_SNACK.has(r.id);
  return !COOK_NOT_A_MEAL.has(r.id);
}

// The home recipe closest to a dish: same dish if we have it (Pav Bhaji →
// Pav Bhaji), otherwise the same cuisine and feel, within diet and avoids.
function homeRecipeFor(meal, d, c, moods) {
  const dishWords = new Set(words([d.name, ...(d.ideas ?? [])].join(' ')));
  let best = null;
  for (const r of recipes) {
    if (!cookSuits(meal, r) || !dietAllows(c.diet, r.diet) || r.contains.some((x) => c.avoid.includes(x))) continue;
    // Share of the recipe's name found in the dish: "Pav Bhaji" beats "Batata Bhaji" for "Butter Pav Bhaji".
    const recipeWords = words(r.name);
    const overlap = recipeWords.length ? recipeWords.filter((w) => dishWords.has(w)).length / recipeWords.length : 0;
    let s = 0.6 * overlap + (r.cuisine === d.cuisine ? 0.25 : 0);
    if (d.moods?.some((m) => r.moods.includes(m))) s += 0.15;
    if (moods.some((m) => r.moods.includes(m))) s += 0.15;
    if (d.diet && r.diet === d.diet) s += 0.15;
    s += 0.1 * (1 - Math.abs(r.spice - c.spice) / 4) - 0.1 * Math.min(1, r.time / 60);
    if (!best || s > best.s) best = { r, s };
  }
  return best ? { id: best.r.id, name: best.r.name, time: best.r.time, level: best.r.level, diet: best.r.diet } : null;
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

function samplePlan({ budget, meals, mood, people, veg }, prefs) {
  const shareSum = meals.reduce((s, m) => s + MEALS[m].share, 0);
  const base = effectiveCriteria({ moods: DAY_MOODS[mood].moods, people, ...(veg ? { diet: 'veg' } : null) }, prefs);

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
  const withHome = (meal, d) => ({ ...d, home: homeRecipeFor(meal, d, base, DAY_MOODS[mood].moods) });
  return {
    overBudget: !best,
    spent: result.spent,
    meals: perMeal.map(({ meal, c, ranked }, i) => {
      const pick = result.picks[i].d;
      const options = ranked
        .filter((x) => x.d.id !== pick.id && (!used.has(x.d.restaurant) || x.d.restaurant === pick.restaurant))
        .slice(0, OPTIONS)
        .map((x) => withHome(meal, decorate(x.d, c)));
      return { meal, ...mealInfo(meal), budget: c.budgetMax, pick: withHome(meal, decorate(pick, c)), options };
    }),
  };
}

// With real places there are no dish prices, only a price range, so the plan
// shows each meal's share of the budget and the range of the place.
async function placesPlan({ budget, meals, mood, people, veg }, prefs, location) {
  const shareSum = meals.reduce((s, m) => s + MEALS[m].share, 0);
  const results = await Promise.all(
    meals.map((meal) => {
      const budgetMax = Math.round((budget * MEALS[meal].share) / shareSum);
      const slots = { dishWords: [MEALS[meal].query], moods: DAY_MOODS[mood].moods, budgetMax, budgetStrict: false, people, budgetPerPerson: true, ...(veg ? { diet: 'veg' } : null) };
      return nearbyPicks(slots, prefs, location, { limit: 6 }).then(({ picks }) => ({ meal, budgetMax, picks }));
    })
  );
  const used = new Set();
  const c = effectiveCriteria(veg ? { diet: 'veg' } : {}, prefs);
  const withHome = (meal, d) => d && { ...d, home: homeRecipeFor(meal, d, c, DAY_MOODS[mood].moods) };
  return {
    overBudget: false,
    spent: null,
    meals: results.map(({ meal, budgetMax, picks }) => {
      const fresh = picks.filter((p) => !used.has(p.id));
      const pool = fresh.length ? fresh : picks;
      const [pick, ...rest] = pool;
      if (pick) used.add(pick.id);
      return { meal, ...mealInfo(meal), budget: budgetMax, pick: withHome(meal, pick) ?? null, options: rest.slice(0, OPTIONS).map((o) => withHome(meal, o)) };
    }).filter((m) => m.pick),
  };
}

function mealInfo(meal) {
  const { label, time } = MEALS[meal];
  return { label, time };
}

// budget is per person for the day; people > 1 plans for a group (every
// total is also given for the whole group); veg makes every meal vegetarian.
export async function planDay({ budget, meals, mood = 'balanced', people = 1, veg = false, location }, prefs, { usePlaces = false } = {}) {
  const chosenMeals = MEAL_ORDER.filter((m) => (meals?.length ? meals : MEAL_ORDER).includes(m));
  const dayBudget = budget ?? DAY_BUDGET_FROM_PREF[prefs.budget] ?? 1000;
  const input = { budget: dayBudget, meals: chosenMeals, mood: DAY_MOODS[mood] ? mood : 'balanced', people: Math.max(1, Math.min(12, people)), veg: Boolean(veg) };
  const plan = usePlaces && location ? await placesPlan(input, prefs, location) : samplePlan(input, prefs);
  return { ...input, moodLabel: DAY_MOODS[input.mood].label, ...plan };
}
