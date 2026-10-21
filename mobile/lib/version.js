import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Which version of the app this is, what changed in it, and whether to show
// "What's new" once after an update. Add a new entry at the top of RELEASES
// with every store release (and bump "version" in app.json to match).

export const RELEASES = [
  {
    version: '1.2.0',
    title: 'Festivals, cooking and groups',
    items: [
      { icon: 'home', text: 'A cleaner Home: cook at home, order online or go out, in one tap.' },
      { icon: 'chat', text: 'No set-up: Chatora just asks veg or non-veg and your budget when it needs to.' },
      { icon: 'spark', text: 'Festival specials: what people eat for each festival. Tap a dish to see restaurants near you.' },
      { icon: 'pot', text: 'Cooking mode: Chatora reads each step aloud (switch it off any time), then snap your dish for My Kitchen and earn achievements.' },
      { icon: 'people', text: 'Order for a Group: friends, family or office, veg and non-veg, within a budget each.' },
      { icon: 'camera', text: 'Snap Your Order: snap where you are, say veg or non-veg, and get dishes that fit.' },
      { icon: 'phoneCall', text: 'Zomato and Swiggy open the restaurant itself, and you can call the restaurant in one tap.' },
    ],
  },
  {
    version: '1.1.0',
    title: 'Talk, go out, snap and listen',
    items: [
      { icon: 'headset', text: 'Talk to Chatora: a voice chat with a male or female chef who answers out loud.' },
      { icon: 'pin', text: 'Go out: cafés, dinner, live music, a date or a long drive, with drive time right now.' },
      { icon: 'camera', text: 'Snap where you are, and Chatora suggests food and places that fit.' },
      { icon: 'music', text: 'Snap your food, or tap "Song for this meal?", for 3–4 songs in Hindi, English or both.' },
      { icon: 'cloud', text: 'Picks follow the weather: chai and pakoda when it rains, something cool when it’s hot.' },
      { icon: 'spark', text: 'Missing an ingredient? Ask Chatora for a swap.' },
    ],
  },
];

export function appVersion() {
  const version = (Platform.OS === 'web' ? null : Application.nativeApplicationVersion) ?? Constants.expoConfig?.version ?? '1.0.0';
  const build = Platform.OS === 'web' ? null : Application.nativeBuildVersion;
  // Running an over-the-air update: show its date so support can tell versions apart.
  const update = !Updates.isEmbeddedLaunch && Updates.createdAt ? Updates.createdAt.toISOString().slice(0, 10) : null;
  return { version, build, update };
}

// "1.1.0 (12) · update 2026-10-21"
export function versionLabel() {
  const { version, build, update } = appVersion();
  return [build ? `${version} (${build})` : version, update && `update ${update}`].filter(Boolean).join(' · ');
}

const KEY = 'kk-seen-version';
const read = async () => {
  try {
    return Platform.OS === 'web' ? window.localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
};
const write = async (v) => {
  try {
    if (Platform.OS === 'web') window.localStorage.setItem(KEY, v);
    else await SecureStore.setItemAsync(KEY, v);
  } catch {}
};

// True once after an update that has release notes. A fresh install just
// records the version (it has the welcome tips instead).
export async function shouldShowWhatsNew({ isNewUser = false } = {}) {
  const latest = RELEASES[0]?.version;
  if (!latest) return false;
  const seen = await read();
  if (seen === latest) return false;
  await write(latest);
  return !isNewUser;
}
