import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

// First-time tips: each one shows once on this phone, until dismissed.
const KEY = 'kk-tips-seen';

async function read() {
  try {
    const raw = Platform.OS === 'web' ? window.localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function write(ids) {
  try {
    const raw = JSON.stringify(ids);
    if (Platform.OS === 'web') window.localStorage.setItem(KEY, raw);
    else await SecureStore.setItemAsync(KEY, raw);
  } catch {}
}

export const useTips = create((set, get) => ({
  seen: null, // null until loaded, so a tip never flashes for someone who has seen it

  async load() {
    if (get().seen) return;
    set({ seen: await read() });
  },

  dismiss(id) {
    const seen = [...new Set([...(get().seen ?? []), id])];
    set({ seen });
    write(seen);
  },

  // Profile → "Show tips again".
  reset() {
    set({ seen: [] });
    write([]);
  },
}));

// true when the tip should show now.
export function useTip(id) {
  const seen = useTips((s) => s.seen);
  if (!seen) {
    useTips.getState().load();
    return false;
  }
  return !seen.includes(id);
}
