// Drive time right now, with traffic, from Google Routes (Compute Route Matrix).
// https://developers.google.com/maps/documentation/routes/compute_route_matrix
// One call covers every candidate place. If Routes fails or isn't switched on,
// places still show with their straight-line distance.

const KEY = () => process.env.GOOGLE_MAPS_API_KEY;
const API = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

const TTL = 10 * 60 * 1000; // traffic changes; keep answers for 10 minutes
const cache = new Map();
let failedAt = 0;

const secs = (d) => (typeof d === 'string' && d.endsWith('s') ? Number(d.slice(0, -1)) : null);

// from: { lat, lng }; to: [{ id, lat, lng }] → Map(id → { minutes, trafficMinutes, km })
export async function driveTimes(from, to) {
  const out = new Map();
  if (!KEY() || !to.length || Date.now() - failedAt < 5 * 60 * 1000) return out;
  const key = `${from.lat.toFixed(3)},${from.lng.toFixed(3)}|${to.map((p) => p.id).join(',')}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': KEY(),
        'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,staticDuration,distanceMeters,condition',
      },
      body: JSON.stringify({
        origins: [{ waypoint: { location: { latLng: { latitude: from.lat, longitude: from.lng } } } }],
        destinations: to.map((p) => ({ waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } } })),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
      signal: AbortSignal.timeout(6000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error?.message || body[0]?.error?.message || `Routes ${res.status}`);
    for (const e of Array.isArray(body) ? body : []) {
      if (e.condition !== 'ROUTE_EXISTS') continue;
      const now = secs(e.duration);
      const usual = secs(e.staticDuration);
      if (now == null) continue;
      out.set(to[e.destinationIndex].id, {
        minutes: Math.max(1, Math.round(now / 60)),
        trafficMinutes: usual != null ? Math.max(0, Math.round((now - usual) / 60)) : 0,
        km: e.distanceMeters != null ? Number((e.distanceMeters / 1000).toFixed(1)) : null,
      });
    }
    cache.set(key, { at: Date.now(), value: out });
    if (cache.size > 1000) cache.delete(cache.keys().next().value);
  } catch (err) {
    failedAt = Date.now();
    console.warn('Travel times unavailable:', err.message.slice(0, 160));
  }
  return out;
}
