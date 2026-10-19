import { DRINK_LABEL, DRINK_PAIRINGS, WEATHER_PAIRINGS } from '../data/pairings.js';
import { weatherAt } from './weather.js';
import { tr } from '../i18n.js';

// The moment around a request: the drink they mentioned and the weather where
// they are. Both become soft hints for ranking (hintWords / hintMoods /
// hintCuisines) plus one reason line, and facts for Chatora's wording.

const WEATHER_REASON = {
  rain: () => tr("It's raining — good weather for something hot"),
  hot: (w) => tr('{n}° outside — something light and cool', { n: w.tempC }),
  cold: (w) => tr('Chilly at {n}° — something warm', { n: w.tempC }),
};

export const drinkLabel = (drink) => (drink ? tr(DRINK_LABEL[drink] ?? drink) : null);

// { weather, drink } for this request. Weather needs a location.
export async function contextFor(slots, location) {
  const weather = location ? await weatherAt(location) : null;
  return { weather: weather?.kind ? weather : null, drink: slots.drink && DRINK_PAIRINGS[slots.drink] ? slots.drink : null };
}

// Slots plus hints. A drink always counts (it's what they told us); the
// weather only steps in when they haven't said what they want.
export function withHints(slots, ctx) {
  if (!ctx) return slots;
  const named = Boolean(slots.moods?.length || slots.cuisines?.length || slots.dishWords?.length);
  let hint = null;
  if (ctx.drink) {
    hint = { ...DRINK_PAIRINGS[ctx.drink], icon: 'cup', reason: tr('Goes well with {drink}', { drink: drinkLabel(ctx.drink) }) };
  } else if (ctx.weather && !named) {
    hint = { ...WEATHER_PAIRINGS[ctx.weather.kind], icon: ctx.weather.kind === 'hot' ? 'sun' : 'cloud', reason: WEATHER_REASON[ctx.weather.kind](ctx.weather) };
  }
  if (!hint) return slots;
  return {
    ...slots,
    hintWords: hint.words,
    hintMoods: hint.moods,
    hintCuisines: hint.cuisines,
    hintQuery: named ? null : hint.query,
    hintReason: { icon: hint.icon, text: hint.reason },
  };
}

// Facts for Claude's wording.
export function contextFacts(ctx) {
  if (!ctx) return null;
  const facts = {};
  if (ctx.drink) facts.drink = DRINK_LABEL[ctx.drink];
  if (ctx.weather) facts.weather = { kind: ctx.weather.kind, feelsLikeC: ctx.weather.tempC, description: ctx.weather.text };
  return Object.keys(facts).length ? facts : null;
}
