// Ingredient dictionary for "Cook at home". Every recipe ingredient points at
// one of these ids, and anything the user types or a photo scan finds is
// mapped back to an id through the aliases (English, Hindi, Marathi, Hinglish).

// [id, label, aliases, avoid-tag]
const rows = [
  ['onion', 'Onion', ['onions', 'pyaz', 'pyaaz', 'kanda', 'kaanda', 'red onion'], 'onion-garlic'],
  ['tomato', 'Tomato', ['tomatoes', 'tamatar', 'tamater'], null],
  ['potato', 'Potato', ['potatoes', 'aloo', 'alu', 'batata'], null],
  ['egg', 'Eggs', ['eggs', 'anda', 'ande', 'anday'], 'egg'],
  ['paneer', 'Paneer', ['cottage cheese'], null],
  ['capsicum', 'Capsicum', ['shimla mirch', 'bell pepper', 'bell peppers', 'green pepper', 'peppers'], null],
  ['green-chilli', 'Green chilli', ['green chilli', 'green chillies', 'green chili', 'green chilies', 'hari mirch', 'chilli', 'chillies', 'chili', 'mirchi'], null],
  ['coriander', 'Coriander leaves', ['coriander', 'dhania', 'dhaniya', 'cilantro', 'kothimbir', 'hara dhania'], null],
  ['ginger', 'Ginger', ['adrak', 'aadu'], null],
  ['garlic', 'Garlic', ['lehsun', 'lahsun', 'lasun'], 'onion-garlic'],
  ['peas', 'Green peas', ['pea', 'matar', 'mutter', 'green peas', 'frozen peas'], null],
  ['cauliflower', 'Cauliflower', ['gobi', 'gobhi', 'phool gobi', 'phoolgobi'], null],
  ['spinach', 'Spinach', ['palak'], null],
  ['okra', 'Bhindi', ['bhindi', 'lady finger', 'ladyfinger', 'ladies finger', 'bhendi'], null],
  ['carrot', 'Carrot', ['carrots', 'gajar'], null],
  ['beans', 'French beans', ['french beans', 'green beans', 'farasbi'], null],
  ['cabbage', 'Cabbage', ['patta gobi', 'band gobi', 'kobi'], null],
  ['cucumber', 'Cucumber', ['kheera', 'khira', 'kakdi', 'kakadi'], null],
  ['mushroom', 'Mushroom', ['mushrooms', 'khumb'], 'mushroom'],
  ['lemon', 'Lemon', ['lemons', 'lime', 'limes', 'nimbu', 'limbu'], null],
  ['curry-leaves', 'Curry leaves', ['curry leaf', 'kadi patta', 'kadhi patta', 'kadipatta'], null],
  ['curd', 'Curd', ['dahi', 'yogurt', 'yoghurt', 'dahee'], null],
  ['milk', 'Milk', ['doodh', 'dudh'], null],
  ['cream', 'Fresh cream', ['fresh cream', 'malai', 'amul cream'], null],
  ['butter', 'Butter', ['makhan', 'makkhan', 'amul butter'], null],
  ['ghee', 'Ghee', ['desi ghee', 'tup'], null],
  ['cheese', 'Cheese', ['cheese slice', 'cheese slices', 'processed cheese', 'mozzarella'], null],
  ['cashew', 'Cashews', ['cashew', 'cashews', 'kaju'], null],
  ['peanuts', 'Peanuts', ['peanut', 'moongphali', 'mungfali', 'shengdana', 'groundnuts'], null],
  ['rice', 'Rice', ['chawal', 'basmati', 'basmati rice', 'leftover rice', 'cooked rice'], null],
  ['toor-dal', 'Toor dal', ['toor dal', 'tuvar dal', 'arhar dal', 'arhar', 'dal', 'daal', 'lentils'], null],
  ['moong-dal', 'Moong dal', ['moong dal', 'mung dal', 'yellow moong', 'moong'], null],
  ['besan', 'Besan', ['gram flour', 'chickpea flour', 'chana flour'], null],
  ['atta', 'Wheat flour (atta)', ['atta', 'aata', 'wheat flour', 'chapati flour', 'gehu ka atta'], null],
  ['sooji', 'Sooji (rava)', ['sooji', 'suji', 'rava', 'rawa', 'semolina'], null],
  ['poha', 'Poha', ['pohe', 'flattened rice', 'beaten rice', 'chivda'], null],
  ['bread', 'Bread', ['bread slices', 'white bread', 'brown bread', 'double roti'], null],
  ['pav', 'Pav', ['pav buns', 'ladi pav', 'buns', 'bun', 'pao'], null],
  ['noodles', 'Noodles', ['hakka noodles', 'chow mein', 'chowmein'], null],
  ['instant-noodles', 'Instant noodles', ['maggi', 'maggie', 'instant noodles', 'yippee', 'top ramen'], null],
  ['soy-sauce', 'Soy sauce', ['soya sauce', 'soy sauce'], null],
  ['cornflour', 'Cornflour', ['corn flour', 'cornstarch', 'corn starch'], null],
  ['chicken', 'Chicken', ['murgh', 'murg', 'chicken breast', 'boneless chicken'], null],
  ['keema', 'Keema (mince)', ['keema', 'kheema', 'mince', 'minced meat', 'mutton keema', 'chicken keema'], null],
  ['fish', 'Fish', ['surmai', 'pomfret', 'bangda', 'rawas', 'machli', 'machhli', 'fish fillet'], 'seafood'],
  ['prawns', 'Prawns', ['prawn', 'shrimp', 'shrimps', 'jhinga', 'kolambi'], 'seafood'],
  ['kasuri-methi', 'Kasuri methi', ['kasuri methi', 'dried fenugreek', 'methi leaves'], null],
  ['pav-bhaji-masala', 'Pav bhaji masala', ['pav bhaji masala'], null],
  ['cardamom', 'Cardamom', ['elaichi', 'cardamoms'], null],
  ['sugar', 'Sugar', ['cheeni', 'shakkar'], null],
  ['banana', 'Banana', ['bananas', 'kela', 'kele'], null],
  ['corn', 'Sweet corn', ['sweet corn', 'corn', 'makai', 'bhutta'], null],
  ['chutney', 'Green chutney', ['green chutney', 'hari chutney', 'pudina chutney'], null],
];

