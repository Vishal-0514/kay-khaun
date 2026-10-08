import { dishes } from '../data/mumbaiMenu.js';
import { learnedNudge } from './taste.js';

// Deterministic picker (PRD §8): hard filters first, then a weighted score.
// Everything shown to the user — dish, price, time — comes from the data,
// so nothing can be invented.

const BUDGET_FROM_PREF = { low: 300, mid: 500, high: 900 };
export const SPICE_WORD = ['mild', 'mild', 'medium', 'spicy', 'very spicy'];

export function dietAllows(want, dishDiet) {
  if (!want || want === 'nonveg') return true; // non-veg eaters can have anything
  if (want === 'egg') return dishDiet !== 'nonveg';
  return dishDiet === 'veg';
}

// slots: what this conversation asked for. prefs: the saved taste profile (or {}).
export function effectiveCriteria(slots, prefs = {}) {
  return {
    diet: slots.diet ?? prefs.diet ?? null,
    budgetMax: slots.budgetMax ?? BUDGET_FROM_PREF[prefs.budget] ?? null,
    budgetStrict: slots.budgetMax ? slots.budgetStrict !== false : false,
    timeMax: slots.timeMax ?? null,
    moods: slots.moods ?? [],
    cuisines: slots.cuisines ?? [],
    dishWords: slots.dishWords ?? [],
    avoid: [...new Set([...(slots.avoid ?? []), ...normalizeAvoid(prefs.avoid)])],
    spice: prefs.spice ?? 3,
    favCuisines: prefs.cuisines ?? [],
    // Said "non-veg" in this chat: they want meat, not just permission for it.
    wantsMeat: slots.diet === 'nonveg',
    // What taste learning picked up (services/taste.js), or null.
    learned: prefs.learned ?? null,
  };
}

export function normalizeAvoid(list = []) {
  const map = { mushroom: 'mushroom', karela: 'karela', baingan: 'baingan', seafood: 'seafood', 'onion & garlic': 'onion-garlic' };
  return list.map((x) => map[x.toLowerCase()]).filter(Boolean);
}

export function score(d, c) {
  const wantsSpicy = c.moods.includes('spicy');
  const otherMoods = c.moods.filter((m) => m !== 'spicy');
  const nameHit = c.dishWords.some((w) => d.name.toLowerCase().includes(w));

  let taste = 0.5;
  if (otherMoods.length) taste = otherMoods.some((m) => d.moods.includes(m)) ? 1 : 0.2;
  if (wantsSpicy) taste = taste * 0.5 + (d.spice >= 4 ? 0.5 : d.spice === 3 ? 0.3 : 0);
  else taste = taste * 0.7 + 0.3 * (1 - Math.abs(d.spice - c.spice) / 4);
  if (c.cuisines.length) taste = taste * 0.6 + (c.cuisines.includes(d.cuisine) ? 0.4 : 0);
  if (nameHit) taste = Math.min(1, taste + 0.35);
  if (c.wantsMeat) taste = d.diet === 'nonveg' ? Math.min(1, taste + 0.15) : taste * 0.7;

  const price = c.budgetMax ? (d.price <= c.budgetMax ? 0.75 + 0.25 * (d.price / c.budgetMax) : 0.35) : 0.8;
  const time = c.timeMax ? (d.eta <= c.timeMax ? 1 - 0.25 * (d.eta / c.timeMax) : 0.3) : 0.8;
  const nudge = learnedNudge(c.learned, d.id, d.cuisine);
  const personal = Math.max(0, Math.min(1, (c.favCuisines.includes(d.cuisine) ? 1 : 0.5) + 0.4 * nudge.cuisineAff));
  const rating = Math.max(0, Math.min(1, (d.rating - 3.8) / 0.9));

  // A dish they named still wins when the mood alone already maxes out taste.
  const total = 0.42 * taste + 0.18 * price + 0.14 * time + 0.14 * personal + 0.12 * rating + nudge.boost + (nameHit ? 0.06 : 0);
  return { total, nameHit };
}

export function reasonsFor(d, c, nameHit) {
  const r = [];
  if (nameHit) r.push({ icon: 'spark', text: 'Exactly what you asked for' });
  const learnedReason = learnedNudge(c.learned, d.id, d.cuisine).reason;
  if (learnedReason) r.push(learnedReason);
  if (c.moods.includes('spicy') && d.spice >= 4) r.push({ icon: 'flame', text: `${d.spice === 5 ? 'Fiery' : 'Properly spicy'}, just like you asked` });
  else {
    const mood = c.moods.find((m) => d.moods.includes(m));
    if (mood) r.push({ icon: 'bowl', text: { comfort: 'Warm, filling comfort food', light: 'Light and easy on the stomach', street: 'Proper Mumbai street style', sweet: 'Something sweet, as you wanted' }[mood] });
  }
  if (c.budgetMax && d.price <= c.budgetMax) {
    const left = c.budgetMax - d.price;
    r.push({ icon: 'rupee', text: left >= 20 ? `₹${left} under your budget` : 'Right on your budget' });
  } else if (c.budgetMax) r.push({ icon: 'rupee', text: `₹${d.price - c.budgetMax} over budget — worth a look` });
  if (c.timeMax && d.eta <= c.timeMax) r.push({ icon: 'clock', text: c.timeMax - d.eta >= 5 ? `Arrives ${c.timeMax - d.eta} min before your limit` : `Arrives in about ${d.eta} min` });
  if (c.favCuisines.includes(d.cuisine) && !learnedReason?.text.includes(d.cuisine)) r.push({ icon: 'heart', text: `You love ${d.cuisine}` });
  if (d.rating >= 4.5) r.push({ icon: 'star', text: `Rated ${d.rating} by diners` });
  return r.slice(0, 4);
}

// Returns up to `limit` picks. If strict filters leave nothing, relaxes time,
// then budget, and says so (PRD: never violate silently).
export function recommend(slots, prefs, { limit = 5 } = {}) {
  const c = effectiveCriteria(slots, prefs);
  const steps = [
    { time: true, budget: true },
    { time: false, budget: true },
    { time: false, budget: false },
  ];
  for (const [i, step] of steps.entries()) {
    const pool = dishes.filter(
      (d) =>
        dietAllows(c.diet, d.diet) &&
        !d.contains.some((x) => c.avoid.includes(x)) &&
        (!step.time || !c.timeMax || d.eta <= c.timeMax + 5) &&
        (!step.budget || !c.budgetMax || d.price <= (c.budgetStrict ? c.budgetMax : c.budgetMax * 1.1))
    );
    if (pool.length) {
      const ranked = pool
        .map((d) => ({ d, ...score(d, c) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit)
        .map(({ d, total, nameHit }) => ({
          ...d,
          source: 'sample',
          match: Math.min(99, Math.round(52 + 47 * total)),
          spiceLabel: SPICE_WORD[d.spice - 1],
          reasons: reasonsFor(d, c, nameHit),
        }));
      const relaxed = i === 0 ? null : i === 1 ? 'time' : 'budget';
      return { picks: ranked, relaxed, criteria: c };
    }
  }
  return { picks: [], relaxed: 'all', criteria: c };
}

export function findDish(id) {
  return dishes.find((d) => d.id === id) ?? null;
}
