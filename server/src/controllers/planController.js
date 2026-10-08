import { aiEnabled, explainPlan } from '../services/ai.js';
import { planDay } from '../services/dayPlan.js';
import { placesEnabled } from '../services/places.js';
import { prefsOf, tasteOf } from '../services/taste.js';

// meals: [{ label, cook, name }] — what's showing. total is null for real places.
function templateNote({ meals, budget, total, people = 1 }) {
  const first = meals[0];
  const last = meals.at(-1);
  if (!first) return "I couldn't plan a day with those choices. Try a bigger budget or fewer limits.";
  const shape = meals.length > 1 ? `${first.name} to start, ${last.name} to end the day` : `${first.name} for ${first.label.toLowerCase()}`;
  const cooked = meals.filter((m) => m.cook).length;
  const home = cooked ? ` ${cooked === 1 ? 'One meal is' : `${cooked} meals are`} from your own kitchen.` : '';
  if (total == null) return `Here's your day: ${shape}.${home} Tap any meal to order it on Zomato or Swiggy.`;
  const group = people > 1 ? ` per person (₹${(total * people).toLocaleString('en-IN')} for all ${people})` : '';
  const sum = total > budget ? `It comes to ₹${total}${group}, a little over your ₹${budget} — swap a meal to bring it down.` : `All of it for ₹${total} of your ₹${budget}${group}.`;
  return `Here's your day: ${shape}.${home} ${sum}`;
}

async function noteFor(facts, user) {
  if (!aiEnabled || !facts.meals.length) return templateNote(facts);
  try {
    return await explainPlan({ ...facts, userName: user.name, taste: prefsOf(user) });
  } catch (err) {
    console.error('Claude could not introduce the plan, using a template:', err.message);
    return templateNote(facts);
  }
}

export async function makePlan(req, res) {
  const taste = await tasteOf(req.user);
  let plan;
  try {
    plan = await planDay(req.body, taste, { usePlaces: placesEnabled });
  } catch (err) {
    // Google can fail or run out of quota; the sample menu always works.
    console.error('Nearby places failed for the day plan, using the sample menu:', err.message);
    plan = await planDay(req.body, taste);
  }

  const meals = plan.meals.map((m) => ({ label: m.label, cook: false, name: m.pick.name, restaurant: m.pick.restaurant, price: m.pick.price, priceLabel: m.pick.priceLabel, cuisine: m.pick.cuisine }));
  const note = await noteFor({ meals, budget: plan.budget, total: plan.spent, moodLabel: plan.moodLabel, people: plan.people }, req.user);
  res.json({ success: true, plan: { ...plan, note } });
}

// After swaps or "cook at home", a fresh note for what's showing now.
export async function planNote(req, res) {
  const { meals, budget, moodLabel, people = 1 } = req.body;
  const total = meals.some((m) => !m.cook && m.price == null) ? null : meals.reduce((s, m) => s + (m.cook ? 0 : m.price), 0);
  res.json({ success: true, note: await noteFor({ meals, budget, total, moodLabel, people }, req.user) });
}