export const ingredients = Object.fromEntries(rows.map(([id, label, aliases, avoid]) => [id, { id, label, aliases, avoid }]));

// Spices and staples almost every Indian kitchen has. Recipes list them, but
// they never count as "missing".
export const BASICS = new Set(['salt', 'oil', 'water', 'turmeric', 'chilli-powder', 'cumin', 'mustard-seeds', 'garam-masala', 'coriander-powder', 'hing', 'sugar']);
export const BASIC_LABELS = {
  salt: 'Salt',
  oil: 'Oil',
  water: 'Water',
  turmeric: 'Turmeric',
  'chilli-powder': 'Red chilli powder',
  cumin: 'Cumin seeds (jeera)',
  'mustard-seeds': 'Mustard seeds (rai)',
  'garam-masala': 'Garam masala',
  'coriander-powder': 'Coriander powder',
  hing: 'Hing',
  sugar: 'Sugar',
};

// Unknown items are stored as 'x-olive-oil' -> 'Olive oil'.
export const labelOf = (id) =>
  ingredients[id]?.label ?? BASIC_LABELS[id] ?? (id.startsWith('x-') ? id.slice(2).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) : id);

// Longest names first, so "green peas" wins over "peas" and "ginger garlic paste" over "ginger".
const names = rows
  .flatMap(([id, label, aliases]) => [label, id.replace(/-/g, ' '), ...aliases].map((n) => [n.toLowerCase(), id]))
  .sort((a, b) => b[0].length - a[0].length);

const wordMatch = (text, name) => new RegExp(`(^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i').test(text);

// One typed or scanned name -> { id, label, known }. Unknown items are kept so
// the user still sees what they typed, but they don't count towards recipes.
export function normalizeIngredient(raw) {
  const text = String(raw)
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/\b(some|few|a|an|the|fresh|chopped|leftover|packet|pack|of|kg|g|gm|grams|ml|litre|liter|pieces|pcs)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  const hit = names.find(([name]) => text === name) ?? names.find(([name]) => wordMatch(text, name));
  if (hit) return { id: hit[1], label: ingredients[hit[1]].label, known: true };
  const label = text.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40);
  return { id: `x-${text.replace(/\s+/g, '-').slice(0, 40)}`, label, known: false };
}

// De-duplicated list from many names. One entry can hold several items
// ("ginger garlic paste", "paneer and tomato").
export function normalizeAll(list) {
  const out = new Map();
  for (const raw of list) {
    const ids = findIngredientsInText(raw);
    const items = ids.length ? ids.map((id) => ({ id, label: ingredients[id].label, known: true })) : [normalizeIngredient(raw)];
    for (const item of items) if (item && !out.has(item.id)) out.set(item.id, item);
  }
  return [...out.values()];
}

// Hindi words that look like ingredients: "ghar pe banana hai" means "make it at home".
const FALSE_FRIENDS = [
  /(^|[^a-z])banana\s+(hai|he|h|hain|tha|chahta|chahti|chahte|chahiye|padega|hoga|sikhao|kaise)(?=[^a-z]|$)/g,
  /(ghar pe|ghar par|ghar mein|khud|kya|kuch|khana)\s+banana(?=[^a-z]|$)/g,
];

// Every known ingredient mentioned anywhere in a sentence ("I have aloo, pyaz and eggs").
export function findIngredientsInText(raw) {
  let text = ` ${String(raw).toLowerCase()} `;
  for (const re of FALSE_FRIENDS) text = text.replace(re, " ");
  const found = [];
  for (const [name, id] of names) {
    if (wordMatch(text, name)) {
      if (!found.includes(id)) found.push(id);
      text = text.replace(new RegExp(`(^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-z]|$)`, 'gi'), '$1 ');
    }
  }
  return found;
}

// For the app's quick-add chips and type-ahead.
export const COMMON = ['onion', 'tomato', 'potato', 'egg', 'paneer', 'rice', 'bread', 'capsicum', 'green-chilli', 'coriander', 'curd', 'milk', 'chicken', 'atta', 'besan', 'poha', 'peas', 'spinach'];
export const catalogue = rows.map(([id, label, aliases]) => ({ id, label, aliases, common: COMMON.includes(id) }));
