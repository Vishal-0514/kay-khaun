import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { CUISINES, MOODS } from '../data/mumbaiMenu.js';
import { DRINKS } from '../data/pairings.js';
import { OUTING_IDS } from './outing.js';

// Chatora's brain. Every job is grounded:
//  1. understand() reads the message (with the chat so far) into slots and writes
//     the reply when Chatora needs to ask something or the message isn't about food.
//  2. explainPicks() writes the answer and one reason per dish, using ONLY the
//     dish facts we pass in. Dishes, prices and times always come from ranking.js.
//  3. explainRecipes() does the same for home recipes (cooking.js).
//  4. scanKitchen() lists the ingredients in a fridge or kitchen photo.
//  5. suggestSwap() suggests what to use for a missing recipe ingredient.
//  6. explainOutings() explains places to go out to (Go Out).
//  7. readScene() + explainMood(): Snap My Mood — a photo of where they are
//     becomes hints (setting, time, company, drink), then ideas that fit.
//  8. suggestSongs(): Snap Your Food, Get Your Song — songs for the moment
//     (checked against Apple's catalogue in services/music.js before showing).

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
export const aiEnabled = Boolean(client);
// Claude is used for someone only after they agree to it (the "Chatora uses AI" screen).
export const aiAllowedFor = (user) => aiEnabled && user?.aiConsent === true;

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
  budgetPerPerson: nullable('boolean'),
  people: nullable('integer'),
  timeMax: nullable('integer'),
  branch: { anyOf: [{ type: 'string', enum: ['order', 'cook', 'out'] }, { type: 'null' }] },
  outing: { anyOf: [{ type: 'string', enum: OUTING_IDS }, { type: 'null' }] },
  avoid: { type: 'array', items: { type: 'string', enum: AVOIDABLE } },
  ingredients: { type: 'array', items: { type: 'string' } },
  drink: { anyOf: [{ type: 'string', enum: DRINKS }, { type: 'null' }] },
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
  budgetPerPerson: z.boolean().nullable(),
  people: z.number().int().min(1).max(12).nullable(),
  timeMax: z.number().int().min(5).max(240).nullable(),
  branch: z.enum(['order', 'cook', 'out']).nullable(),
  outing: z.enum(OUTING_IDS).nullable(),
  avoid: z.array(z.enum(AVOIDABLE)),
  ingredients: z.array(z.string().max(40)).max(30),
  drink: z.enum(DRINKS).nullable(),
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
- people: how many are eating if they say ("hum 4 log", "for two", "family of 5" = 5), else null.
- budgetPerPerson: true if the budget is per person ("300 each", "per head"), false if it is for the whole group, null when no group or no budget.
- timeMax: minutes they can wait. "quick", "jaldi", "hungry now" = 30.
- branch: "order" to get food delivered, "cook" to make it at home, "out" to go out somewhere (a café, a restaurant, a drive), else null. "I want to go out", "kahin chalte hain", "where should I go?" = out. Picking a place to EAT AT = out; food brought home = order.
- outing: when going out, what kind: "cafe", "dinner" (a restaurant meal), "chill" (somewhere relaxed), "music" (live music), "date", "outdoors" (sea face, park, a walk), "drive" (a long drive). null if not said.
- avoid: things they don't want, from: ${AVOIDABLE.join(', ')}.
- ingredients: food items they say they have at home right now, in simple lowercase English ("aloo" = "potato", "dahi" = "curd").
- drink: what they say they are drinking or will drink with the meal (${DRINKS.join(', ')}; "daru" or "peg" = whisky), so the app can pick food that goes with it. null if they don't mention one, or if they want to ORDER that drink itself ("I want chai" is a craving, not a drink to pair).
- language: the language they wrote in.
- aboutFood: false for greetings, thanks or unrelated chat.

