// The weather where the user is, from Google's Weather API (same key as Places).
// Chatora only uses it as a hint: rain → chai and pakoda, heat → something cool.
// If the API isn't switched on or fails, picks simply ignore the weather.
// https://developers.google.com/maps/documentation/weather/current-conditions

const KEY = () => process.env.GOOGLE_WEATHER_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
const API = 'https://weather.googleapis.com/v1/currentConditions:lookup';

export const weatherEnabled = () => Boolean(KEY()) && process.env.WEATHER_OFF !== '1';

// Weather changes slowly: one lookup per ~5 km square every 20 minutes.
const TTL = 20 * 60 * 1000;
const cache = new Map();
let failedAt = 0;
let warned = false;

const cell = (lat, lng) => `${(Math.round(lat * 20) / 20).toFixed(2)},${(Math.round(lng * 20) / 20).toFixed(2)}`;

// Google's condition type → what matters for food.
export function classify(body) {
  const type = String(body?.weatherCondition?.type ?? '');
  const feels = body?.feelsLikeTemperature?.degrees ?? body?.temperature?.degrees ?? null;
  const tempC = feels == null ? null : Math.round(feels);
  let kind = null;
  if (/RAIN|SHOWER|THUNDER|DRIZZLE/.test(type) && !type.startsWith('CHANCE_OF')) kind = 'rain';
  else if (tempC != null && tempC >= 33) kind = 'hot';
  else if (tempC != null && tempC <= 16) kind = 'cold';
  return { kind, tempC, text: body?.weatherCondition?.description?.text ?? null, isDaytime: body?.isDaytime ?? null };
}

// { kind: 'rain' | 'hot' | 'cold' | null, tempC, text } or null when unknown.
export async function weatherAt({ lat, lng } = {}) {
  if (!weatherEnabled() || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const key = cell(lat, lng);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  // After a failure (API off, quota), don't slow every chat down for 10 minutes.
  if (Date.now() - failedAt < 10 * 60 * 1000) return null;
  try {
    const url = `${API}?key=${KEY()}&location.latitude=${lat}&location.longitude=${lng}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error?.message || `Weather lookup failed (${res.status})`);
    const value = classify(body);
    cache.set(key, { at: Date.now(), value });
    if (cache.size > 2000) cache.delete(cache.keys().next().value);
    return value;
  } catch (err) {
    failedAt = Date.now();
    if (!warned) console.warn('Weather unavailable, picks ignore it:', err.message.slice(0, 160));
    warned = true;
    return null;
  }
}
