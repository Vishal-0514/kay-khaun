import { aiEnabled, aiAllowedFor, suggestSongs } from '../services/ai.js';
import { findSong, songLinks } from '../services/music.js';
import { tr } from '../i18n.js';

// Snap Your Food, Get Your Song: a photo of the food (or a dish name) and a
// language → 3–4 real songs for the moment, with links to open them in a
// music app. Chatora suggests; every song is checked against Apple's catalogue
// first. The photo is read once and not stored.

const DAILY_LIMIT = 30;
const recent = new Map();

function tooMany(userId) {
  const now = Date.now();
  const times = (recent.get(userId) ?? []).filter((t) => now - t < 24 * 60 * 60 * 1000);
  if (times.length >= DAILY_LIMIT) return true;
  recent.set(userId, [...times, now]);
  if (recent.size > 5000) recent.delete(recent.keys().next().value);
  return false;
}

// Keep the first real songs; for "both", alternate Hindi and English.
export function choose(found, language, count = 4) {
  if (language !== 'both') return found.slice(0, count);
  const hi = found.filter((s) => s.language === 'hindi');
  const en = found.filter((s) => s.language === 'english');
  const out = [];
  while (out.length < count && (hi.length || en.length)) {
    if (hi.length) out.push(hi.shift());
    if (out.length < count && en.length) out.push(en.shift());
  }
  return out;
}

export async function songs(req, res) {
  if (aiEnabled && !aiAllowedFor(req.user)) {
    return res.status(403).json({ success: false, code: 'AI_CONSENT', error: 'Songs for your meal use AI. Turn on "Use AI" in Profile to use it.' });
  }
  if (!aiEnabled) return res.status(503).json({ success: false, code: 'AI_OFF', error: "Song picks aren't switched on yet." });
  if (tooMany(String(req.user._id))) return res.status(429).json({ success: false, error: "That's a lot of songs for one day. Try again tomorrow." });

  const { image, mediaType, dish, language, note } = req.body;
  let out;
  try {
    out = await suggestSongs({ image, mediaType, dish, language, note });
  } catch (err) {
    console.error('Song picks failed:', err.message);
    return res.status(502).json({ success: false, error: "I couldn't pick songs just now. Try again." });
  }
  if (!out.usable) return res.json({ success: true, unusable: true, message: tr("I couldn't spot any food in that photo. Try a photo of your plate.") });

  const checked = await Promise.all(out.songs.map(async (s) => ({ s, real: await findSong(s) })));
  const found = checked.filter((c) => c.real).map(({ s, real }) => ({ ...real, language: s.language, reason: s.reason }));
  const seen = new Set();
  const unique = found.filter((s) => !seen.has(`${s.title}|${s.artist}`.toLowerCase()) && seen.add(`${s.title}|${s.artist}`.toLowerCase()));
  const picks = choose(unique, language).map((s) => ({ ...s, links: songLinks(s) }));
  if (!picks.length) return res.json({ success: true, unusable: true, message: tr("I couldn't find songs I'm sure about this time. Try again.") });
  res.json({ success: true, moment: out.moment, language, songs: picks });
}
