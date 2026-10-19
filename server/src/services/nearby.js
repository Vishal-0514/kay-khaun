import { searchPlaces } from './places.js';
import { effectiveCriteria } from './ranking.js';
import { learnedNudge } from './taste.js';
import { tr } from '../i18n.js';

// Real restaurants for "what should I eat": turn the order slip into a Google
// Places search, rank what comes back, and attach links that open the
// restaurant in Zomato or Swiggy, where the customer actually orders.
// Kya Khaun never shows menu prices it doesn't have: price is Google's range
// for the place, and dishes are labelled as typical suggestions.

// Google's price levels, as a rough cost for one person in Indian cities.
export const PRICE = {
  PRICE_LEVEL_FREE: { max: 100, label: 'Under ₹100 for one' },
  PRICE_LEVEL_INEXPENSIVE: { max: 300, label: 'About ₹100–300 for one' },
  PRICE_LEVEL_MODERATE: { max: 700, label: 'About ₹300–700 for one' },
  PRICE_LEVEL_EXPENSIVE: { max: 1500, label: 'About ₹700–1,500 for one' },
  PRICE_LEVEL_VERY_EXPENSIVE: { max: 4000, label: '₹1,500+ for one' },
};

const MOOD_QUERY = {
  sweet: 'desserts and sweets',
  spicy: 'spicy food',
  street: 'street food',
  light: 'healthy food',
  comfort: 'home style food',
};

// "Look for" ideas by what the place is. The most specific match wins, so
// these go from specific dishes to broad kinds of place.
const IDEAS = [
  [/waffle/i, ['Belgian waffle', 'Waffle with ice cream']],
  [/donut|doughnut/i, ['Glazed donut', 'Chocolate donut']],
  [/crepe|pancake/i, ['Nutella crepe', 'Pancakes']],
  [/ice cream|gelato|kulfi|creamery/i, ['Kulfi', 'Sundae']],
  [/falooda/i, ['Royal falooda', 'Kulfi falooda']],
  [/chocolate|brownie/i, ['Brownie', 'Hot chocolate']],
  [/cheesecake/i, ['Cheesecake', 'Brownie']],
  [/bakery|bakes|cake|patisserie|pastry|bake house/i, ['Pastry', 'Brownie']],
  [/sweet|mithai|halwai|confection/i, ['Rasmalai', 'Kaju katli', 'Gulab jamun']],
  [/juice|shake|smoothie/i, ['Fresh juice', 'Milkshake']],
  [/chai|tea\b|tapri/i, ['Masala chai', 'Bun maska']],
  [/biryani/i, ['Chicken biryani', 'Veg dum biryani']],
  [/momo/i, ['Steamed momos', 'Fried momos']],
  [/shawarma|roll|frankie|wrap/i, ['Chicken shawarma', 'Paneer roll']],
  [/kebab|kabab|tikka|grill|barbeque|bbq/i, ['Seekh kebab', 'Paneer tikka']],
  [/chaap/i, ['Malai chaap', 'Tandoori chaap']],
  [/thali/i, ['Veg thali', 'Special thali']],
  [/(vada|wada) ?pa|pav ?bhaji/i, ['Vada pav', 'Pav bhaji']],
  [/calcutta|kolkata|bengal/i, ['Kathi roll', 'Phuchka']],
  [/pizza|pizzeria/i, ['Margherita pizza', 'Garlic bread']],
  [/burger/i, ['Burger', 'Fries']],
  [/sandwich|sub\b/i, ['Grilled sandwich', 'Club sandwich']],
  [/sushi|japanese|ramen/i, ['Sushi', 'Ramen']],
  [/korean/i, ['Korean fried chicken', 'Kimchi fried rice']],
  [/thai/i, ['Thai green curry', 'Pad thai']],
  [/naga|north ?east|assam|tibetan/i, ['Momos', 'Thukpa']],
  [/dessert/i, ['Brownie', 'Ice cream sundae']],
  [/chinese|asian|noodle|wok/i, ['Hakka noodles', 'Chilli paneer']],
  [/south indian|udupi|dosa|idli/i, ['Masala dosa', 'Idli vada', 'Filter coffee']],
  [/italian|pasta/i, ['Pasta', 'Pizza']],
  [/seafood|fish|coastal|malvani|konkan|gomantak/i, ['Fish thali', 'Prawns fry']],
  [/bhel|pani ?puri|golgappa/i, ['Bhel puri', 'Sev puri']],
  [/chaat|snack|street food/i, ['Pav bhaji', 'Vada pav', 'Pani puri']],
  [/north indian|punjabi|dhaba|mughlai|tandoor/i, ['Butter chicken', 'Paneer tikka', 'Dal makhani']],
  [/fast food/i, ['Burger', 'Fries']],
  [/healthy|salad|vegan/i, ['Salad bowl', 'Smoothie']],
  [/cafe|coffee/i, ['Cold coffee', 'Sandwich']],
];
const ideasMatching = (text) => IDEAS.find(([re]) => re.test(text))?.[1];

// Zomato's web paths use its own city names.
const ZOMATO_CITY = { bengaluru: 'bangalore', delhi: 'ncr', 'new delhi': 'ncr', gurugram: 'ncr', gurgaon: 'ncr', noida: 'ncr', mumbai: 'mumbai', 'navi mumbai': 'mumbai', thane: 'mumbai' };
const zomatoCity = (city) => {
  const c = String(city || 'mumbai').trim().toLowerCase();
  return ZOMATO_CITY[c] ?? c.replace(/[^a-z]+/g, '-');
};

export function orderLinks(name, city) {
  return {
    zomato: `https://www.zomato.com/${zomatoCity(city)}/restaurants?q=${encodeURIComponent(name)}`,
    swiggy: `https://www.swiggy.com/search?query=${encodeURIComponent(name)}`,
  };
}

