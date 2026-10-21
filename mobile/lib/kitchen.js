import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

// "My Kitchen": the dishes someone has cooked with Kya Khaun, with their photos
// and achievements. Everything stays on this phone (never uploaded): photos
// are copied into the app's own folder, and the list is a small JSON file.
// The web preview keeps it in localStorage instead.
//
// A dish: { id, recipeId, name, cuisine, at (ISO time), photo (file uri / data url or null) }

const web = Platform.OS === 'web';
const WEB_KEY = 'kk-kitchen';
const VOICE_KEY = 'kk-cook-voice';

// expo-file-system is native only, so load it lazily (the web build skips it).
function files() {
  const { Directory, File, Paths } = require('expo-file-system');
  const dir = new Directory(Paths.document, 'kitchen');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return { Directory, File, dir, index: new File(dir, 'index.json') };
}

async function readAll() {
  try {
    if (web) return JSON.parse(window.localStorage.getItem(WEB_KEY) ?? '[]');
    const { index } = files();
    return index.exists ? JSON.parse(await index.text()) : [];
  } catch {
    return [];
  }
}

function writeAll(dishes) {
  if (web) {
    try {
      window.localStorage.setItem(WEB_KEY, JSON.stringify(dishes));
    } catch {
      // Full (photos are big in the preview): keep the list, drop the oldest photos.
      window.localStorage.setItem(WEB_KEY, JSON.stringify(dishes.map((d, i) => (i < dishes.length - 3 ? { ...d, photo: null } : d))));
    }
    return;
  }
  const { index } = files();
  if (!index.exists) index.create();
  index.write(JSON.stringify(dishes));
}

// Keep a copy of the photo in the app's folder (the picker's copy can be cleared).
async function keepPhoto(photo, id) {
  if (!photo) return null;
  if (web) return photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
  const { File, dir } = files();
  const target = new File(dir, `${id}.jpg`);
  await new File(photo.uri).copy(target);
  return target.uri;
}

// ---------- achievements ----------

const dayKey = (iso) => iso.slice(0, 10);
function longestStreak(dishes) {
  const days = [...new Set(dishes.map((d) => dayKey(d.at)))].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of days) {
    const next = prev && new Date(day) - new Date(prev) === 864e5;
    run = next ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}
const hourOf = (iso) => new Date(iso).getHours();

export const ACHIEVEMENTS = [
  { id: 'first', icon: 'star', title: 'First dish', text: 'You cooked your first dish', test: (d) => d.length >= 1 },
  { id: 'three', icon: 'flame', title: 'Getting good', text: '3 dishes cooked', test: (d) => d.length >= 3 },
  { id: 'five', icon: 'pot', title: 'Home chef', text: '5 dishes cooked', test: (d) => d.length >= 5 },
  { id: 'ten', icon: 'spark', title: 'Kitchen star', text: '10 dishes cooked', test: (d) => d.length >= 10 },
  { id: 'streak', icon: 'calendar', title: 'On a roll', text: 'Cooked 3 days in a row', test: (d) => longestStreak(d) >= 3 },
  { id: 'explorer', icon: 'bowl', title: 'Explorer', text: 'Cooked 3 different cuisines', test: (d) => new Set(d.map((x) => x.cuisine).filter(Boolean)).size >= 3 },
  { id: 'photos', icon: 'camera', title: 'Food photographer', text: 'Took photos of 5 dishes', test: (d) => d.filter((x) => x.photo).length >= 5 },
  { id: 'early', icon: 'sun', title: 'Early bird', text: 'Cooked before 9 in the morning', test: (d) => d.some((x) => hourOf(x.at) < 9 && hourOf(x.at) >= 4) },
  { id: 'night', icon: 'moon', title: 'Midnight chef', text: 'Cooked after 10 at night', test: (d) => d.some((x) => hourOf(x.at) >= 22 || hourOf(x.at) < 4) },
];

export const earned = (dishes) => ACHIEVEMENTS.filter((a) => a.test(dishes));

// ---------- store ----------

export const useKitchen = create((set, get) => ({
  dishes: null, // null until loaded
  async load() {
    if (get().dishes) return get().dishes;
    const dishes = await readAll();
    set({ dishes });
    return dishes;
  },
  // Saves a cooked dish (photo optional). Returns the achievements it just unlocked.
  async addDish(recipe, photo) {
    const before = await get().load();
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const dish = { id, recipeId: recipe.id, name: recipe.name, cuisine: recipe.cuisine ?? null, at: new Date().toISOString(), photo: await keepPhoto(photo, id) };
    const dishes = [dish, ...before];
    writeAll(dishes);
    set({ dishes });
    const had = new Set(earned(before).map((a) => a.id));
    return { dish, unlocked: earned(dishes).filter((a) => !had.has(a.id)) };
  },
  async removeDish(id) {
    const dishes = (await get().load()).filter((d) => d.id !== id);
    writeAll(dishes);
    set({ dishes });
    if (!web) {
      try {
        const { File, dir } = files();
        const photo = new File(dir, `${id}.jpg`);
        if (photo.exists) photo.delete();
      } catch {}
    }
  },
}));

// Whether Chatora reads the cooking steps aloud (on unless turned off).
export async function readCookVoice() {
  try {
    const raw = web ? window.localStorage.getItem(VOICE_KEY) : await SecureStore.getItemAsync(VOICE_KEY);
    return raw !== 'off';
  } catch {
    return true;
  }
}

export async function saveCookVoice(on) {
  try {
    if (web) window.localStorage.setItem(VOICE_KEY, on ? 'on' : 'off');
    else await SecureStore.setItemAsync(VOICE_KEY, on ? 'on' : 'off');
  } catch {}
}
