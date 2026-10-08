import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { CUISINES, MOODS } from '../data/mumbaiMenu.js';

// Chatora's brain. Every job is grounded:
//  1. understand() reads the message (with the chat so far) into slots and writes
//     the reply when Chatora needs to ask something or the message isn't about food.
//  2. explainPicks() writes the answer and one reason per dish, using ONLY the
//     dish facts we pass in. Dishes, prices and times always come from ranking.js.
//  3. explainRecipes() does the same for home recipes (cooking.js).
//  4. scanKitchen() lists the ingredients in a fridge or kitchen photo.

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
export const aiEnabled = Boolean(client);

export const AVOIDABLE = ['mushroom', 'karela', 'baingan', 'seafood', 'onion-garlic', 'egg'];
const LANGUAGES = ['english', 'hinglish', 'hindi'];

const nullable = (type) => ({ type: [type, 'null'] });
const strictObject = (properties) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });

// ---------- shared call ----------

// Structured JSON output, with Anthropic's server-side refusal fallback. If the
// fallback beta is rejected for this model or account, retry without it.
async function callJson({ system, content, schema, maxTokens }) {
  const base = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content }],
  };
  let response;
  try {
    response = await client.beta.messages.create({ ...base, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  } catch (err) {
    if (!(err instanceof Anthropic.BadRequestError)) throw err;
    response = await client.messages.create(base);
  }
  if (response.stop_reason === 'refusal') throw new Error('Claude declined this message');
  if (response.stop_reason === 'max_tokens') throw new Error('Claude reply was cut off');
  const block = response.content.find((b) => b.type === 'text');
  if (!block) throw new Error('Claude returned no text');
  return JSON.parse(block.text);
}

// ---------- 1. understand ----------

const understandSchema = strictObject({
  craving: nullable('string'),
  moods: { type: 'array', items: { type: 'string', enum: MOODS } },
  cuisines: { type: 'array', items: { type: 'string', enum: CUISINES } },
  dishWords: { type: 'array', items: { type: 'string' } },
  diet: { anyOf: [{ type: 'string', enum: ['veg', 'nonveg', 'egg'] }, { type: 'null' }] },
  budgetMax: nullable('integer'),
  budgetStrict: nullable('boolean'),
  timeMax: nullable('integer'),
  branch: { anyOf: [{ type: 'string', enum: ['order', 'cook'] }, { type: 'null' }] },
  avoid: { type: 'array', items: { type: 'string', enum: AVOIDABLE } },
  ingredients: { type: 'array', items: { type: 'string' } },
  language: { type: 'string', enum: LANGUAGES },
  aboutFood: { type: 'boolean' },
  reply: { type: 'string' },
});

const understandCheck = z.object({
  craving: z.string().max(80).nullable(),
  moods: z.array(z.enum(MOODS)),
  cuisines: z.array(z.enum(CUISINES)),
  dishWords: z.array(z.string().max(40)).max(8),
  diet: z.enum(['veg', 'nonveg', 'egg']).nullable(),
  budgetMax: z.number().int().min(20).max(10000).nullable(),
  budgetStrict: z.boolean().nullable(),
  timeMax: z.number().int().min(5).max(240).nullable(),
  branch: z.enum(['order', 'cook']).nullable(),
  avoid: z.array(z.enum(AVOIDABLE)),
  ingredients: z.array(z.string().max(40)).max(30),
  language: z.enum(LANGUAGES),
  aboutFood: z.boolean(),
  reply: z.string().min(1).max(400),
});

const UNDERSTAND_SYSTEM = `You are Chatora, the warm, quick food guide inside the Kya Khaun? app in Mumbai.
People tell you what they feel like eating in English, Hindi or Hinglish. You turn the LATEST message into slots for the app's search.

Slots — report only what the latest message adds or changes; use null / [] for anything it doesn't mention (the app keeps earlier answers):
- craving: short English phrase for the food they want ("something spicy", "butter chicken"), or null.
- moods: any of ${MOODS.join(', ')} the message implies.
- cuisines: any of ${CUISINES.join(', ')} the message names or clearly implies.
- dishWords: specific dishes or ingredients they mention, lowercase English ("biryani", "paneer").
- diet: "veg", "nonveg" or "egg" only if stated or implied by a dish (chicken = nonveg).
- budgetMax: their limit in rupees for this meal. budgetStrict: true for "under / max / se kam / ke andar", false for "around / about / tak".
- timeMax: minutes they can wait. "quick", "jaldi", "hungry now" = 30.
- branch: "order" to get food delivered, "cook" to make it at home, else null.
- avoid: things they don't want, from: ${AVOIDABLE.join(', ')}.
- ingredients: food items they say they have at home right now, in simple lowercase English ("aloo" = "potato", "dahi" = "curd").
- language: the language they wrote in.
- aboutFood: false for greetings, thanks or unrelated chat.

reply — one or two short, friendly sentences in the SAME language and style they used (Hinglish in Latin script if they wrote Hinglish):
- If aboutFood is false: answer briefly and invite them to say what they feel like eating.
- Else if the order-or-cook choice is still unknown (not in the slip and not in this message): acknowledge what they want in a few words and ask ONLY whether they want to order in or cook at home.
- Else if they want to cook and no ingredients are known yet (none in the slip or this message): ask what they have at home, and mention they can scan their fridge.
- Else: a short acknowledgement such as "On it!" — the app will add the results.
Never name restaurants, dishes, recipes, prices or delivery times in the reply.`;

export async function understand({ text, history, slip }) {
  const content = [
    `Order slip so far: ${JSON.stringify(slip)}`,
    history.length ? `Recent chat:\n${history.map((m) => `${m.role === 'user' ? 'User' : 'Chatora'}: ${m.text}`).join('\n')}` : 'Recent chat: (none)',
    `Latest message: ${text}`,
  ].join('\n\n');
  return understandCheck.parse(await callJson({ system: UNDERSTAND_SYSTEM, content, schema: understandSchema, maxTokens: 1500 }));
}

// ---------- 2 + 3. explain picks / recipes ----------

const explainSchema = strictObject({
  message: { type: 'string' },
  reasons: { type: 'array', items: strictObject({ id: { type: 'string' }, reason: { type: 'string' } }) },
});

const explainCheck = z.object({
  message: z.string().min(1).max(500),
  reasons: z.array(z.object({ id: z.string(), reason: z.string().min(1).max(120) })),
});

async function explain(system, payload, ids) {
  const out = explainCheck.parse(await callJson({ system, content: JSON.stringify(payload), schema: explainSchema, maxTokens: 2500 }));
  const known = new Set(ids);
  return { message: out.message, reasons: Object.fromEntries(out.reasons.filter((r) => known.has(r.id)).map((r) => [r.id, r.reason])) };
}

const EXPLAIN_SYSTEM = `You are Chatora, the food guide in the Kya Khaun? app. The app has already chosen and ranked the dishes; you only explain them.
Use ONLY the facts given for each dish (name, restaurant, price, delivery minutes, rating, spice, cuisine, diet, distance). Never invent dishes, prices, times, offers or ingredients.
- message: two short sentences max, in the user's language and style. Name the #1 dish with its restaurant, price and minutes exactly as given. If "relaxed" is set, gently say which limit you stretched.
- reasons: for EVERY dish, one reason of at most 12 words, personal to what they asked for and their taste, in the same language. Use the dish id exactly as given.`;

const PLACES_SYSTEM = `You are Chatora, the food guide in the Kya Khaun? app. The app has already found and ranked real nearby restaurants from Google; the customer orders on Zomato or Swiggy. You only explain the choices.
Use ONLY the facts given (name, kind of place, area, distance, Google rating, price range, open now, typical dishes). You do NOT know their menu or exact prices: never state a dish price, never promise a dish is on the menu — say "try" or "known for" only about the typical dishes given.
- message: two short sentences max, in the user's language and style. Name the #1 place with its distance and rating, and say they can tap to order on Zomato or Swiggy.
- reasons: for EVERY place, one reason of at most 12 words, personal to what they asked for. Use the place id exactly as given.`;

export async function explainPicks({ text, language, slip, picks, relaxed, userName, taste }) {
  if (picks[0]?.source === 'places') {
    const places = picks.map((p, i) => ({
      rank: i + 1,
      id: p.id,
      name: p.name,
      kind: p.restaurant,
      area: p.area,
      distanceKm: p.distanceKm,
      googleRating: p.rating,
      ratingCount: p.ratingCount,
      priceRange: p.priceLabel,
      openNow: p.openNow,
      typicalDishes: p.ideas,
    }));
    return explain(PLACES_SYSTEM, { userMessage: text, language, userName: userName || null, orderSlip: slip, savedTaste: taste, places }, picks.map((p) => p.id));
  }
  const dishes = picks.map((p, i) => ({
    rank: i + 1,
    id: p.id,
    name: p.name,
    restaurant: p.restaurant,
    area: p.area,
    price: p.price,
    deliveryMinutes: p.eta,
    rating: p.rating,
    spice: p.spiceLabel,
    cuisine: p.cuisine,
    diet: p.diet,
    distanceKm: p.distanceKm,
  }));
  return explain(EXPLAIN_SYSTEM, { userMessage: text, language, userName: userName || null, orderSlip: slip, savedTaste: taste, relaxed, dishes }, picks.map((p) => p.id));
}

const RECIPES_SYSTEM = `You are Chatora, the food guide in the Kya Khaun? app. The user wants to cook at home. The app has already chosen and ranked recipes from what they have; you only explain them.
Use ONLY the facts given for each recipe (name, minutes, level, what they have, what is missing). Never invent recipes, ingredients, steps or times.
- message: two short sentences max, in the user's language and style. Name the #1 recipe and its minutes exactly as given. If it needs something they don't have, say so plainly.
- reasons: for EVERY recipe, one reason of at most 12 words, personal to what they asked for, in the same language. Use the recipe id exactly as given.`;

export async function explainRecipes({ text, language, haveLabels, recipes, userName, taste }) {
  const facts = recipes.map((r, i) => ({
    rank: i + 1,
    id: r.id,
    name: r.name,
    minutes: r.time,
    level: r.level,
    serves: r.serves,
    diet: r.diet,
    hasAllIngredients: r.missing.length === 0,
    missing: r.missing.map((m) => m.label),
  }));
  return explain(RECIPES_SYSTEM, { userMessage: text, language, userName: userName || null, theyHave: haveLabels, savedTaste: taste, recipes: facts }, recipes.map((r) => r.id));
}

const PLAN_SYSTEM = `You are Chatora, the food guide in the Kya Khaun? app. The app has already planned the user's meals for the day; you only introduce the plan.
Use ONLY the facts given (meal, dish or place name, restaurant, price or price range, cuisine). Never invent dishes, prices or places.
- message: at most two short, warm sentences in simple English with a light Hinglish touch. Describe the shape of the day (e.g. a light start, a filling lunch, a treat in the evening) and, if total and budget are given, say the total against the budget exactly as given.`;

export async function explainPlan({ plan, userName, taste }) {
  const meals = plan.meals.map((m) => ({
    meal: m.label,
    name: m.pick.name,
    restaurant: m.pick.restaurant,
    price: m.pick.price ?? null,
    priceRange: m.pick.priceLabel ?? null,
    cuisine: m.pick.cuisine,
  }));
  const out = await callJson({
    system: PLAN_SYSTEM,
    content: JSON.stringify({ userName: userName || null, dayMood: plan.moodLabel, budget: plan.budget, total: plan.spent, savedTaste: taste, meals }),
    schema: strictObject({ message: { type: 'string' } }),
    maxTokens: 800,
  });
  return z.object({ message: z.string().min(1).max(400) }).parse(out).message;
}

// ---------- 4. scan a fridge / kitchen photo ----------

export const SCAN_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const scanSchema = strictObject({
  isKitchen: { type: 'boolean' },
  items: { type: 'array', items: strictObject({ name: { type: 'string' }, sure: { type: 'boolean' } }) },
});

const scanCheck = z.object({
  isKitchen: z.boolean(),
  items: z.array(z.object({ name: z.string().min(1).max(40), sure: z.boolean() })).max(30),
});

const SCAN_SYSTEM = `You look at a photo from an Indian home — an open fridge, kitchen shelf, vegetable basket or groceries on a counter — and list the cooking ingredients you can see.
- name: simple lowercase English, singular, the way an Indian home cook would say it: "tomato", "onion", "green chilli", "coriander leaves", "paneer", "curd", "egg", "capsicum", "lemon", "ginger".
- sure: false when it is partly hidden, blurry, or in a closed box or container you are guessing about (a white tub might be curd).
- List each ingredient once, most visible first, at most 20. Skip drinks, packaged snacks, sauces and non-food items unless they're a cooking staple (milk, butter, cheese, bread, eggs, noodles are fine).
- isKitchen: false if the photo has no food at all (then items is empty).`;

export async function scanKitchen({ image, mediaType }) {
  const content = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
    { type: 'text', text: 'List the cooking ingredients in this photo.' },
  ];
  return scanCheck.parse(await callJson({ system: SCAN_SYSTEM, content, schema: scanSchema, maxTokens: 1500 }));
}
