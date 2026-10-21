import { searchPlaces, isAlcoholPlace } from './places.js';
import { driveTimes } from './routes.js';
import { effectiveCriteria } from './ranking.js';
import { PRICE, km } from './nearby.js';
import { learnedNudge } from './taste.js';
import { tr } from '../i18n.js';

// "Where should I go?": 3–4 real places near the user for the kind of outing
// they want, with drive time right now (traffic included) and a Directions
// link. Everything shown comes from Google: name, kind, rating, price range,
// open now. Kya Khaun never claims events, menus or music it doesn't know.

export const OUTINGS = {
  cafe: { label: 'Café', query: 'cafe', radius: 5000, maxKm: 12 },
  dinner: { label: 'Dinner', query: 'restaurant for dinner', radius: 6000, maxKm: 15 },
  chill: { label: 'Chill place', query: 'cozy cafe to relax', radius: 6000, maxKm: 15 },
  music: { label: 'Live music', query: 'live music venue', radius: 10000, maxKm: 25 },
  date: { label: 'Date night', query: 'romantic restaurant', radius: 8000, maxKm: 20 },
  outdoors: { label: 'Outdoors', query: 'sea face promenade or park', radius: 8000, maxKm: 20, outdoor: true },
  drive: { label: 'Long drive', query: ['scenic viewpoint', 'highway dhaba'], radius: 50000, minKm: 15, maxKm: 90, outdoor: true },
};
export const OUTING_IDS = Object.keys(OUTINGS);
export const OUTING_OPTIONS = OUTING_IDS.map((id) => ({ id: `out-${id}`, label: OUTINGS[id].label }));

// What to type into Google: their cuisine and diet shape dinner and date searches.
function queriesFor(outing, c) {
  const o = OUTINGS[outing];
  const base = Array.isArray(o.query) ? o.query : [o.query];
  if ((outing === 'dinner' || outing === 'date') && c.cuisines.length) {
    const cuisine = c.cuisines[0] === 'Desserts' ? 'dessert' : c.cuisines[0];
    return [`${outing === 'date' ? 'romantic ' : ''}${cuisine} restaurant`];
  }
  if ((outing === 'dinner' || outing === 'date') && c.diet === 'veg') return base.map((q) => `pure veg ${q}`);
  return base;
}

const directionsUrl = (p) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name)}&destination_place_id=${encodeURIComponent(p.id)}`;

// slots + saved taste + where they are + the weather → { picks, outing }
export async function outingPicks(slots, prefs, { lat, lng }, { weather = null, limit = 4 } = {}) {
  const outing = OUTINGS[slots.outing] ? slots.outing : 'cafe';
  const o = OUTINGS[outing];
  const c = effectiveCriteria(slots, prefs);

  // Search, merge (long drives search twice) and keep places in range.
  const lists = await Promise.all(queriesFor(outing, c).map((query) => searchPlaces({ lat, lng, query, radius: o.radius })));
  // Same place listed twice (or two pins with one name) shows once. Places whose
  // main business is alcohol (bars, pubs, clubs) are left out: Kya Khaun
  // doesn't send people to drink.
  const seen = new Set();
  const nameOf = (p) => p.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const found = lists
    .flat()
    .filter((p) => p.lat != null && !isAlcoholPlace(p) && !seen.has(p.id) && !seen.has(nameOf(p)) && seen.add(p.id) && seen.add(nameOf(p)))
    .map((p, i) => ({ p, i, straightKm: km(lat, lng, p.lat, p.lng) }))
    .filter(({ straightKm }) => straightKm <= o.maxKm && straightKm >= (o.minKm ?? 0));

  // Open places first (long drives: spots often have no hours, so keep those).
  const open = found.filter(({ p }) => p.openNow !== false);
  const pool = (open.length >= 3 ? open : found).slice(0, 10);

  // Real drive time now, for the shortlist, in one call.
  const times = await driveTimes({ lat, lng }, pool.map(({ p }) => ({ id: p.id, lat: p.lat, lng: p.lng })));

  const scored = pool.map(({ p, i, straightKm }) => {
    const t = times.get(p.id);
    const minutes = t?.minutes ?? Math.round(straightKm * 4 + 5); // rough city speed if Routes is unavailable
    const price = PRICE[p.priceLevel] ?? null;
    const rating = p.rating ? (p.rating * p.ratingCount + 4 * 40) / (p.ratingCount + 40) : 3.8;
    const s = {
      rating: Math.max(0, Math.min(1, (rating - 3.5) / 1.4)),
      // A long drive is meant to be far; everything else is better close by.
      travel: outing === 'drive' ? 1 - Math.abs(minutes - 75) / 120 : Math.max(0, 1 - minutes / 50),
      relevance: 1 - i / Math.max(found.length, 1),
      open: p.openNow === true ? 1 : p.openNow === null ? 0.6 : 0,
      budget: !c.budgetMax ? 0.8 : !price ? 0.55 : price.max <= c.budgetMax ? 1 : price.max <= c.budgetMax * 1.6 ? 0.45 : 0.1,
    };
    const total = 0.34 * s.rating + 0.24 * s.travel + 0.16 * s.relevance + 0.14 * s.open + 0.12 * s.budget + learnedNudge(c.learned, p.id, p.kind).boost;
    return { p, t, minutes, price, total, distanceKm: t?.km ?? Number(straightKm.toFixed(1)) };
  });

  const picks = scored
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map(({ p, t, minutes, price, total, distanceKm }) => {
      const reasons = [];
      if (weather?.kind === 'rain' && o.outdoor) reasons.push({ icon: 'cloud', text: tr("It's raining — check the sky before you head out") });
      else if (weather?.kind === 'hot' && weather.isDaytime && o.outdoor) reasons.push({ icon: 'sun', text: tr('{n}° now — nicer after sunset', { n: weather.tempC }) });
      reasons.push({
        icon: 'route',
        text: t
          ? t.trafficMinutes >= 5
            ? tr('{n} min by car now ({extra} min extra traffic)', { n: minutes, extra: t.trafficMinutes })
            : tr('{n} min by car now', { n: minutes })
          : tr('{km} km from you', { km: distanceKm }),
      });
      if (p.rating) reasons.push({ icon: 'star', text: tr('Rated {r} by {n} people on Google', { r: p.rating.toFixed(1), n: p.ratingCount.toLocaleString('en-IN') }) });
      if (p.openNow) reasons.push({ icon: 'clock', text: tr('Open now') });
      if (price) reasons.push({ icon: 'rupee', text: tr(price.label) });
      return {
        id: `out-${p.id}`,
        placeId: p.id,
        source: 'outing',
        outing,
        name: p.name,
        restaurant: p.kind,
        area: p.area,
        lat: p.lat,
        lng: p.lng,
        rating: p.rating,
        ratingCount: p.ratingCount,
        distanceKm,
        travelMin: t ? minutes : null,
        trafficMin: t?.trafficMinutes ?? null,
        openNow: p.openNow,
        priceLabel: price ? tr(price.label) : null,
        vibe: p.kind,
        match: Math.min(99, Math.round(52 + 47 * total)),
        reasons: reasons.slice(0, 4),
        links: { maps: p.mapsUrl, directions: directionsUrl(p) },
      };
    });

  return { picks, outing };
}
