// Checks that a suggested song really exists, using Apple's public iTunes
// Search API (no key). Only songs found there are shown, so Chatora can't
// recommend made-up titles. Explicit tracks are skipped.
// https://performance-partners.apple.com/search-api

const API = 'https://itunes.apple.com/search';
const TTL = 24 * 60 * 60 * 1000;
const cache = new Map();

const words = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ') // "(From "Brahmastra")"
    .normalize('NFKD')
    .replace(/[^a-z0-9ऀ-ॿ ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

// "Kesariya" matches "Kesariya (From "Brahmastra")"; the artist must share a word.
function matches(track, title, artist) {
  const want = words(title).join(' ');
  const got = words(track.trackName).join(' ');
  if (!want || !(got === want || got.startsWith(`${want} `) || want.startsWith(`${got} `))) return false;
  const a = new Set(words(artist));
  return words(track.artistName).some((w) => w.length > 2 && a.has(w));
}

// { title, artist } → { title, artist, album, year, appleUrl, artwork } or null
export async function findSong({ title, artist }) {
  const key = `${title}|${artist}`.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  let value = null;
  try {
    const url = `${API}?term=${encodeURIComponent(`${title} ${artist}`)}&entity=song&country=IN&limit=8`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const body = await res.json();
    // The original recording, not a remix, live, lo-fi or karaoke version (unless that's what was named).
    const VERSION = /remix|\bmix\b|live|version|karaoke|instrumental|cover|lo-?fi|slowed|reverb|reprise|unplugged/i;
    const candidates = (body.results ?? []).filter((t) => t.trackExplicitness !== 'explicit' && matches(t, title, artist));
    const track = VERSION.test(title) ? candidates[0] : candidates.find((t) => !VERSION.test(t.trackName)) ?? candidates[0];
    if (track) {
      value = {
        title: track.trackName.replace(/\s*\((From|from) .*?\)\s*$/, ''),
        artist: track.artistName,
        album: track.collectionName ?? null,
        year: track.releaseDate ? Number(track.releaseDate.slice(0, 4)) : null,
        appleUrl: track.trackViewUrl ?? null,
        artwork: track.artworkUrl100 ?? null,
      };
    }
  } catch (err) {
    console.warn('Song check failed:', err.message);
    return null; // don't cache a network failure
  }
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 3000) cache.delete(cache.keys().next().value);
  return value;
}

// Search links for the music apps people use (no partnership needed).
export function songLinks({ title, artist, appleUrl }) {
  const q = encodeURIComponent(`${title} ${artist}`);
  return {
    spotify: `https://open.spotify.com/search/${q}`,
    youtubeMusic: `https://music.youtube.com/search?q=${q}`,
    ...(appleUrl ? { apple: appleUrl } : {}),
  };
}
