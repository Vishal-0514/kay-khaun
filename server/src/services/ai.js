import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { CUISINES, MOODS } from '../data/mumbaiMenu.js';

// Chatora's brain. Two jobs, both grounded:
//  1. understand() reads the message (with the chat so far) into slots and writes
//     the reply when Chatora needs to ask something or the message isn't about food.
//  2. explainPicks() writes the answer and one reason per dish, using ONLY the
//     dish facts we pass in. Dishes, prices and times always come from ranking.js.

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
  diet: { type: ['string', 'null'], enum: ['veg', 'nonveg', 'egg', null] },
  budgetMax: nullable('integer'),
  budgetStrict: nullable('boolean'),
  timeMax: nullable('integer'),
  branch: { type: ['string', 'null'], enum: ['order', 'cook', null] },
  avoid: { type: 'array', items: { type: 'string', enum: AVOIDABLE } },
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
- language: the language they wrote in.
- aboutFood: false for greetings, thanks or unrelated chat.

reply — one or two short, friendly sentences in the SAME language and style they used (Hinglish in Latin script if they wrote Hinglish):
- If aboutFood is false: answer briefly and invite them to say what they feel like eating.
- Else if the order-or-cook choice is still unknown (not in the slip and not in this message): acknowledge what they want in a few words and ask ONLY whether they want to order in or cook at home.
- Else: a short acknowledgement such as "On it!" — the app will add the results.
Never name restaurants, dishes, prices or delivery times in the reply.`;

export async function understand({ text, history, slip }) {
  const content = [
    `Order slip so far: ${JSON.stringify(slip)}`,
    history.length ? `Recent chat:\n${history.map((m) => `${m.role === 'user' ? 'User' : 'Chatora'}: ${m.text}`).join('\n')}` : 'Recent chat: (none)',
    `Latest message: ${text}`,
  ].join('\n\n');
  return understandCheck.parse(await callJson({ system: UNDERSTAND_SYSTEM, content, schema: understandSchema, maxTokens: 1500 }));
}

// ---------- 2. explain picks ----------

const explainSchema = strictObject({
  message: { type: 'string' },
  reasons: { type: 'array', items: strictObject({ id: { type: 'string' }, reason: { type: 'string' } }) },
});

const explainCheck = z.object({
  message: z.string().min(1).max(500),
  reasons: z.array(z.object({ id: z.string(), reason: z.string().min(1).max(120) })),
});

const EXPLAIN_SYSTEM = `You are Chatora, the food guide in the Kya Khaun? app. The app has already chosen and ranked the dishes; you only explain them.
Use ONLY the facts given for each dish (name, restaurant, price, delivery minutes, rating, spice, cuisine, diet, distance). Never invent dishes, prices, times, offers or ingredients.
- message: two short sentences max, in the user's language and style. Name the #1 dish with its restaurant, price and minutes exactly as given. If "relaxed" is set, gently say which limit you stretched.
- reasons: for EVERY dish, one reason of at most 12 words, personal to what they asked for and their taste, in the same language. Use the dish id exactly as given.`;

export async function explainPicks({ text, language, slip, picks, relaxed, userName, taste }) {
  const facts = picks.map((p, i) => ({
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
  const content = JSON.stringify({ userMessage: text, language, userName: userName || null, orderSlip: slip, savedTaste: taste, relaxed, dishes: facts });
  const out = explainCheck.parse(await callJson({ system: EXPLAIN_SYSTEM, content, schema: explainSchema, maxTokens: 2500 }));
  const ids = new Set(picks.map((p) => p.id));
  return { message: out.message, reasons: Object.fromEntries(out.reasons.filter((r) => ids.has(r.id)).map((r) => [r.id, r.reason])) };
}
