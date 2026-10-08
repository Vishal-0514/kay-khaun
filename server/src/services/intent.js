import { findIngredientsInText } from '../data/pantry.js';

// Backup reader for chat messages (English + Hinglish keywords). Claude (ai.js)
// is the main reader; this keeps the app answering if Claude is unreachable.

// ---------- keyword parser (no API key needed) ----------

const has = (text, words) => words.some((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, 'i').test(text));

const MOOD_WORDS = {
  spicy: ['spicy', 'spice', 'teekha', 'tikha', 'tikka', 'chatpata', 'masaledar', 'hot', 'mirchi', 'fiery'],
  comfort: ['comfort', 'comforting', 'homely', 'ghar jaisa', 'cozy', 'warm', 'dal', 'khichdi', 'rajma'],
  light: ['light', 'healthy', 'halka', 'diet', 'salad', 'low cal', 'not heavy'],
  street: ['street', 'chaat', 'tapri', 'vada pav', 'pav bhaji', 'frankie', 'roll', 'snack'],
  sweet: ['sweet', 'dessert', 'meetha', 'mithai', 'mitha', 'ice cream', 'sugar'],
};
const CUISINE_WORDS = {
  'North Indian': ['north indian', 'punjabi', 'paneer', 'naan', 'butter chicken', 'tandoori'],
  'South Indian': ['south indian', 'dosa', 'idli', 'uttapam', 'sambar', 'andhra'],
  Chinese: ['chinese', 'noodles', 'hakka', 'manchurian', 'schezwan', 'momos', 'momo', 'fried rice'],
  Biryani: ['biryani', 'biriyani', 'pulao'],
  'Street food': ['street food', 'chaat', 'vada pav', 'pav bhaji', 'misal', 'bhel'],
  Mughlai: ['mughlai', 'kebab', 'kabab', 'keema', 'nihari', 'seekh'],
  Coastal: ['coastal', 'malvani', 'konkani', 'koliwada', 'fish', 'prawn', 'prawns', 'seafood'],
  Healthy: ['healthy', 'salad', 'quinoa', 'protein', 'bowl'],
  Desserts: ['dessert', 'desserts', 'sweet', 'mithai', 'jamun', 'rasmalai', 'kulfi', 'jalebi'],
};
const DISH_WORDS = ['biryani', 'roll', 'frankie', 'noodles', 'dosa', 'idli', 'pav bhaji', 'vada pav', 'momos', 'paneer', 'chicken', 'mutton', 'fish', 'prawn', 'dal', 'rajma', 'khichdi', 'misal', 'thali', 'keema', 'pulao', 'kebab'];

const HAVE = /(^|[^a-z])(i have|i've got|we have|have got|got some|hai|hain|he|paas|pass|fridge|kitchen|left|bacha|bache|available)([^a-z]|$)/;

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, che: 6, saat: 7, aath: 8 };
const PEOPLE_WORDS = 'people|persons|person|log|logon|jan|members|friends|of us|guests';

function peopleIn(text) {
  const n = (w) => (/^\d+$/.test(w) ? Number(w) : NUMBER_WORDS[w] ?? null);
  // "4 people", "teen log", "5 friends"
  const counted = text.match(new RegExp(`(?<![a-z0-9])(\\d{1,2}|${Object.keys(NUMBER_WORDS).join('|')})\\s+(?:${PEOPLE_WORDS})(?![a-z])`));
  // "for two", "hum 3" — but not "for 30 min" or "for 400 rs"
  const forN = text.match(/(?:for|hum|we are|we're)\s+(\d{1,2}|two|three|four|five|six|seven|eight|do|teen|chaar|char|paanch|chhe)(?![a-z0-9])(?!\s*(?:min|rs|rupees|bucks|ke|se|tak))/);
  const value = counted ? n(counted[1]) : forN ? n(forN[1]) : has(text, ['couple', 'date night', 'for both of us', 'hum dono', 'dono ke liye']) ? 2 : null;
  return value && value >= 1 && value <= 12 ? value : null;
}

export function parseWithKeywords(raw) {
  const text = ` ${raw.toLowerCase().replace(/₹/g, ' rs ')} `;
  const out = { craving: null, moods: [], cuisines: [], dishWords: [], diet: null, budgetMax: null, budgetStrict: null, budgetPerPerson: null, people: null, timeMax: null, branch: null, avoid: [], ingredients: [] };

  for (const [mood, words] of Object.entries(MOOD_WORDS)) if (has(text, words)) out.moods.push(mood);
  for (const [cuisine, words] of Object.entries(CUISINE_WORDS)) if (has(text, words)) out.cuisines.push(cuisine);
  out.dishWords = DISH_WORDS.filter((w) => has(text, [w])).slice(0, 6);

  if (has(text, ['non veg', 'non-veg', 'nonveg', 'chicken', 'mutton', 'fish', 'prawn', 'prawns', 'meat', 'keema'])) out.diet = 'nonveg';
  else if (has(text, ['egg', 'anda', 'eggetarian'])) out.diet = 'egg';
  else if (has(text, ['veg', 'vegetarian', 'shakahari', 'jain'])) out.diet = 'veg';
  if (has(text, ['jain', 'no onion', 'without onion'])) out.avoid.push('onion-garlic');
  for (const item of ['mushroom', 'karela', 'baingan']) if (has(text, [`no ${item}`, `without ${item}`, `${item} nahi`])) out.avoid.push(item);

  // Budget: "under 400", "400 ke andar", "rs 400", "budget 400", "400 rupees"
  const money =
    text.match(/(?:under|below|less than|upto|up to|within|max|budget|around|about|approx|rs\.?|inr)\s*(?:rs\.?\s*)?(\d{2,5})/) ||
    text.match(/(\d{2,5})\s*(?:rs|rupees|bucks|ke andar|tak|se kam|ka budget)/);
  if (money) {
    out.budgetMax = Number(money[1]);
    out.budgetStrict = !/around|about|approx|tak/.test(money[0]);
  }

  // Group: "for 4 people", "hum 3 log", "for two", "teen log". A budget said
  // for a group is for everyone together unless they say "per person".
  out.people = peopleIn(text);
  if (out.budgetMax && has(text, ['per person', 'per head', 'each', 'har ek', 'ek ka', 'per plate', 'har kisi'])) out.budgetPerPerson = true;
  else if (out.budgetMax && out.people > 1) out.budgetPerPerson = false;

  // Time: "30 min", "half an hour", "jaldi", "quick"
  const mins = text.match(/(\d{1,3})\s*(?:min|mins|minute|minutes|minat)/);
  if (mins) out.timeMax = Number(mins[1]);
  else if (has(text, ['half an hour', 'aadha ghanta'])) out.timeMax = 30;
  else if (has(text, ['jaldi', 'quick', 'quickly', 'fast', 'asap', 'hungry now', 'right now', 'bhook lagi'])) out.timeMax = 30;

  if (has(text, ['order', 'order in', 'deliver', 'delivery', 'mangwa', 'mangao', 'bahar se', 'outside', 'swiggy', 'zomato'])) out.branch = 'order';
  if (has(text, ['cook', 'cook at home', 'make at home', 'ghar pe', 'banao', 'banana', 'recipe', 'fridge'])) out.branch = 'cook';

  // "I have eggs and bread", "mere paas aloo hai": things in their kitchen.
  if (HAVE.test(text)) out.ingredients = findIngredientsInText(text);

  const found = [...out.moods, ...out.dishWords];
  out.craving = found.length ? found.slice(0, 3).join(', ') : null;
  return out;
}