reply — one or two short, friendly sentences in the SAME language and style they used (Hinglish in Latin script if they wrote Hinglish):
- If aboutFood is false: answer briefly and invite them to say what they feel like eating.
- Else if the order-or-cook choice is still unknown (not in the slip and not in this message): acknowledge what they want in a few words and ask ONLY whether they want to order in, cook at home or go out.
- Else if they want to cook and no ingredients are known yet (none in the slip or this message): ask what they have at home, and mention they can scan their fridge.
- Else if they want to go out and the kind of outing is unknown: ask what they're in the mood for — a café, dinner, somewhere chill, live music, a date, outdoors or a long drive.
- Else: a short acknowledgement such as "On it!" — the app will add the results.
Never name restaurants, dishes, recipes, prices or delivery times in the reply.
Drinks: you only pair food with a drink the user already mentioned. Never suggest, recommend or encourage alcohol or drinking more. If they mention driving after drinking, add a short, kind reminder not to drive.`;

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
- message: two short sentences max, in the user's language and style. Name the #1 dish with its restaurant, price and minutes exactly as given. If "people" is more than 1, the price is per person: also give the groupPrice for all of them, exactly as given. If "relaxed" is set, gently say which limit you stretched.
- reasons: for EVERY dish, one reason of at most 12 words, personal to what they asked for and their taste, in the same language. Use the dish id exactly as given.
- If "moment" is given: in the message only, you may say the food goes well with their drink (never suggest or encourage alcohol) or mention the weather in a few words ("perfect for this rain"). Keep it out of the reasons: the app already shows that line.`;

const PLACES_SYSTEM = `You are Chatora, the food guide in the Kya Khaun? app. The app has already found and ranked real nearby restaurants from Google; the customer orders on Zomato or Swiggy. You only explain the choices.
Use ONLY the facts given (name, kind of place, area, distance, Google rating, price range, open now, typical dishes). You do NOT know their menu or exact prices: never state a dish price, never promise a dish is on the menu — say "try" or "known for" only about the typical dishes given.
- message: two short sentences max, in the user's language and style. Name the #1 place with its distance and rating, and say they can tap to order on Zomato or Swiggy.
- reasons: for EVERY place, one reason of at most 12 words, personal to what they asked for. Use the place id exactly as given.
- If "moment" is given: in the message only, you may say the food goes well with their drink (never suggest or encourage alcohol) or mention the weather in a few words ("perfect for this rain"). Keep it out of the reasons: the app already shows that line.`;

export async function explainPicks({ text, language, slip, picks, relaxed, userName, taste, moment = null }) {
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
    return explain(PLACES_SYSTEM, { userMessage: text, language, userName: userName || null, orderSlip: slip, savedTaste: taste, moment, places }, picks.map((p) => p.id));
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
    ...(p.people > 1 ? { people: p.people, groupPrice: p.groupPrice } : null),
  }));
  return explain(EXPLAIN_SYSTEM, { userMessage: text, language, userName: userName || null, orderSlip: slip, savedTaste: taste, moment, relaxed, dishes }, picks.map((p) => p.id));
}

const RECIPES_SYSTEM = `You are Chatora, the food guide in the Kya Khaun? app. The user wants to cook at home. The app has already chosen and ranked recipes from what they have; you only explain them.
Use ONLY the facts given for each recipe (name, minutes, level, what they have, what is missing). Never invent recipes, ingredients, steps or times.
- message: two short sentences max, in the user's language and style. Name the #1 recipe and its minutes exactly as given. If it needs something they don't have, say so plainly.
- reasons: for EVERY recipe, one reason of at most 12 words, personal to what they asked for, in the same language. Use the recipe id exactly as given.
- If "moment" is given: in the message only, you may say the food goes well with their drink (never suggest or encourage alcohol) or mention the weather in a few words ("perfect for this rain"). Keep it out of the reasons: the app already shows that line.`;

export async function explainRecipes({ text, language, haveLabels, recipes, userName, taste, moment = null }) {
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
  return explain(RECIPES_SYSTEM, { userMessage: text, language, userName: userName || null, theyHave: haveLabels, savedTaste: taste, moment, recipes: facts }, recipes.map((r) => r.id));
}

const PLAN_SYSTEM = `You are Chatora, the food guide in the Kya Khaun? app. The app has already planned the user's meals for the day; you only introduce the plan.
Use ONLY the facts given (meal, dish or place name, restaurant, price or price range, cuisine, and whether they cook it at home). Never invent dishes, prices or places.
- message: at most two short, warm sentences. If appLanguage is "hindi", write in simple Hindi (Devanagari script), keeping dish and restaurant names as given; otherwise simple English with a light Hinglish touch. Describe the shape of the day (e.g. a light start, a filling lunch, a treat in the evening); mention any meal they cook at home. If totalPerPerson and budgetPerPerson are given, say the total against the budget exactly as given; if people is more than 1, say it is per person and also give groupTotal for everyone.`;

