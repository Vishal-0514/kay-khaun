import OrderPage from '../models/OrderPage.js';
import { findOrderPage } from './ai.js';

// "Order on Zomato / Swiggy": open the restaurant's own page in the app, not a
// search (Zomato's app ignores search words, and Swiggy's app doesn't open its
// search page at all). Pages are found with web search limited to that site
// (services/ai.js findOrderPage), checked here, and remembered per restaurant.

export const ORDER_APPS = ['zomato', 'swiggy'];
const DAY = 24 * 60 * 60 * 1000;
const FOUND_FOR = 30 * DAY;
const MISSING_FOR = 7 * DAY;

// Zomato's paths that are lists, not one restaurant.
const ZOMATO_NOT_A_RESTAURANT = /^(restaurants|delivery|dine-out|collections|nightlife|cafes?|order-food-online|best-.*|top-.*|.*-restaurants|.*-delivery|.*-near-me|.*-in-.*)$/;

const words = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['the', 'and', 'restaurant', 'cafe', 'kitchen', 'foods', 'food'].includes(w));

// The restaurant's delivery page, or null if this isn't one. Both apps open
// these addresses straight on that restaurant (their app-link files list them).
export function restaurantPage(app, url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const parts = u.pathname.split('/').filter(Boolean);
  if (app === 'zomato') {
    if (!/^(www\.)?zomato\.com$/.test(u.hostname) || parts.length < 2) return null;
    const [city, slug, extra] = parts;
    if (!/^[a-z-]+$/.test(city) || !/^[a-z0-9-]+$/.test(slug) || ZOMATO_NOT_A_RESTAURANT.test(slug)) return null;
    if (extra && !['order', 'info', 'menu', 'reviews', 'photos'].includes(extra)) return null;
    return `https://www.zomato.com/${city}/${slug}`;
  }
  if (app === 'swiggy') {
    if (!/^(www\.)?swiggy\.com$/.test(u.hostname)) return null;
    const path = parts.join('/');
    // Only the delivery menu: /city/<city>/<name>-rest<id>, or the older
    // /restaurants/<name>-<id> that redirects to it. Table-booking pages
    // (/restaurants/.../dineout) use other numbers and can't be ordered from.
    if (/^city\/[a-z-]+\/[a-z0-9-]+-rest\d+$/.test(path) || /^restaurants\/[a-z0-9-]+-\d+$/.test(path)) return `https://www.swiggy.com/${path}`;
    return null;
  }
  return null;
}

// The page has to be about this restaurant: its address shares a word of the name.
// Short names ("Cafe 2.0") have no telling word, so the whole name must lead the address.
export function looksLike(url, name) {
  const last = url.split('/').filter(Boolean).at(-1);
  const key = words(name);
  if (key.length) return key.some((w) => words(last.replace(/-/g, ' ')).includes(w));
  const whole = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return Boolean(whole) && last.startsWith(whole);
}

// Shown when the restaurant isn't on that app (or the lookup fails):
// a web search for it, so the person can still find it in one more tap.
export function searchLink(app, { name, area, city }) {
  const site = app === 'zomato' ? 'zomato.com' : 'swiggy.com';
  return `https://www.google.com/search?q=${encodeURIComponent([name, area, city, site].filter(Boolean).join(' '))}`;
}

// { url, found } for one restaurant on one app.
export async function orderPage(app, place) {
  const key = `${app}:${place.id || `${place.name}|${place.city}`.toLowerCase()}`;
  const cached = await OrderPage.findOne({ key, expiresAt: { $gt: new Date() } }).lean();
  if (cached) return cached.url ? { url: cached.url, found: true } : { url: searchLink(app, place), found: false };

  let url = null;
  try {
    const { candidates, chosen } = await findOrderPage({ app, ...place });
    // Only a page that really came up in the search, is a restaurant page,
    // and matches the name. Never a link the model wrote by itself.
    const pages = new Set(candidates.map((c) => restaurantPage(app, c)).filter(Boolean));
    const pick = restaurantPage(app, chosen ?? '');
    if (pick && pages.has(pick) && looksLike(pick, place.name)) url = pick;
  } catch (err) {
    // The search failed (network, quota): don't remember that, just fall back.
    console.warn(`Order page lookup failed (${app}):`, err.message);
    return { url: searchLink(app, place), found: false };
  }
  await OrderPage.updateOne({ key }, { $set: { url, expiresAt: new Date(Date.now() + (url ? FOUND_FOR : MISSING_FOR)) } }, { upsert: true });
  return url ? { url, found: true } : { url: searchLink(app, place), found: false };
}
