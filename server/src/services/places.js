// Real restaurants near the user, from Google Places API (New) Text Search.
// https://developers.google.com/maps/documentation/places/web-service/text-search
//
// Kya Khaun only suggests; people order on Zomato or Swiggy. So we need
// names, ratings, distance, price range and "open now" — never menus.
//
// Cost control: results are cached per (area, query) for a few hours, and we
// ask Google only for the fields we show (the field mask decides the price).

const KEY = process.env.GOOGLE_MAPS_API_KEY;
export const placesEnabled = Boolean(KEY);

// Bars, pubs and clubs are never suggested (Kya Khaun is about food, and the
// app's age rating stays low). Google often lists a bar as a plain "Restaurant",
// so the name is checked too ("... Restobar", "Restaurant & Bar").
const ALCOHOL = /\b(bars?|pubs?|gastropub|brewpub|night ?club|brewery|taproom|liquor|wine|cocktails?|restobar|resto ?bar|lounge|tavern|beer)\b/i;
// Bars that only serve food, or drinks without alcohol.
const SOBER_BAR = /\b(juice|salad|snack|chocolate|dessert|ice ?cream|sandwich|chaat|coffee|protein|smoothie|shake|milk|sizzler|tea|chai)\s+bars?\b|\bbar-?b-?q\b|\bbarbe(que|cue)\b/gi;
export function isAlcoholPlace(p) {
  const text = `${p.kind ?? ''} | ${p.name ?? ''}`.replace(SOBER_BAR, '');
  return ALCOHOL.test(text);
}

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELDS = [
  'places.id',
  'places.displayName',
  'places.shortFormattedAddress',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.currentOpeningHours.openNow',
  'places.primaryTypeDisplayName',
  'places.businessStatus',
  'places.googleMapsUri',
  // Same price tier as rating and opening hours (Text Search Enterprise), so no extra cost.
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
].join(',');

const CACHE_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE = 500;
const cache = new Map(); // key -> { at, places }

// ~1 km grid so nearby people share a cached answer.
const cacheKey = ({ lat, lng, query, radius }) => `${lat.toFixed(2)},${lng.toFixed(2)}|${radius}|${query.toLowerCase()}`;

// "Shop 21, Sai Kanwal Complex, DN Nagar, Andheri West, Mumbai" -> "Andheri West".
// Google's short address ends with the neighbourhood and then the city.
export function areaOf(shortAddress) {
  const parts = String(shortAddress ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return parts[0] ?? '';
  const area = parts.at(-2);
  // Shop numbers, floors and pin codes aren't an area name.
  return /\d|shop|floor|no\.|plot|unit/i.test(area) ? parts.at(-1) : area;
}

export async function searchPlaces({ lat, lng, query, radius = 4000 }) {
  if (!placesEnabled) throw new Error('GOOGLE_MAPS_API_KEY is not set');
  const key = cacheKey({ lat, lng, query, radius });
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.places;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': FIELDS },
    body: JSON.stringify({
      textQuery: query,
      locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius } },
      pageSize: 20,
      languageCode: 'en',
      regionCode: 'IN',
    }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google Places ${res.status}: ${data.error?.message ?? 'no message'}`);

  const places = (data.places ?? [])
    .filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY' && p.businessStatus !== 'CLOSED_TEMPORARILY')
    .map((p) => ({
      id: p.id,
      name: p.displayName?.text ?? 'Restaurant',
      area: areaOf(p.shortFormattedAddress ?? p.formattedAddress),
      address: p.formattedAddress ?? '',
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      rating: p.rating ?? null,
      ratingCount: p.userRatingCount ?? 0,
      priceLevel: p.priceLevel ?? null,
      openNow: p.currentOpeningHours?.openNow ?? null,
      kind: p.primaryTypeDisplayName?.text ?? 'Restaurant',
      mapsUrl: p.googleMapsUri ?? null,
      phone: p.nationalPhoneNumber ?? null, // as shown: "022 2414 4422"
      dial: p.internationalPhoneNumber ? p.internationalPhoneNumber.replace(/[^\d+]/g, '') : null, // for tel: "+912224144422"
    }));

  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), places });
  return places;
}