// What to type into Google, from what they asked for.
export function queryFor(c) {
  let what;
  if (c.dishWords.length) what = c.dishWords.slice(0, 2).join(' ');
  else if (c.cuisines.length) what = c.cuisines[0] === 'Desserts' ? 'desserts' : `${c.cuisines[0]} food`;
  else if (c.moods.length) what = MOOD_QUERY[c.moods[0]] ?? 'restaurants';
  else if (c.hintQuery) what = c.hintQuery;
  else what = 'restaurants';
  const veg = c.diet === 'veg' && !/dessert|sweet/.test(what) ? 'pure veg ' : '';
  return `${veg}${what} restaurant`.replace(/restaurants? restaurant$/, 'restaurants');
}

export function km(aLat, aLng, bLat, bLng) {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function ideasFor(place, c) {
  if (c.dishWords.length) return c.dishWords.slice(0, 2).map((w) => w.replace(/^\w/, (x) => x.toUpperCase()));
  // The name says the most ("Snow Waffle"), then Google's kind of place ("Dessert shop").
  const byPlace = ideasMatching(place.name) ?? ideasMatching(place.kind);
  if (byPlace) return byPlace.slice(0, 2);
  // Searched because of a drink or the weather: what goes with it.
  if (c.hintQuery && c.hintWords.length) return c.hintWords.slice(0, 2).map((w) => w.replace(/^\w/, (x) => x.toUpperCase()));
  // A plain "Restaurant": go by what they asked for.
  const byAsk = c.cuisines.length ? ideasMatching(c.cuisines[0]) : c.moods.includes('sweet') ? ideasMatching('dessert') : null;
  return (byAsk ?? []).slice(0, 2);
}

// slots + saved taste + where they are -> { picks, relaxed, query }
export async function nearbyPicks(slots, prefs, { lat, lng, city }, { limit = 5 } = {}) {
  const c = effectiveCriteria(slots, prefs);
  const radius = c.timeMax && c.timeMax <= 30 ? 3000 : 5000;
  const query = queryFor(c);
  const places = await searchPlaces({ lat, lng, query, radius });

  const scored = places
    .filter((p) => p.lat != null)
    .map((p, i) => {
      const distanceKm = km(lat, lng, p.lat, p.lng);
      const price = PRICE[p.priceLevel] ?? null;
      const rating = p.rating ? (p.rating * p.ratingCount + 4 * 40) / (p.ratingCount + 40) : 3.8; // trust ratings with many votes
      const s = {
        rating: Math.max(0, Math.min(1, (rating - 3.5) / 1.4)),
        relevance: 1 - i / Math.max(places.length, 1),
        distance: Math.max(0, 1 - distanceKm / (radius / 1000 + 2)),
        budget: !c.budgetMax ? 0.8 : !price ? 0.55 : price.max <= c.budgetMax ? 1 : price.max <= c.budgetMax * 1.6 ? 0.45 : 0.1,
        open: p.openNow === true ? 1 : p.openNow === null ? 0.6 : 0,
      };
      const total = 0.3 * s.rating + 0.22 * s.relevance + 0.18 * s.distance + 0.2 * s.budget + 0.1 * s.open + learnedNudge(c.learned, p.id, p.kind).boost;
      return { p, distanceKm, price, total };
    });

  // Prefer places that are open and, for a strict budget ("under ₹300"),
  // ones whose price range fits. Loosen only if too few are left.
  const open = scored.filter((x) => x.p.openNow !== false);
  const base = open.length >= 3 ? open : scored;
  const fits = c.budgetMax && c.budgetStrict ? base.filter((x) => !x.price || x.price.max <= c.budgetMax * 1.2) : base;
  const pool = fits.length >= 3 ? fits : base;
  const ranked = pool.sort((a, b) => b.total - a.total).slice(0, limit);

  const picks = ranked.map(({ p, distanceKm, price, total }) => {
    const ideas = ideasFor(p, c);
    const reasons = [];
    const learnedReason = learnedNudge(c.learned, p.id, p.kind).reason;
    // A drink or the weather shaped the search (or the place clearly fits it).
    if (c.hintReason && (c.hintQuery || c.hintWords.some((w) => `${p.name} ${p.kind}`.toLowerCase().includes(w)))) reasons.push(c.hintReason);
    if (learnedReason) reasons.push(learnedReason);
    if (p.rating) reasons.push({ icon: 'star', text: tr('Rated {r} by {n} people on Google', { r: p.rating.toFixed(1), n: p.ratingCount.toLocaleString('en-IN') }) });
    reasons.push({ icon: 'route', text: tr('{km} km from you', { km: distanceKm.toFixed(1) }) });
    if (price) reasons.push({ icon: 'rupee', text: c.budgetMax && price.max <= c.budgetMax ? tr('{label} — fits your ₹{n}', { label: tr(price.label), n: c.budgetMax }) : tr(price.label) });
    if (p.openNow) reasons.push({ icon: 'clock', text: tr('Open now') });
    return {
      id: p.id,
      source: 'places',
      name: p.name,
      restaurant: p.kind,
      area: p.area,
      distanceKm: Number(distanceKm.toFixed(1)),
      rating: p.rating,
      ratingCount: p.ratingCount,
      priceLabel: price ? tr(price.label) : null,
      openNow: p.openNow,
      cuisine: p.kind,
      ideas,
      match: Math.min(99, Math.round(52 + 47 * total)),
      reasons: reasons.slice(0, 4),
      links: { ...orderLinks(p.name, city), maps: p.mapsUrl },
    };
  });

  return { picks, relaxed: null, query };
}