// meals: [{ label, cook, name, restaurant?, price?, priceLabel?, cuisine? }] — what's showing now.
export async function explainPlan({ meals, budget, total, moodLabel, people = 1, userName, taste, appLanguage = 'english' }) {
  const facts = meals.map((m) => ({
    meal: m.label,
    cookAtHome: Boolean(m.cook),
    name: m.name,
    restaurant: m.cook ? null : m.restaurant ?? null,
    price: m.cook ? null : m.price ?? null,
    priceRange: m.cook ? null : m.priceLabel ?? null,
    cuisine: m.cuisine ?? null,
  }));
  const out = await callJson({
    system: PLAN_SYSTEM,
    content: JSON.stringify({ appLanguage, userName: userName || null, dayMood: moodLabel, budgetPerPerson: budget, totalPerPerson: total, people, groupTotal: total != null && people > 1 ? total * people : null, savedTaste: taste, meals: facts }),
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

// ---------- 5. a swap for a missing ingredient ----------

const swapSchema = strictObject({ canSwap: { type: 'boolean' }, swap: { type: 'string' } });
const swapCheck = z.object({ canSwap: z.boolean(), swap: z.string().min(1).max(260) });

const SWAP_SYSTEM = `You help an Indian home cook who is missing one ingredient for a recipe.
Suggest ONE practical substitute that Indian homes usually have, preferring something from "theyHave", with the amount and any change to the method, in one or two short sentences (at most 40 words).
- Respect "diet" (veg = no meat, fish or egg; egg = no meat or fish) and never suggest anything in "avoid".
- If the dish works fine without it, say they can skip it and what changes.
- If there is no sensible substitute (it's the star of the dish), set canSwap to false and say so kindly in "swap", suggesting they pick another recipe.
- Write in "language": "hindi" = simple Hindi in Devanagari, otherwise simple English.
- Food safety first: never suggest anything unsafe, such as undercooked meat or egg.`;

export async function suggestSwap({ recipe, ingredient, quantity, theyHave, diet, avoid, language }) {
  const content = JSON.stringify({ recipe, missingIngredient: ingredient, quantity, theyHave, diet, avoid, language });
  return swapCheck.parse(await callJson({ system: SWAP_SYSTEM, content, schema: swapSchema, maxTokens: 600 }));
}

// ---------- 6. explain places to go out to ----------

const OUTING_SYSTEM = `You are Chatora, the guide in the Kya Khaun? app. The user wants to go out. The app has already found and ranked real nearby places from Google and worked out the drive time right now; you only explain the choices.
Use ONLY the facts given (name, kind of place, area, Google rating, drive minutes, extra minutes from traffic, distance, open now, price range). You do NOT know their menus, events, music line-up, views or decor: never claim any of these. Never suggest alcohol.
- message: two short sentences max, in the user's language and style. Name the #1 place with its drive time and rating, and say they can tap Directions.
- reasons: for EVERY place, "why it fits" in at most 12 words, personal to the plan they described (date, chill, long drive…). Use the place id exactly as given.
- If "moment" has weather, you may mention it briefly in the message (rain → somewhere covered; heat → after sunset).`;

export async function explainOutings({ text, language, slip, outing, picks, userName, moment = null }) {
  const places = picks.map((p, i) => ({
    rank: i + 1,
    id: p.id,
    name: p.name,
    kind: p.restaurant,
    area: p.area,
    googleRating: p.rating,
    ratingCount: p.ratingCount,
    driveMinutesNow: p.travelMin,
    extraTrafficMinutes: p.trafficMin,
    distanceKm: p.distanceKm,
    openNow: p.openNow,
    priceRange: p.priceLabel,
  }));
  return explain(OUTING_SYSTEM, { userMessage: text, language, userName: userName || null, plan: outing, orderSlip: slip, moment, places }, picks.map((p) => p.id));
}

// ---------- 7. Snap My Mood: read the setting, then explain the ideas ----------

export const SETTINGS = ['home', 'cafe', 'restaurant', 'office', 'outdoors', 'car', 'party', 'travel', 'other'];
export const VIBES = ['cozy', 'quiet', 'relaxed', 'lively', 'festive', 'romantic', 'work', 'scenic'];

const sceneSchema = strictObject({
  usable: { type: 'boolean' },
  setting: { type: 'string', enum: SETTINGS },
  indoors: nullable('boolean'),
  timeOfDay: { anyOf: [{ type: 'string', enum: ['morning', 'afternoon', 'evening', 'night'] }, { type: 'null' }] },
  rain: { type: 'boolean' },
  company: { type: 'string', enum: ['alone', 'two', 'group', 'unknown'] },
  drink: { anyOf: [{ type: 'string', enum: DRINKS }, { type: 'null' }] },
  foodSeen: { type: 'array', items: { type: 'string' } },
  vibe: { type: 'array', items: { type: 'string', enum: VIBES } },
  craving: nullable('string'),
  language: { type: 'string', enum: LANGUAGES },
  summary: { type: 'string' },
});

const sceneCheck = z.object({
  usable: z.boolean(),
  setting: z.enum(SETTINGS),
  indoors: z.boolean().nullable(),
  timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']).nullable(),
  rain: z.boolean(),
  company: z.enum(['alone', 'two', 'group', 'unknown']),
  drink: z.enum(DRINKS).nullable(),
  foodSeen: z.array(z.string().max(40)).max(6),
  vibe: z.array(z.enum(VIBES)).max(3),
  craving: z.string().max(80).nullable(),
  language: z.enum(LANGUAGES),
  summary: z.string().max(160),
});

const SCENE_SYSTEM = `Someone using the Kya Khaun? food app took a photo of where they are, because they can't decide what to eat or where to go. Describe the SETTING as hints for food and place ideas.
- usable: false if the photo shows no real-world setting (a screenshot, a document, a blank or black frame) or anything inappropriate; then fill the rest with neutral values.
- setting, indoors, timeOfDay (from light and windows; null if unclear), rain (visible rain or wet streets), foodSeen (food on the table, simple English, at most 5).
- company: how many people seem to be there with them: "alone", "two", "group", or "unknown". Count only. Never describe people: no identity, age, gender, looks, clothing or emotions.
- drink: a drink clearly in view (wine glass, beer bottle, chai cup, coffee mug), or one their note mentions; else null.
- vibe: up to 3 words for the place itself (cozy, quiet, relaxed, lively, festive, romantic, work, scenic).
- craving: if their note says what they want ("something fun", "kuch teekha"), a short English phrase; else null. language: the language of their note (english if none).
- summary: one short, neutral line about the setting in that language, starting like "Looks like…" ("Looks like a rainy evening at home"). Never claim to know how they feel.`;

export async function readScene({ image, mediaType, note }) {
  const content = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
    { type: 'text', text: note ? `Their note: ${note}` : 'No note.' },
  ];
  return sceneCheck.parse(await callJson({ system: SCENE_SYSTEM, content, schema: sceneSchema, maxTokens: 1200 }));
}

const MOOD_SYSTEM = `You are Chatora, the guide in the Kya Khaun? app. The user showed you a photo of where they are. The app read the setting ("scene") and already chose real ideas: dishes to order and places nearby. You only explain them.
Use ONLY the facts given for each idea. Never invent menus, prices, events or anything about the people in the photo, and never claim to know how they feel: talk about the setting ("for a rainy evening in"). Never suggest alcohol.
- message: at most two short sentences in the user's language: start from the scene summary, then name the #1 idea.
- reasons: for EVERY idea, "why this fits" in at most 12 words, tied to the setting or their note. Use the idea id exactly as given.`;

export async function explainMood({ scene, note, ideas, userName }) {
  return explain(MOOD_SYSTEM, { scene, note: note || null, language: scene.language, userName: userName || null, ideas }, ideas.map((i) => i.id));
}

// ---------- 8. songs for the meal ----------

export const SONG_LANGUAGES = ['hindi', 'english', 'both'];

const songsSchema = strictObject({
  usable: { type: 'boolean' },
  moment: { type: 'string' },
  songs: { type: 'array', items: strictObject({ title: { type: 'string' }, artist: { type: 'string' }, language: { type: 'string', enum: ['hindi', 'english'] }, reason: { type: 'string' } }) },
});

const songsCheck = z.object({
  usable: z.boolean(),
  moment: z.string().max(140),
  songs: z.array(z.object({ title: z.string().min(1).max(120), artist: z.string().min(1).max(120), language: z.enum(['hindi', 'english']), reason: z.string().min(1).max(140) })).max(10),
});

const SONGS_SYSTEM = `You pick music for the moment someone is eating, for the Kya Khaun? app. You get a photo of their food (and the table around it) or the name of a dish, and the language they want: "hindi" (Hindi film or Hindi indie songs), "english", or "both" (half and half).
- usable: false if a photo has no food or drink in it; then songs is empty.
- moment: one short, warm line about the food and setting, in English, like "Hot chai and pakoda on a rainy evening". Never claim how they feel.
- songs: 6 real, well-known, released songs that suit the food and the moment (coffee and rain → soft acoustic; pizza with friends → upbeat; a candle-lit dinner → soft romantic). Give the exact title as released and the main artist or singer. No explicit songs, no songs about drinking or drugs. Prefer popular songs that are easy to find on Spotify and YouTube.
- reason: why it fits, at most 10 words, in English ("Slow and cozy, like the rain outside").
Only songs you are sure exist; the app checks each one and drops any it can't find.`;

export async function suggestSongs({ image, mediaType, dish, language, note }) {
  const content = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: image } });
  content.push({ type: 'text', text: JSON.stringify({ language, dish: dish ?? null, note: note || null }) });
  return songsCheck.parse(await callJson({ system: SONGS_SYSTEM, content, schema: songsSchema, maxTokens: 2000 }));
}

