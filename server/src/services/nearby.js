import { searchPlaces } from './places.js';
import { effectiveCriteria } from './ranking.js';
import { learnedNudge } from './taste.js';

// Real restaurants for "what should I eat": turn the order slip into a Google
// Places search, rank what comes back, and attach links that open the
// restaurant in Zomato or Swiggy, where the customer actually orders.
// Kya Khaun never shows menu prices it doesn't have: price is Google's range
// for the place, and dishes are labelled as typical suggestions.

// Google's price levels, as a rough cost for one person in Indian cities.
const PRICE = {
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

// "Look for" ideas by what kind of place it is (or what they asked for).
const IDEAS = [
  [/ice cream|gelato|kulfi/i, ['Kulfi', 'Sundae']],
  [/bakery|cake|patisserie|pastry/i, ['Pastry', 'Brownie']],
  [/sweet|mithai|halwai|confection/i, ['Rasmalai', 'Kaju katli', 'Gulab jamun']],
  [/dessert/i, ['Gulab jamun', 'Brownie with ice cream']],
  [/biryani/i, ['Chicken biryani', 'Veg dum biryani']],
  [/chinese|asian|momo|noodle/i, ['Hakka noodles', 'Chilli paneer', 'Momos']],
  [/south indian|udupi|dosa/i, ['Masala dosa', 'Idli vada', 'Filter coffee']],
  [/pizza|italian/i, ['Margherita pizza', 'Pasta']],
  [/burger|fast food|sandwich/i, ['Burger', 'Fries', 'Grilled sandwich']],
  [/seafood|fish|coastal|malvani/i, ['Fish thali', 'Prawns fry']],
  [/cafe|coffee|tea/i, ['Sandwich', 'Cold coffee']],
  [/street|chaat|snack/i, ['Pav bhaji', 'Vada pav', 'Pani puri']],
  [/north indian|punjabi|dhaba|mughlai|tandoor/i, ['Butter chicken', 'Paneer tikka', 'Dal makhani']],
  [/healthy|salad|vegan/i, ['Salad bowl', 'Smoothie']],
];

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
  else what = 'restaurants';
  const veg = c.diet === 'veg' && !/dessert|sweet/.test(what) ? 'pure veg ' : '';
  return `${veg}${what} restaurant`.replace(/restaurants? restaurant$/, 'restaurants');
}

function km(aLat, aLng, bLat, bLng) {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function ideasFor(place, c) {
  if (c.dishWords.length) return c.dishWords.slice(0, 2).map((w) => w.replace(/^\w/, (x) => x.toUpperCase()));
  const hay = `${place.kind} ${place.name}`;
  const byKind = IDEAS.find(([re]) => re.test(hay));
  if (byKind) return byKind[1].slice(0, 2);
  const byMood = c.moods.includes('sweet') ? ['Gulab jamun', 'Rasmalai'] : c.cuisines.length ? IDEAS.find(([re]) => re.test(c.cuisines[0]))?.[1] : null;
  return (byMood ?? []).slice(0, 2);
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
    if (learnedReason) reasons.push(learnedReason);
    if (p.rating) reasons.push({ icon: 'star', text: `Rated ${p.rating.toFixed(1)} by ${p.ratingCount.toLocaleString('en-IN')} people on Google` });
    reasons.push({ icon: 'route', text: `${distanceKm.toFixed(1)} km from you` });
    if (price) reasons.push({ icon: 'rupee', text: c.budgetMax && price.max <= c.budgetMax ? `${price.label} — fits your ₹${c.budgetMax}` : price.label });
    if (p.openNow) reasons.push({ icon: 'clock', text: 'Open now' });
    return {
      id: p.id,
      source: 'places',
      name: p.name,
      restaurant: p.kind,
      area: p.area,
      distanceKm: Number(distanceKm.toFixed(1)),
      rating: p.rating,
      ratingCount: p.ratingCount,
      priceLabel: price?.label ?? null,
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
