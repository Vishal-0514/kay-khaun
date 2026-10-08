import { aiEnabled, explainPlan } from '../services/ai.js';
import { planDay } from '../services/dayPlan.js';
import { placesEnabled } from '../services/places.js';

const prefsOf = (user) => (user.memoryEnabled ? user.preferences?.toObject?.() ?? user.preferences ?? {} : {});

function templateNote(plan) {
  const first = plan.meals[0];
  const last = plan.meals.at(-1);
  if (!first) return "I couldn't plan a day with those choices. Try a bigger budget or fewer limits.";
  const shape = plan.meals.length > 1 ? `${first.pick.name} to start, ${last.pick.name} to end the day` : `${first.pick.name} for ${first.label.toLowerCase()}`;
  if (plan.spent == null) return `Here's your day: ${shape}. Tap any meal to order it on Zomato or Swiggy.`;
  const total = plan.overBudget
    ? `It comes to ₹${plan.spent}, a little over your ₹${plan.budget} — the closest I could get.`
    : `All of it for ₹${plan.spent} of your ₹${plan.budget}.`;
  return `Here's your day: ${shape}. ${total}`;
}

export async function makePlan(req, res) {
  const prefs = prefsOf(req.user);
  let plan;
  try {
    plan = await planDay(req.body, prefs, { usePlaces: placesEnabled });
  } catch (err) {
    // Google can fail or run out of quota; the sample menu always works.
    console.error('Nearby places failed for the day plan, using the sample menu:', err.message);
    plan = await planDay(req.body, prefs);
  }

  let note = templateNote(plan);
  if (aiEnabled && plan.meals.length) {
    try {
      note = await explainPlan({ plan, userName: req.user.name, taste: prefs });
    } catch (err) {
      console.error('Claude could not introduce the plan, using a template:', err.message);
    }
  }
  res.json({ success: true, plan: { ...plan, note } });
}
