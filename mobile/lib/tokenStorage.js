import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'kyakhaun.session';

// SecureStore has no browser implementation, so the web preview keeps the
// session in localStorage instead — otherwise every page reload signs you out.
const webStore = {
  getItemAsync: async (key) => window.localStorage.getItem(key),
  setItemAsync: async (key, value) => window.localStorage.setItem(key, value),
  deleteItemAsync: async (key) => window.localStorage.removeItem(key),
};
const store = Platform.OS === 'web' ? webStore : SecureStore;

// Storage can fail on a device (e.g. locked keychain). Sign-in then just doesn't persist.
export async function readSession() {
  try {
    const raw = await store.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveSession({ accessToken, refreshToken }) {
  try {
    await store.setItemAsync(KEY, JSON.stringify({ accessToken, refreshToken }));
  } catch {}
}

export async function clearSession() {
  try {
    await store.deleteItemAsync(KEY);
  } catch {}
}