// ---------- 9. order pages ----------

// Finds a restaurant's own page on Zomato or Swiggy with web search limited to
// that site. Returns the pages the search found (candidates) and the one Claude
// picked; services/orderPages.js only accepts a pick that is among the
// candidates, so a made-up link can never get through.
const ORDER_SITE = { zomato: 'zomato.com', swiggy: 'swiggy.com' };
// What the restaurant's delivery page looks like on each site.
const ORDER_PAGE_SHAPE = {
  zomato: 'https://www.zomato.com/<city>/<restaurant-name-area>',
  swiggy: 'https://www.swiggy.com/city/<city>/<restaurant-name-area>-rest<number> (the food delivery menu). Table booking pages (with /dineout in the address) are NOT the delivery page: never choose them',
};

const ORDER_PAGE_SYSTEM = `You find a restaurant's own page on one food delivery site, using web search.
Search once or twice. Choose the food delivery page for THIS restaurant at THIS location: the same name (small spelling differences are fine) and the same area or city.
Never choose a list page (search results, "best restaurants", collections, "delivery in ...").
If none of the results is clearly this restaurant, answer NONE. Guessing is worse than NONE.
Reply with only the page's full URL exactly as it appeared in the results, or NONE.`;

export async function findOrderPage({ app, name, area, city }) {
  if (!client) throw new Error('AI is off');
  const site = ORDER_SITE[app];
  const messages = [{ role: 'user', content: `Site: ${site}\nDelivery page looks like: ${ORDER_PAGE_SHAPE[app]}\nRestaurant: ${name}\nArea: ${area || 'unknown'}\nCity: ${city || 'unknown'}` }];
  const candidates = [];
  let response;
  // A server-tool turn can pause; carry on once if it does.
  for (let turn = 0; turn < 2; turn++) {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: ORDER_PAGE_SYSTEM,
      output_config: { effort: 'low' },
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2, allowed_domains: [site], user_location: { type: 'approximate', country: 'IN', city: city || undefined } }],
      messages,
    });
    for (const block of response.content) {
      if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        for (const result of block.content) if (result.url) candidates.push(result.url);
      }
    }
    if (response.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: response.content });
  }
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join(' ');
  const chosen = /https:\/\/\S+/.exec(text)?.[0]?.replace(/[)\].,>"']+$/, '') ?? null;
  return { candidates, chosen };
}
