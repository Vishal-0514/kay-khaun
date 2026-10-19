import crypto from 'node:crypto';

// Chatora's voice: Google Cloud Text-to-Speech, a male and a female voice for
// Indian English and Hindi. The voice language follows the script of the text
// (Devanagari → Hindi, otherwise Indian English, which reads Hinglish well).
// Without a key the app simply doesn't offer spoken replies.

const KEY = () => process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
const API = 'https://texttospeech.googleapis.com/v1';

export const ttsEnabled = () => Boolean(KEY());

// True once Google has answered with voices. A failure is remembered for a
// minute so a misconfigured key doesn't turn every status check into a call.
let failedAt = 0;
export async function ttsReady() {
  if (!ttsEnabled()) return false;
  if (voices) return true;
  if (Date.now() - failedAt < 60 * 1000) return false;
  try {
    await pickVoices();
    return true;
  } catch (err) {
    failedAt = Date.now();
    console.warn('Text-to-speech unavailable:', err.message);
    return false;
  }
}
export const GENDERS = ['female', 'male'];
export const MAX_CHARS = 600;

// Natural-sounding families first. Neural2 and WaveNet are in Google's free
// monthly allowance; Standard is the last resort.
const RANK = ['Neural2', 'Wavenet', 'Chirp3-HD', 'Chirp-HD', 'Standard'];
const rank = (name) => {
  const i = RANK.findIndex((family) => name.includes(`-${family}-`));
  return i === -1 ? RANK.length : i;
};

let voices = null; // { 'hi-IN': { female, male }, 'en-IN': { female, male } }

async function call(path, init) {
  const res = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}key=${KEY()}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error?.message || `Text-to-speech failed (${res.status})`), { status: 502 });
  return body;
}

// Ask Google once which voices exist, and keep the best male and female per language.
async function pickVoices() {
  if (voices) return voices;
  const found = {};
  for (const lang of ['hi-IN', 'en-IN']) {
    const list = (await call(`/voices?languageCode=${lang}`)).voices ?? [];
    const best = (gender) =>
      list
        .filter((v) => v.languageCodes?.includes(lang) && v.ssmlGender === gender)
        .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))[0]?.name ?? null;
    found[lang] = { female: best('FEMALE'), male: best('MALE') };
  }
  voices = found;
  return voices;
}

// Text a person reads is not quite text a voice should say.
function speakable(text) {
  return text
    .replace(/\p{Extended_Pictographic}|️/gu, '')
    .replace(/[*_#`~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHARS);
}

export const languageOf = (text) => (/[ऀ-ॿ]/.test(text) ? 'hi-IN' : 'en-IN');

// Finished clips, kept briefly so a replay doesn't cost another request.
const clips = new Map(); // id → { audio: Buffer, expires }
const byText = new Map(); // hash of (voice, text) → id
const CLIP_TTL = 15 * 60 * 1000;
const MAX_CLIPS = 300;

function prune() {
  const now = Date.now();
  for (const [id, clip] of clips) if (clip.expires < now) clips.delete(id);
  while (clips.size > MAX_CLIPS) clips.delete(clips.keys().next().value);
  for (const [hash, id] of byText) if (!clips.has(id)) byText.delete(hash);
}

// Synthesise `text` in the chosen voice. Returns a short-lived clip id.
export async function synthesize(text, gender) {
  const words = speakable(text);
  if (!words) throw Object.assign(new Error('Nothing to say'), { status: 400 });
  const lang = languageOf(words);
  const name = (await pickVoices())[lang]?.[gender];
  const hash = crypto.createHash('sha256').update(`${lang}|${name}|${gender}|${words}`).digest('hex');
  prune();
  const cached = byText.get(hash);
  if (cached && clips.has(cached)) {
    clips.get(cached).expires = Date.now() + CLIP_TTL;
    return cached;
  }

  const body = await call('/text:synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: words },
      voice: name ? { languageCode: lang, name } : { languageCode: lang, ssmlGender: gender.toUpperCase() },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1.02 },
    }),
  });
  const id = crypto.randomBytes(16).toString('hex');
  clips.set(id, { audio: Buffer.from(body.audioContent, 'base64'), expires: Date.now() + CLIP_TTL });
  byText.set(hash, id);
  return id;
}

export function clip(id) {
  const found = clips.get(id);
  return found && found.expires > Date.now() ? found.audio : null;
}
