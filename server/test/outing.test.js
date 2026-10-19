import { mockFetch } from './helpers.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.GOOGLE_MAPS_API_KEY = 'test-key';
const { outingPicks } = await import('../src/services/outing.js');

const place = (id, name, kind, lat, extra = {}) => ({
  id,
  displayName: { text: name },
  shortFormattedAddress: 'Shop 1, Andheri West, Mumbai',
  location: { latitude: lat, longitude: 72.83 },
  rating: 4.5,
  userRatingCount: 200,
  currentOpeningHours: { openNow: true },
  primaryTypeDisplayName: { text: kind },
  businessStatus: 'OPERATIONAL',
  googleMapsUri: `https://maps.google.com/?cid=${id}`,
  ...extra,
});

test('Go Out: real places with drive times; no bars, no repeats, at most 4', async () => {
  const m = mockFetch((url, init) => {
    if (url.includes('places:searchText')) {
      return {
        body: {
          places: [
            place('a', 'Cozy Cafe', 'Cafe', 19.14),
            place('b', 'Cozy Cafe', 'Cafe', 19.141), // the same name again
            place('c', 'Night Owl', 'Bar', 19.142),
            place('d', 'Bean There', 'Coffee shop', 19.143),
            place('e', 'Leaf Cafe', 'Cafe', 19.144),
            place('f', 'Corner Bistro', 'Restaurant', 19.145),
            place('g', 'Closed Cafe', 'Cafe', 19.146, { businessStatus: 'CLOSED_PERMANENTLY' }),
          ],
        },
      };
    }
    if (url.includes('computeRouteMatrix')) {
      const n = JSON.parse(init.body).destinations.length;
      return {
        body: Array.from({ length: n }, (_, i) => ({ originIndex: 0, destinationIndex: i, duration: `${600 + i * 60}s`, staticDuration: '540s', distanceMeters: 2000 + i * 100, condition: 'ROUTE_EXISTS' })),
      };
    }
    return { status: 404 };
  });
  try {
    const { picks } = await outingPicks({ outing: 'cafe' }, {}, { lat: 19.136, lng: 72.83 });
    assert.ok(picks.length > 0 && picks.length <= 4);
    const names = picks.map((p) => p.name);
    assert.ok(!names.includes('Night Owl'));
    assert.ok(!names.includes('Closed Cafe'));
    assert.equal(new Set(names).size, names.length);
    for (const p of picks) {
      assert.equal(p.source, 'outing');
      assert.ok(p.travelMin >= 10);
      assert.ok(p.links.directions.startsWith('https://www.google.com/maps/dir/'));
    }
  } finally {
    m.restore();
  }
});
